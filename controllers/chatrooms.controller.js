// handles user's chatrooms (lobbies)

const { errorhandler, DB } = require('../utils')

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
			// if users.length === 1 it's a user <-> user conversation
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
				// assign the two users 
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
	}
}