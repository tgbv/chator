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

	SELECT pivot.user_id, pivot.created_at, users.id, users.username
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
users = ['john', 'doe', "becky"]
			// proceed to adding users
			console.log(
				await DB.q(`
	
	SELECT id
	FROM g_users
	WHERE g_users.username IN (${ users.fill(0, users.length, '?').join(',') });
				`,  users)
			)


		} catch(e) {
			return errorhandler(e, res)
		}
	}

}