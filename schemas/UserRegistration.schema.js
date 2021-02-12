const Joi = require('joi')

module.exports = Joi.object({
	username: Joi.string().min(3).max(256).required(),
	password: Joi.string().min(5).max(90).required(),
})
