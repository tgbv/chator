// checks if a user is part of a lobby

const {DB, errorHandler} = require('../utils')

module.exports = async (req, res, next)=>{
	try{
		// isolate lobby_id
		let lobby_id = req.params.lobby_id

		// select
		let result = await DB.q(`
			SELECT user_id
			FROM c_user_lobby
			WHERE user_id = ?
				AND lobby_id = ?
			LIMIT 1;
		`, [
			req.$.jwt.user,
			lobby_id
		])

		// return based on select
		if(result.length > 0)
			next()
		else
			return res.status(403).send({
				message: 'Not allowed in lobby.'
			})
	}catch(e){
		return errorHandler(e, res)
	}
}