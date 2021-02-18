// one user wants to make a lobby with other users
// this file is about it!

const { AddFriendsSchema } = require('../schemas')
const { DB } = require('../utils')
const { 
	UnprocessableEntityException ,
	NoExceptionJustReturn, NOEJR,

} = require('../exceptions')


/*
*	main thread
*/
module.exports = class {

	/*
	*	the init function
		actually more important than the constructor
		instantiates the new object and starts the logic thread
	*/
	static async init(...params){

		const Obj = new this (...params);
		await Obj.initLogic()
	}

	/*
	*	the object logic thread
	*/
	async initLogic()
	{
		// validates users
		await this.validateOmegaUsers()

		// if no new user was supplied means it creates a lobby with itself
		if( this.omegaUsers.length === 0)
			await this.makeLobbyWithMyself()

		// if only one new user was supplied means user <-> user lobby
		else if (this.omegaUsers.length === 1)
			await this.makeLobbyUserToUser()

		// if >1 new user was supplied means user <-> users lobby
		else if (this.omegaUsers.length > 2)
			await this.makeLobbyUserToUsers()
	}

	/*
	*	alfaUser -> the user which creates lobby
	*	omegaUser -> the users which will be assigned to lobby
		Websocket -> the websocket server instance
	*/
	constructor(alfaUser, omegaUsers, Websocket){
		this.alfaUser = alfaUser
		this.omegaUsers = omegaUsers
		this.Websocket = Websocket
	}

	/*
	*	validates the input data
		in this case, the users data

		returns the valid user IDs
	*/
	async validateOmegaUsers()
	{
		// we can reuse this schema
		//  we require users:[int,int,int, ...]
		let results = AddFriendsSchema.validate({ users: this.omegaUsers })
		if(results.error)
			throw new UnprocessableEntityException(results.error)
		let ids = results.value.users

		// we make sure all provided users exist in database
		this.omegaUsers = (await DB.q(`
					SELECT id
					FROM g_users
					WHERE id IN (${ new Array(this.omegaUsers.length)
									.fill('?')
									.join(',') });
				`, ids)).map(item=>item.id)

		// strip myself
		this.omegaUsers.forEach((item, index)=>{
			if(item === this.alfaUser) this.omegaUsers.splice(index, 1)
		})
	}

	/*
	*	makes lobby with myself
	*/
	async makeLobbyWithMyself(){
		throw new UnprocessableEntityException( 'Users do not exist.' )
	}

	/*
	*	creates a lobby for a user <-> user conversation
	*/
	async makeLobbyUserToUser(){
		// check if there is a lobby containing the two users
		let PotentialLobby = await this.getPotentialLobbyOfTwoUsers()

		// if yes, just return it
		if(PotentialLobby) throw new NOEJR(PotentialLobby, 200)

		// if not we create lobby
		// assign the me + the x users 
		// then return it
		else {
			// create lobby
			let Lobby = await this.createNewLobby()

			// assign
			let result = await this.assignUsersToLobby(Lobby.id)

			// push socket notif to the added user
			for (let [id, Socket] of this.Websocket.of('/lobby').sockets)
				if( Socket.$.jwt.user === this.omegaUsers[0]) {
					Socket.emit('userAddedToLobby', {
						user_id: this.omegaUsers[0],
						lobby: Lobby,
					})
					break;
				}

			// return lobby
			throw new NoExceptionJustReturn( Lobby, 201 )

		}

	}

	/*
	*	creates a lobby for a user <-> users conversation
	*/
	async makeLobbyUserToUsers()
	{
		// create lobby
		let Lobby = await this.createNewLobby(true)

		// assign users
		let result = await this.assignUsersToLobby(Lobby.id)

		// push notification to users
		for (let [id, Socket] of this.Websocket.of('/lobby').sockets)
			if( this.omegaUsers.includes( Socket.$.jwt.user ) ) 
				Socket.emit('userAddedToLobby', {
					user_id: Socket.$.jwt.user,
					lobby: Lobby,
				})
		// then return it
		throw new NOEJR(Lobby, 201)
	}

	/*
	*	retrieves a potential lobby containing two users
	*/
	async getPotentialLobbyOfTwoUsers(){
		let result = await DB.q(`
			SELECT c_lobbies.*
			FROM c_lobbies

			WHERE c_lobbies.is_group = false
				AND (
					SELECT COUNT(*)
					FROM c_user_lobby
					WHERE c_user_lobby.lobby_id = c_lobbies.id
						AND c_user_lobby.user_id IN (?, ?)
				) = 2;
		`, [ this.alfaUser, this.omegaUsers[0] ])

		return result.length > 0 ? result[0] : false;
	}

	/*
	*	creates a new lobby and returns it
	*/
	async createNewLobby(is_group=false){
		return (await DB.q(`
			INSERT INTO c_lobbies(created_by, is_group)
			VALUES(?, ?);

			SELECT *
			FROM c_lobbies
			WHERE id = LAST_INSERT_ID();
		`, [ this.alfaUser, is_group ])) [1][0]
	}

	/*
	*	assigns alfa & omega users to a custom lobby
	*/
	async assignUsersToLobby(lobby_id){
		return await DB.q(`
				INSERT INTO c_user_lobby(user_id, lobby_id)
				SELECT id, ?
				FROM g_users
				WHERE id IN ( ${ new Array(this.omegaUsers.length+1)
										.fill('?')
										.join(',') } );
			`, 
			[lobby_id, this.alfaUser].concat(this.omegaUsers)
		);
	}
}