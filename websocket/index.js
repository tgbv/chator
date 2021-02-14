// gateway to the ws modules

const { WsMustBeLoggedInMiddleware, WsRootMiddleware } = require('../middlewares')

// while express routes are passive, the websocket ones are active - event driven
// therefore registering them as functions is the way
// let's call them modules, for that's what they are
module.exports = (WS)=>{

	/* handles lobby-related actions
		pretty much the whole chat app in this module :)

	 user will connect to a certain "lobby/lobby_id" namespace
	 if it's allowed to, it'll listen to all incoming messages
	 and send messages directly through the namespace
	*/
	require('./lobby.ws')( 
		WS 	.of(new RegExp("/lobby/[0-9]+"))
			.use(WsRootMiddleware)
			.use(WsMustBeLoggedInMiddleware) 
	);

}