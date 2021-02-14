// handles user's chatrooms (lobbies)

const { errorhandler, DB,
		validateMessage } = require('../utils')

const { AddFriendsSchema } = require('../schemas')

module.exports = {

	/*
	*	retireves user's chatrooms
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

				`, [req._.jwt.user])
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

			// we create the lobby!
			// if users.length === 1 it's a me to user conversation
			if(users.length === 1)
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
				`, [req._.jwt.user, users[0]])

				// if yes, just return it
				if(PotentialLobby.length === 1)
					res.send(PotentialLobby[0])

				// if not we create lobby
				// assign the me + the x users 
				// then return it
				else 
					res.send(
						(await DB.q(`

							INSERT INTO c_lobbies(created_by, is_group)
							VALUES(?, true);

							INSERT INTO c_user_lobby(user_id, lobby_id)
							VALUES (?, LAST_INSERT_ID()), (?, LAST_INSERT_ID());

							SELECT *
							FROM c_lobbies
							WHERE id = LAST_INSERT_ID();

						`, [
							req._.jwt.user,
							req._.jwt.user, users[0]
						])) [2][0]
					)
			}

			// if users.length > 1 it's a group conversation
			else 
			{
				// create lobby
				// assign users
				// then return it
				res.send(
					(await DB.q(`
						INSERT INTO c_lobbies(created_by)
						VALUES(?);

						INSERT INTO c_user_lobby(user_id, lobby_id)
						SELECT g_users.id, LAST_INSERT_ID()
						FROM g_users
						WHERE g_users.id IN ( ?, ${ new Array(users.length).fill('?').join(',') } );

						SELECT *
						FROM c_lobbies
						WHERE id = LAST_INSERT_ID();
					`, [ req._.jwt.user,
						 req._.jwt.user ].concat(users)

					))[2][0]
				)

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
			// ..while making sure the lobby is mine
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
			AND EXISTS (
				SELECT c_user_lobby.user_id
				FROM c_user_lobby
				WHERE c_user_lobby.user_id = ?
					AND c_user_lobby.lobby_id = ?
				LIMIT 1
			)

		GROUP BY g_users.id;


				`, [ req._.jwt.user,
					req.params.lobby_id,
					req._.jwt.user, 
					req.params.lobby_id, ]
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
			// while making sure I'm a member of the lobby

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
			AND EXISTS (
				SELECT user_id
				FROM c_user_lobby
				WHERE lobby_id = ? 
					AND user_id = ?
			)

		ORDER BY c_messages.id DESC
		LIMIT ?
		OFFSET ?  ;

				`, [
					req.params.lobby_id,
					req.params.lobby_id,
					req._.jwt.user,
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
			// a check to make sure I'm in the lobby is done as well
			// returns the id of the message
			let message = await DB.q(`

		INSERT INTO c_messages(lobby_id, created_by, content, type)

		SELECT ?, ?, ?, ?
		WHERE EXISTS (
			SELECT user_id
			FROM c_user_lobby
			WHERE c_user_lobby.user_id = ?
				AND c_user_lobby.lobby_id = ?
			LIMIT 1
		) ;

		SELECT LAST_INSERT_ID();

			`, [
				req.params.lobby_id, req._.jwt.user, req.body.message.content, req.body.message.type,
				req._.jwt.user, req.params.lobby_id
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
	*/
	async leaveLobby(req, res, next){
		try {
			// first! deletes messages only if body allows us to
			if( req.body.withMessages && req.body.withMessages === true)
				await DB.q(`

					DELETE FROM c_messages
					WHERE created_by = ?
						AND lobby_id = ? 
						AND EXISTS (
							SELECT user_id
							FROM c_user_lobby
							WHERE c_user_lobby.user_id = ?
								AND c_user_lobby.lobby_id = ?
							LIMIT 1
						) ;

				`, [
					req._.jwt.user,
					req.params.lobby_id,
					req._.jwt.user,
					req.params.lobby_id,
				]);

			// leaves lobby!
			await DB.q(`
				DELETE FROM c_user_lobby
				WHERE user_id = ?
					AND lobby_id = ? ;
			`, [
				req._.jwt.user,
				req.params.lobby_id,
			])

			// technically, DONE!
			res.status(204).send()
		}catch(e){
			return errorhandler(e, res)
		}
	},


}