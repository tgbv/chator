// handles everything related to lobbies

const { getAllFuncsOfClass} = require('../utils')

module.exports = (WS)=>{

	//console.log(getAllFuncsOfClass(WS))

	WS.on('connection', Socket=>{

		Socket.emit('welcome')

	})

}