// declares/defines variables used in req

module.exports = (WSServer)=>{

	return (req, res, next)=>{

		// $ means the variable is APP-related only (not object related)
		// it can holy any values we want
		req.$ = {
			WS: WSServer,
		}

		next()
	}

}