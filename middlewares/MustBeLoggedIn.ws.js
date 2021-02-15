// checks if user is logged on 
// ...aka JWT is supplied and valid

const { JWT, wsErrorHandler } = require('../utils')


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

		//Socket.emit('error_channel', {message: 'Invalid token.'})
		next(new Error("Invalid token"))
	} catch(e) {
		next(new Error("Invalid token"))
		// Socket.emit('error_channel', {message: 'Invalid token.'})
	}
}