module.exports = {
	RootMiddleware: require('./Root.middleware'),
	MustBeLoggedInMiddleware: require('./MustBeLoggedIn.middleware'),

	WsRootMiddleware: require('./Root.ws'),
	WsMustBeLoggedInMiddleware: require('./MustBeLoggedIn.ws'),
	WsUserIsPartOfLobby: require('./UserIsPartOfLobby.ws'),
}