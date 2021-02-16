module.exports = {
	RootMiddleware: require('./Root.middleware'),
	MustBeLoggedInMiddleware: require('./MustBeLoggedIn.middleware'),
	UserIsPartOfLobbyMiddleware: require('./UserIsPartOfLobby.middleware'),

	WsRootMiddleware: require('./Root.ws'),
	WsMustBeLoggedInMiddleware: require('./MustBeLoggedIn.ws'),
	WsUserIsPartOfLobbyMiddleware: require('./UserIsPartOfLobby.ws'),
}