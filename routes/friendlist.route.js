const Router = require('express').Router()

const {FriendlistController} = require('../controllers')

module.exports = Router
	.get('/', FriendlistController.getFriends)
	.post('/add-friends', FriendlistController.addFriends)
	.delete('/unlink-friends', FriendlistController.unlinkFriends)