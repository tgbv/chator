// handles user's chatrooms (lobbies)

const { errorhandler, DB,
		validateMessage } = require('../utils')

const { AddFriendsSchema } = require('../schemas')
//const { LobbiesSocket } = require('../websocket')

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

			// we can reuse this schema
			//  we require users:[int,int,int, ...]
			let results = AddFriendsSchema.validate(req.body)
			if(results.error)
				return res.status(422).send(results.error)
			let users = results.value.users

			// we make sure all provided users exist in database
			users = (await DB.q(`
						SELECT id
						FROM g_users
						WHERE id IN (${ new Array(users.length).fill('?').join(',') });
					`, users)).map(item=>item.id)

			// strip myself
			users.forEach((item, index)=>{
				if(item === req.$.jwt.user) users.splice(index, 1)
			})

			// if users.length === 0, then no valid user was supplied, no lobby for ya bro!
			if(users.length === 0)
				res.status(422).send({
					message: 'Users do not exist.'
				})

			// if users.length === 1 it's a me to user conversation
			// we create the lobby!
			else if(users.length === 1)
			{
				// check if there is a lobby containing the two users
				let PotentialLobby = await DB.q(`
					SELECT c_lobbies.*
					FROM c_lobbies

					WHERE c_lobbies.is_group = true
						AND (
							SELECT COUNT(*)
							FROM c_user_lobby
							WHERE c_user_lobby.lobby_id = c_lobbies.id
								AND c_user_lobby.user_id IN (?, ?)
						) = 2;
				`, [req.$.jwt.user, users[0]])

				// if yes, just return it
				if(PotentialLobby.length === 1)
					res.send(PotentialLobby[0])

				// if not we create lobby
				// assign the me + the x users 
				// then return it
				else {
					// assign
					let result = await DB.q(`
						INSERT INTO c_lobbies(created_by, is_group)
						VALUES(?, true);

						INSERT INTO c_user_lobby(user_id, lobby_id)
						VALUES (?, LAST_INSERT_ID()), (?, LAST_INSERT_ID());

						SELECT *
						FROM c_lobbies
						WHERE id = LAST_INSERT_ID();
					`, [
						req.$.jwt.user,
						req.$.jwt.user, users[0]
					]) //[2][0];

					// push socket notif to user
					for (let [id, Socket] of req.$.WS.of('/lobby').sockets)
						if( Socket.$.jwt.user === users[0]) {
							Socket.emit('userAddedToLobby', {
								user_id: users[0],
								lobby_id: result[2][0],
							})
							break;
						}

					// return lobby ID
					res.send(result[2][0])
				}
			}

			// if users.length > 1 it's a group conversation
			else
			{
				// create lobby
				// assign users
				// then return it
				let result = await DB.q(`
					INSERT INTO c_lobbies(created_by)
					VALUES(?) ;

					INSERT INTO c_user_lobby(user_id, lobby_id)
					SELECT g_users.id, LAST_INSERT_ID()
					FROM g_users
					WHERE g_users.id IN ( ${ new Array(users.length+1).fill('?').join(',') } );

					SELECT *
					FROM c_lobbies
					WHERE id = LAST_INSERT_ID();
				`, [ req.$.jwt.user,
					 req.$.jwt.user ]
					.concat(users)

				) //[2][0]

				// push notification to users
				for (let [id, Socket] of req.$.WS.of('/lobby').sockets)
					if( users.includes( Socket.$.jwt.user ) ) 
						Socket.emit('userAddedToLobby', {
							user_id: Socket.$.jwt.user,
							lobby_id: result[2][0],
						})

				// return
				res.status(201).send( result[2][0])
			}

		} catch(e) {
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
			// FIRST ! get all lobby users
			let users = (await DB.q(`
				SELECT user_id
				FROM c_user_lobby
				WHERE lobby_id = ?;
			`, [
				req.params.lobby_id
			])).map(item=>item.id)

			// then! deletes messages ONLY if body allows us to
			if( req.body.withMessages && req.body.withMessages === true){
				await DB.q(`

					DELETE FROM c_messages
					WHERE created_by = ?
						AND lobby_id = ? ;

				`, [
					req.$.jwt.user,
					req.params.lobby_id,
					req.$.jwt.user,
					req.params.lobby_id,
				]);	

				// push notification to users
				for (let [id, Socket] of req.$.WS.of('/lobby').sockets)
					if( users.includes( Socket.$.jwt.user ) ) 
						Socket.emit('deletedAllMessagesFromLobbyOfUser', {
							user_id: req.$.jwt.user,
							lobby_id: parseInt(req.params.lobby_id),
						})
			}


			// leaves lobby!
			await DB.q(`
				DELETE FROM c_user_lobby
				WHERE user_id = ?
					AND lobby_id = ? ;
			`, [
				req.$.jwt.user,
				req.params.lobby_id,
			])

			// push notification to users
			for (let [id, Socket] of req.$.WS.of('/lobby').sockets)
				if( users.includes( Socket.$.jwt.user ) ) 
					Socket.emit('userLeftLobby', {
						user_id: req.$.jwt.user,
						lobby_id: parseInt(req.params.lobby_id),
					})

			// check if lobby has only one user left
			let result = await DB.q(`
				SELECT COUNT(*)
				FROM c_user_lobby
				WHERE lobby_id = ? ;
			`, [
				req.params.lobby_id,
			])

			// if not, remove it, unlink all users, and remove all messages
			if(result[0]['COUNT(*)'] < 2)
			{
				await DB.q(`
					DELETE FROM c_lobbies
					WHERE id = ?;

					DELETE FROM c_user_lobby
					WHERE lobby_id = ?;

					DELETE FROM c_messages
					WHERE lobby_id = ?;
				`, [
					req.params.lobby_id,
					req.params.lobby_id,
					req.params.lobby_id
				])

				// push notification to users
				for (let [id, Socket] of req.$.WS.of('/lobby').sockets)
					if( users.includes( Socket.$.jwt.user ) ) 
						Socket.emit('deletedLobby', {
							lobby_id: parseInt(req.params.lobby_id),
						})

			}

			// technically, DONE!
			res.status(204).send()
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
			`, [req.$.lobby_id]
				.concat(users)
				.concat([
					req.$.lobby_id,
					req.$.lobby_id,
					req.$.lobby_id,
				])
			)

			// notify users of their new lobby
			// iterate all connected users of "^/lobby$ namespace then push them this notif

			// push ONLY if users have been added
			if(result[3].length > 0)
				for (let [id, Socket] of req.$.WS.of('/lobby').sockets)
					if( users.includes( Socket.$.jwt.user ) ) 
						Socket.emit('userAddedToLobby', {
							user_id: Socket.$.jwt.user,
							lobby_id: req.$.lobby_id,
						})

			// done. returns the added users
			res.send(result[3].map(item=>item.id))
		}catch(e){
			return errorhandler(e, res)
		}
	}


}