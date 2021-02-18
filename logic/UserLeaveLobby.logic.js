/*
*	handles the logic in case a user is unlinked from a lobby

	asks user to whether to delete his messages or not amid leaving

	if only one user remains in the lobby amid deletion, delete the lobby and messages entirely
*/

const { DB } = require('../utils')
const { NOEXJR } = require('../exceptions')

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
		// get all users of lobby
		//users = await this.getUsersOfLobby()

		// delete messages if provided
		// emit this event to all users of lobby
		if(this.withMessages) await this.deleteMessagesOfUserFromLobby()
		

		// detach user from lobby
		await this.detachUserFromLobby()

		// if lobby has less than 2 users attached, remove it
		// emit event to affected user
		if( await this.countUsersInLobby() < 2) {
			await this.removeLobbyEntirely()

			for (let [id, Socket] of this.Websocket.of('/lobby/'+this.lobby).sockets) {
				Socket.emit('deletedLobby', { lobby_id: this.lobby })
				Socket.disconnect(false)		
			}
		}

		// otherwise proceed to emmiting the expected events
		else  await this.pushSocketEvents(  )

		// we're done
		throw new NOEXJR(null, 204)
	}

	/*
	*	user -> the user ID
	*	lobby -> the lobby ID
		withMessages -> boolean
	*/
	constructor(user, lobby, withMessages, Websocket){
		this.user = user
		this.lobby = lobby
		this.withMessages = withMessages
		this.Websocket = Websocket
	}

	/*
	*	pushes socket events to all 
	*/
	async pushSocketEvents(){
		// if user deleted its messages 
		if(this.withMessages)
			for (let [id, Socket] of this.Websocket.of('/lobby/'+this.lobby).sockets)
				Socket.emit('deletedAllMessagesFromLobbyOfUser', {
					user_id: this.user,
					lobby_id: this.lobby,
				})

		// about user leaving lobby
		for (let [id, Socket] of this.Websocket.of('/lobby/'+this.lobby).sockets)
			Socket.emit('userLeftLobby', { user_id: this.user })

		// close socket connection with the unlinked user
		for (let [id, Socket] of this.Websocket.of('/lobby/'+this.lobby).sockets)
			if(Socket.$.jwt.user === this.user ) {
				Socket.disconnect(false)
				break;
			}
	}

	/*
	*	retrieves all users of lobby
	*/
	async getUsersOfLobby()
	{
		return (await DB.q(`
				SELECT user_id
				FROM c_user_lobby
				WHERE lobby_id = ?;
			`, [ this.lobby ]) ).map(item=>item.id)
	}

	/*
	*	delete all messages of user from lobby
	*/
	async deleteMessagesOfUserFromLobby()
	{
		await DB.q(`
			DELETE FROM c_messages
			WHERE created_by = ?
				AND lobby_id = ? ;
		`, [
			this.user,
			this.lobby,
		])
	}

	/*
	*	detach user from lobby
	*/
	async detachUserFromLobby()
	{
		await DB.q(`
			DELETE FROM c_user_lobby
			WHERE user_id = ?
				AND lobby_id = ? ;
		`, [
			this.user,
			this.lobby,
		])
	}

	/*
	*	count the number of users in lobby
	*/
	async countUsersInLobby()
	{
		return (await DB.q(`
			SELECT COUNT(*)
			FROM c_user_lobby
			WHERE lobby_id = ? ;
		`, [ this.lobby ])) [0]['COUNT(*)']
	}

	/*
	*	remove lobby entirely
	*/
	async removeLobbyEntirely()
	{
		await DB.q(`
			DELETE FROM c_lobbies
			WHERE id = ?;

			DELETE FROM c_user_lobby
			WHERE lobby_id = ?;

			DELETE FROM c_messages
			WHERE lobby_id = ?;
		`, new Array(3).fill(this.lobby))
	}
}