// handles exceptions in general
const Fs = require('fs')
const errorHandlerBase  = require('./errorHandlerBase.util')

module.exports = (ex, res = null)=>{
	// handle error
	errorHandlerBase(ex)

	// helps handling ws errors
	if(res)
		res.status(500).send({
			message: "Server error occurred.",
		})
}