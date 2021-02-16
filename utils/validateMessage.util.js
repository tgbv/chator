// helps with message validation

const Joi = require('joi')

// holds the message types
// 0 -> simple message
// 1 -> picture
// ... to be continued
const messageTypes = [
	"text", 
	//"picture",
]


// validates message
const messageValidators = {

	// validates based on text content
	text(data){
		let result = Joi.string().min(1).max(4096).required()
						.validate(data)

		return result.error ? result.error : true;
	},


}


// message = { type(int), data(string) }
module.exports = (message)=>{

	// determine if message/type exists
	if(
		!message ||
		message.type === undefined ||
		!message.content   ||
		!messageTypes[message.type]
	)
		return {
			message: "Invalid message!"
		}
	//
	else 
		// invoke function based on messageType
		// each message type has its own validation method
		return messageValidators[ messageTypes[message.type] ](message.content)


}