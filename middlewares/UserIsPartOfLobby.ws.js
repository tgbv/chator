// checks if a ws connected user is part of a lobby

const {DB, errorHandler} = require('../utils')

module.exports = async (Socket, next)=>{
	try{
		// isolate lobby_id
		let lobby_id = Socket.adapter.nsp.name.split("/")[2]

		// select
		let result = await DB.q(`
			SELECT user_id
			FROM c_user_lobby
			WHERE user_id = ?
				AND lobby_id = ?
			LIMIT 1;
		`, [
			Socket.$.jwt.user,
			lobby_id
		])

		Socket.$.lobby_id = lobby_id

		// return based on select
		next( result.length > 0 ? null : new Error("Not belonging to lobby: "+lobby_id))
	}catch(e){
		errorHandler(e)
		next(new Error("WS error occurred."))
	}
}