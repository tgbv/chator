// checks if user is logged on 
// ...aka JWT is supplied and valid

const { JWT, errorhandler } = require('../utils')


module.exports = (Socket, next)=>{
	try {

		// get bearer token
		if(Socket.handshake.auth.token){
			let token = Socket.handshake.auth.token

			// token must be valid
			if(token.length > 0){
				// register vars from token
				Socket._.jwt = JWT.decrypt(token)

				return next()
			}
		}

		Socket.disconnect()
	} catch(e) {
		errorhandler(e)
		Socket.disconnect()
	}
}