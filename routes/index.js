const Router = require('express').Router()
const { setsession } = require('../utils')
const {
	MustBeLoggedInMiddleware
} = require('../middlewares')


module.exports = Router
	// handles authentication
	.use('/auth', setsession, require('./auth.route'))

	// handles friendlist
	.use('/friendlist', MustBeLoggedInMiddleware, require('./friendlist.route'))
