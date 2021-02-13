// handles the friendlist
// user must be logged in to access this controller

const {DB, errorhandler} = require('../utils')
const {AddFriendsSchema} = require('../schemas')


module.exports = {

	/*
	*	retrieves the friends user already has
	*/
	async getFriends(req, res, next){
		try {

			res.send(
				await DB.q(`

	SELECT pivot.created_at, users.id, users.username
	FROM f_list as pivot

	RIGHT JOIN g_users as users
		ON pivot.friend_id = users.id

	WHERE pivot.user_id = ? ;

				`, [ req._.jwt.user ])
			)

		} catch(e) {
			return errorhandler(e, res)
		}
	},

	/*
	*	user adds other users as friends
	*/
	async addFriends(req, res, next){
		try {
			// validate request
			let result = AddFriendsSchema.validate(req.body)
			if(result.error)
				return res.status(422).send(result.error)
			let users = result.value.users

			// proceed to adding users
			await DB.q(`

	INSERT INTO f_list(user_id, friend_id)

	SELECT ?, g_users.id
	FROM g_users

	WHERE g_users.id IN (${ new Array(users.length).fill('?').join(',') })
		AND g_users.id != ? 
		AND ( 
			SELECT COUNT(*)
			FROM f_list
			WHERE f_list.user_id = ?
				AND f_list.friend_id = g_users.id
		) = 0 ;

			`,  [req._.jwt.user]
				.concat(users)
				.concat([req._.jwt.user, req._.jwt.user]) 
			)

			res.status(204).send()

		} catch(e) {
			return errorhandler(e, res)
		}
	},

	/*
	*	unlinks some friends
	*/
	async unlinkFriends(req, res, next){
		try {
			// validate request
			let result = AddFriendsSchema.validate(req.body)
			if(result.error)
				return res.status(422).send(result.error)
			let users = result.value.users

			// proceed to unlink
			await DB.q(`

	DELETE FROM f_list

	WHERE f_list.user_id = ?
		AND f_list.friend_id IN (
			SELECT id
			FROM g_users
			WHERE g_users.id IN (${ new Array(users.length).fill('?').join(',') })
		);

			`, [ req._.jwt.user ].concat(users)
			)

			// 
			res.status(204).send()

		} catch(e) {
			return errorhandler(e, res)
		}
	},

	

}