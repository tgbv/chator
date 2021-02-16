module.exports = (Socket, next)=>{
	Socket.$ = {}

	next()
}