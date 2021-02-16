// checks if user is logged on 
// ...aka JWT is supplied and valid

const { JWT, DB } = require('../utils')

module.exports = async (req, res, next)=>{
	try {

		// get bearer token
		if(req.headers.authorization){
			let token = req.headers.authorization.split(" ")

			// token must be valid
			if(token.length > 1){
				token = token[1]

				// register vars from token
				req.$.jwt = JWT.decrypt(token)

				// check if user exists in database
				let result = await DB.q(`
					SELECT id FROM g_users WHERE id = ?
				`, [ req.$.jwt.user ]);

				if(result.length > 0)
					return next()
			}
		}

		return res.status(403).send({
			message: 'Invalid token.'
		})
	} catch(e) {
		return res.status(403).send({
			message: 'Invalid token.'
		})
	}

}