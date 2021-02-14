// handles exceptions in general
const Fs = require('fs')

module.exports = (ex, res = null)=>{
	//
	if(process.env.ENV === 'dev')
		console.log(ex)
	else
		Fs.writeFileSync(`${__dirname}/errorlog.txt`, new Date() +
						"\r\n---------------------\r\n"
						+ JSON.stringify(ex) +"\r\n\r\n" )

	// helps handling ws errors
	if(res)
		res.status(500).send({
			message: "Server error occurred.",
		})
}