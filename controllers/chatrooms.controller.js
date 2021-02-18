// handles user's chatrooms (lobbies)

const { errorhandler, DB,
		validateMessage } = require('../utils')

const { AddFriendsSchema } = require('../schemas')

const { UserMakesLobbyWithUsersLogic,
		UserLeaveLobbyLogic } = require('../logic')

const {NOEJR} = require('../exceptions')


module.exports = {

	/*
	*	retireves user's chatrooms (aka lobbies)
	*/
	async getChatrooms(req, res, next){
		try {
			res.send(
				await DB.q(`

		SELECT c_lobbies.*
		FROM c_lobbies

		INNER JOIN c_user_lobby 
			ON c_user_lobby.lobby_id = c_lobbies.id
			AND c_user_lobby.user_id = ?;

				`, [req.$.jwt.user])
			);
		} catch(e) {
			return errorhandler(e, res)
		}
	},

	/*
	*	create lobby with users 
	*/
	async makeLobbyWithUsers(req, res, next){
		try {
			await UserMakesLobbyWithUsersLogic.init(
				req.$.jwt.user,
				req.body.users,
				req.$.WS,
			)
		} catch(e) {
			//console.log(e)
			return errorhandler(e, res)
		}
	},

	/*
	*	get users of lobby
	*/
	async getUsersOfLobby(req, res ,next){
		try {
			// get users of lobby
			res.send(
				await DB.q(`

		SELECT g_users.id, 
				g_users.username, 
				c_user_lobby.created_at AS joined_on
		FROM g_users

		INNER JOIN c_user_lobby
			ON c_user_lobby.user_id = g_users.id
			AND c_user_lobby.user_id != ?
			AND c_user_lobby.lobby_id = ?

		GROUP BY g_users.id;


				`, [ req.$.jwt.user,
					req.params.lobby_id ]
				)
			)

		} catch(e) {
			return errorhandler(e, res);
		}
	},

	/*
	*	retrieve lobby's messages 
	*/
	async getLobbyMessages(req, res, next){
		try {
			// Get the messages
			// Sorting is done by message ID, descending
			// limit by req.params.page, 20 messages/chunk
			let chunk = 20

			res.send( 
				await DB.q(`

		SELECT c_messages.*
		FROM c_messages

		INNER JOIN c_user_lobby 
			ON c_user_lobby.lobby_id = c_messages.lobby_id
			AND c_messages.lobby_id = ?

		ORDER BY c_messages.id DESC
		LIMIT ?
		OFFSET ?  ;

				`, [
					req.params.lobby_id,
					chunk,
					req.params.page*chunk-chunk
				])
			)
		} catch(e) {
			return errorhandler(e, res)
		}
	},

	/*
	*	sends a message to a lobby

		strictly speaking this will not be used as messages will come via websocket
		but it's better to have the concept drawn here before actually digging into ws programming

		this method DOES NOT emit Socket events
	*/
	async sendLobbyMessage(req, res, next){
		try {
			// first we validate the message type
			// then we validate the message
			// something more complex than JOI is required
			// a helper has been created in this case
			let verdict = validateMessage(req.body.message)
			if( verdict !== true)
				return res.status(422).send(verdict)

			// proceed to insert the message into database
			// returns the id of the message
			let message = await DB.q(`

		INSERT INTO c_messages(lobby_id, created_by, content, type)
		SELECT ?, ?, ?, ? ;

		SELECT LAST_INSERT_ID();

			`, [
				req.params.lobby_id, req.$.jwt.user, req.body.message.content, req.body.message.type,
				req.$.jwt.user, req.params.lobby_id
			])

			// technically we're done.
			res.status(204).send()
		} catch(e) {
			return errorhandler(e, res)
		}
	},

	/*
	*	leaves lobby

		asks user to whether to delete his messages or not amid leaving

		if only one user remains in the lobby amid deletion, 
		delete the lobby and messages entirely
	*/
	async leaveLobby(req, res, next){
		try {
			await UserLeaveLobbyLogic.init(
				req.$.jwt.user,
				parseInt(req.params.lobby_id),
				req.body.withMessages,
				req.$.WS
			)
		}catch(e){
			return errorhandler(e, res)
		}
	},


	/*
	*	add more users to a lobby

		currently you don't need to own the lobby (be it's creator) to add others
		this may evolve soon into a more complex form
	*/
	async addUsersToLobby(req, res, next){
		try {
			// validate input
			let input = AddFriendsSchema.validate(req.body)	
			if(input.error)
				return res.status(422).send(input.error)
			let users = req.body.users

			// proceed to adding users
			// add them only if they're not added already
			// also set the status of the lobby to "group"
			let result = await DB.q(`
				SELECT CURRENT_TIMESTAMP() INTO @tmp;

				INSERT INTO c_user_lobby(user_id, lobby_id)
				SELECT g_users.id, ?
				FROM g_users
				WHERE g_users.id IN (${ new Array(users.length).fill('?').join(',') })
					AND NOT EXISTS (
						SELECT c_user_lobby.user_id
						FROM c_user_lobby
							WHERE c_user_lobby.user_id = g_users.id
							AND c_user_lobby.lobby_id = ?
						LIMIT 1
					) ;

				UPDATE c_lobbies
				SET is_group = true
				WHERE c_lobbies.id = ? ;

				SELECT user_id
				FROM c_user_lobby
					WHERE c_user_lobby.lobby_id = ? 
					AND c_user_lobby.created_at >= @tmp;

				SELECT user_id
				FROM c_user_lobby
					WHERE c_user_lobby.lobby_id = ? ;
			`, [req.params.lobby_id]
				.concat(users)
				.concat([
					req.params.lobby_id,
					req.params.lobby_id,
					req.params.lobby_id,
					req.params.lobby_id,
				])
			)

			// notify users of their new lobby
			// iterate all connected users of "^/lobby$ namespace then push them this notif

			// push ONLY if users have been added
			if(result[3].length > 0)
			{
				// select lobby first
				let lobby = await DB.q(`
					SELECT *
					FROM c_lobbies
					WHERE id = ?;
				`, [
					req.params.lobby_id
				])

				// push notification to users OF lobby
				for (let [id, Socket] of req.$.WS.of('/lobby/'+req.params.lobby_id).sockets)
					if( result[4].map(item=>item.user_id).includes(Socket.$.jwt.user) )
						Socket.emit('usersAddedToLobby', {
							users: result[3].map(item=>item.user_id),
							lobby_id: lobby[0].id,
						})

				// push notification to ADDED users
				for (let [id, Socket] of req.$.WS.of('/lobby').sockets)
					if( result[3].map(item=>item.user_id).includes(Socket.$.jwt.user) )
						Socket.emit('userAddedToLobby', {
							user_id: Socket.$.jwt.user,
							lobby: lobby[0],
						})
			}

			// done. returns the added users
			res.send(result[3].map(item=>item.user_id))
		}catch(e){
			return errorhandler(e, res)
		}
	}


}