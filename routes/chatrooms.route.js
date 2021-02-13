// handles user's chatrooms

const Router = require('express').Router()
const {ChatroomsController} = require('../controllers')

module.exports = Router
	.get('/', ChatroomsController.getChatrooms)

	// get users of lobby
	.get('/lobby/:lobby_id/users', ChatroomsController.getUsersOfLobby)

	// creates new lobby
	.post('/lobby/new', ChatroomsController.makeLobbyWithUsers)
