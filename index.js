// import 
const Express = require('express')
const Dotenv = require('dotenv')
const Bodyparser = require('body-parser')


// setup
Dotenv.config()

const {RootMiddleware} = require('./middlewares')
const App = Express()

App.set('trust proxy', 1) // we're always gonna be behind TOR
App.use(Bodyparser.json())
App.use('/', RootMiddleware, require('./routes'))

// listen!
let Server = App.listen(
	process.env.SERVER_PORT,
	console.log(`Started listening on ${process.env.SERVER_PORT}`)
)