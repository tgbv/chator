// handles the exceptions/errors

const { writeFileSync } = require('fs')

module.exports = (Ex)=>{
	if(process.env.ENV === 'dev')
		console.log(Ex)
	else
		writeFileSync(`${__dirname}/errorlog.txt`, new Date() +
						"\r\n---------------------\r\n"
						+ JSON.stringify(Ex) +"\r\n\r\n" )
}