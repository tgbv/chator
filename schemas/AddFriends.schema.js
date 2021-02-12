const J = require('joi')

module.exports = J.object({
	users: J.array().items(
		J.string().min(3).max(256)
	).min(1).required()
})
