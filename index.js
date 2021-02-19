// import 
const Express = require('express')
const Dotenv = require('dotenv')
const Bodyparser = require('body-parser')
const Http = require('http')
const SocketIo = require('socket.io')

// server setup
Dotenv.config()

const {DB} = require('./utils')
		DB.init()

const App = Express()
const HttpServer = Http.createServer(App)
const WSServer = new SocketIo.Server({
	maxHttpBufferSize: 5e9,
	serveClient: false,
	cors: {
		origin: '*',

	}
})


// import middlewares
const {RootMiddleware, WsRootMiddleware} = require('./middlewares')

// express setup
App.set('trust proxy', 1) // we're always gonna be behind TOR
App.use(Bodyparser.json())
App.use('/', 

	// binds the root middleware
	// accepts custom params
	RootMiddleware(WSServer), 

	// bootstrap all routes
	require('./routes')
)

// websocket setup
require('./websocket')(
	// the websocket server instance
	WSServer

	// for some reasons this middleware doesn't work
	// will open an issue on github soon
	.use( WsRootMiddleware ) 
)

// listen!
HttpServer.listen(
	process.env.SERVER_PORT,
	console.log(`HTTP server listening on ${process.env.SERVER_PORT}`)
)

WSServer.listen(
	process.env.WEBSOCKET_PORT,
	console.log(`WEBSOCKET listening on ${process.env.WEBSOCKET_PORT}`)
)
