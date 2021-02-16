// checks if user is logged on 
// ...aka JWT is supplied and valid

const { JWT, wsErrorHandler, DB } = require('../utils')


module.exports = async (Socket, next)=>{
	try {

		// get bearer token
		if(Socket.handshake.auth.token){
			let token = Socket.handshake.auth.token

			// token must be valid
			if(token.length > 0){
				// register vars from token
				Socket.$.jwt = JWT.decrypt(token)

				// check if user exists in database
				let result = await DB.q(`
					SELECT id FROM g_users WHERE id = ?
				`, [ Socket.$.jwt.user ]);

				if(result.length > 0)
					return next()

			}
		}

		//Socket.emit('error_channel', {message: 'Invalid token.'})
		next(new Error("Invalid token"))
	} catch(e) {
		next(new Error("Invalid token"))
		// Socket.emit('error_channel', {message: 'Invalid token.'})
	}
}