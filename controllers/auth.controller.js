const {UserRegistrationSchema} = require('../schemas')
const {UsersModel} = require('../models')
const {DB, errorhandler, JWT} = require('../utils')
const Argon2 = require('argon2')


module.exports = {

	/*
	*	 registers the user
	*/
	async register(req, res, next){
		try {
			// check username and password
			let result = UserRegistrationSchema.validate(req.body)
			if(result.error)
				return res.status(422).send(result.error)

			// check captcha
			// ...

			// check if username exists in database
			let Results = await DB.q("SELECT id FROM g_users WHERE username = ?;", 
											[req.body.username])
			if(Results.length > 0)
				res.status(422).send({
					message: "Username is already taken.",
				})


			else 
			{
				// register the user
				await DB.q("INSERT INTO g_users(username, password) VALUES(?, ?)",
							[req.body.username,  await Argon2.hash(req.body.password) ])

				res.status(204).send()
			}
		} catch(e) { errorhandler(e, res) }
	},

	/*
	*	logins the user
	*/
	async login(req, res, next){
		try {
			// check username and password
			let result = UserRegistrationSchema.validate(req.body)
			if(result.error)
				return res.status(422).send(result.error)

			// check captcha
			// ..

			// get user from db 
			let Results = await DB.q("SELECT id, password FROM g_users WHERE username = ?;",
							[req.body.username])
			if(Results.length > 0)
			{
				User = Results[0];

				// check password
				if(await Argon2.verify(User.password, req.body.password))
					res.send({
						token: JWT.encrypt({
							user: User.id
						})
					})
				else
					res.status(422).send({
						message: 'Password is incorrect!'
					})
			}
			else
				res.status(403).send({
					message: 'User not found.'
				})


		}catch(e){ errorhandler(e, res) }
	},


	/*
	*	 shows the registration form
	*/
	showRegistrationForm(req, res, next){
		res.send(req.session)
	}


}