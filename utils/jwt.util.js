// handles JWT operations
const JWT = require('jsonwebtoken')

module.exports = {
	encrypt(data){
		return JWT.sign(data, 
				process.env.JWT_SECRET, 
				{
					expiresIn: '1d',
				})
	},


	decrypt(data){
		return JWT.verify(data, process.env.JWT_SECRET)
	}
}