// this is not an actual exception
// it's a signal which controller will catch and output the data - res.send(data)

module.exports = class NoExceptionJustReturn extends Error {
	constructor(message="", code=520, ...params){
		super(...params)

	    // Maintains proper stack trace for where our error was thrown (only available on V8)
	    if (Error.captureStackTrace) {
	      Error.captureStackTrace(this, NoExceptionJustReturn)
	    }

	    this.message=message
	    this.code=code
	}
	
	handle(res){
		res.status(this.code).send(this.message)
	}
}