// declares/defines variables used in req

module.exports = (WSServer)=>{

	return (req, res, next)=>{
		req._ = {
			WS: WSServer,
		}

		next()
	}

}