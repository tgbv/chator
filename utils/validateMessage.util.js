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
		typeof(message.type) !== undefined && 
		typeof(message.content) !== undefined &&
		messageTypes[message.type]
	)

		// invoke function based on messageType
		// each message type has its own validation method
		return messageValidators[ messageTypes[message.type] ](message.content)

	//
	else 
		return {
			message: "Invalid message!"
		}

}