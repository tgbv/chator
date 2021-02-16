// handles user's chatrooms (aka lobbies)

const Router = require('express').Router({mergeParams: true})
const {ChatroomsController} = require('../controllers')
const {UserIsPartOfLobbyMiddleware} = require('../middlewares')

module.exports = Router
	// retrieves all my lobbies
	.get('/', ChatroomsController.getChatrooms)

	// creates new lobby
	// users: [int, int, int]
	.post('/lobby/new', ChatroomsController.makeLobbyWithUsers)

	// loby related jobs
	// i've decided to check if user is part of lobby in a dedicated middleware
	// seems more manageable
	.use('/lobby/:lobby_id', UserIsPartOfLobbyMiddleware, 
		Router

		// get users of lobby
		.get('/users', ChatroomsController.getUsersOfLobby)

		// get lobby messages
		.get('/messages/:page', ChatroomsController.getLobbyMessages)

		// sends a message to a lobby
		.post('/message', ChatroomsController.sendLobbyMessage)

		// leaves lobby
		// provide "withMessage: true" in body to delete the messages as well
		.delete('/', ChatroomsController.leaveLobby)

		// adds users to a lobby it belongs to
		.post('/add-users', ChatroomsController.addUsersToLobby)
	)




