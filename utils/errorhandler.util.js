// handles exceptions in general
const Fs = require('fs')
const errorHandlerBase  = require('./errorHandlerBase.util')
const { NoExceptionJustReturn, UnprocessableEntityException }  = require('../exceptions')

module.exports = (ex, res = null)=>{

	// check exception type
	if(ex instanceof UnprocessableEntityException)
		ex.handle(res)
	else if(ex instanceof NoExceptionJustReturn)
		ex.handle(res)

	// generic server error handler
	else {
		// handle error
		errorHandlerBase(ex)

		// helps handling ws errors
		if(res)
			res.status(500).send({
				message: "Server error occurred.",
			})	
	}

}