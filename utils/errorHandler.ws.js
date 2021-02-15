// handles ws exceptions in general
const Fs = require('fs')
const errorHandlerBase  = require('./errorHandlerBase.util')

module.exports = (Data, Socket, disconnect = false)=>{
	// handle error
	errorHandlerBase(Data)

	// helps handling ws errors
	Socket.emit('error', {
		message: 'WS error occurred.'
	})
	if(disconnect) Socket.disconnect()
}