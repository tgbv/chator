const Router = require('express').Router()
const Session = require('express-session')
const {AuthController} = require('../controllers')

module.exports = Router
	.post('/register', AuthController.register)
	.post('/login', AuthController.login)
	.get('/', AuthController.showRegistrationForm)