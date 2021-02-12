const Session = require('express-session')

module.exports = Session({
	secret: process.env.SESSION_SECRET,
	resave: true,
	saveUninitialized: true,
})