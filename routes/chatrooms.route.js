// handles user's chatrooms

const Router = require('express').Router()
const {ChatroomsController} = require('../controllers')

module.exports = Router
	.get('/', ChatroomsController.getChatrooms)

	// get users of lobby
	.get('/lobby/:lobby_id/users', ChatroomsController.getUsersOfLobby)

	// get lobby messages
	.get('/lobby/:lobby_id/messages/:page', ChatroomsController.getLobbyMessages)

	// creates new lobby
	.post('/lobby/new', ChatroomsController.makeLobbyWithUsers)

	// sends a message to a lobby
	.post('/lobby/:lobby_id/message', ChatroomsController.sendLobbyMessage)

	// leaves lobby
	// provide "withMessage: true" in body to delete the messages as well
	.delete('/lobby/:lobby_id', ChatroomsController.leaveLobby)

	// adds users to a lobby it belongs to
	//.post('/lobby/:lobby_id/add-users', ChatroomsController.addUsersToLobby)




