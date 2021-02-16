const Router = require('express').Router()

const {FriendlistController} = require('../controllers')

module.exports = Router
	.get('/', FriendlistController.getFriends)

	// add friends 
	// users: [int, int, int]
	.post('/add-friends', FriendlistController.addFriends)

	// unlink friends
	// users: [int, int, ...]
	.delete('/unlink-friends', FriendlistController.unlinkFriends)