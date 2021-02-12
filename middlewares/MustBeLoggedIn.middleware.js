// checks if user is logged on 
// ...aka JWT is supplied and valid

const { JWT } = require('../utils')

module.exports = (req, res, next)=>{
	try {

		// get bearer token
		if(req.headers.authorization){
			let token = req.headers.authorization.split(" ")

			// token must be valid
			if(token.length > 1){
				token = token[1]

				// register vars from token
				req._.jwt = JWT.decrypt(token)

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