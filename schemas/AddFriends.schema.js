const J = require('joi')

module.exports = J.object({
	users: J.array().items(
		J.number().integer().min(1)
	).min(1).required()
})
