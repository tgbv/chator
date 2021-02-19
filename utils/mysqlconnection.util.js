// handles the connection to the database.

const Mysql = require('mysql')

// thread
module.exports = class {
	/*
	*	init function
	*/
	static init(){
		this.createConnection()
		this.setConnectionEvents()
		this.connectToDatabase()
	}

	/*
	*	connects to the database
	*/
	static connectToDatabase(){
		this.Connection.connect(e=>{
			if(e) {
				console.error("DB connection failed: "+ e.stack)
				console.log(`Retrying connection after ${process.env.DB_RECONNECT_TIME} seconds.`)
				this.Connection.end(e2=>{ // gracefully disconnect
					setTimeout(()=>{
						this.init()
					}, 1000 * process.env.DB_RECONNECT_TIME)	
				})
			}
			else
				console.log(`DB connected at port ${process.env.DB_PORT}`)
		})
	}

	/*
	*	creates a mysql database connection
	*/
	static createConnection(){
		this.Connection = null
		this.Connection = Mysql.createConnection({
			host: process.env.DB_HOST,
			user: process.env.DB_USR,
			password: process.env.DB_PSS,
			database: process.env.DB_NAME,
			port: process.env.DB_PORT,
			
			multipleStatements: true,
		})
	}

	/*
	*	sets connection events
	*/
	static setConnectionEvents(){
		// handle errors
		this.Connection.on('error', e=>{
			console.log(`DB connection failed: ${e.stack}`)
			console.log(`Retrying connection after ${process.env.DB_RECONNECT_TIME} seconds.`)
			this.Connection.end(e2=>{ // gracefully disconnect
				setTimeout(()=>{
					this.init()
				}, 1000 * process.env.DB_RECONNECT_TIME)	
			})

			setTimeout(()=>{
				this.init()
			}, 1000 * process.env.DB_RECONNECT_TIME)
		})
	}

	/*
	*	queries the database async
	*/
	static async q(string, toPrepare = []){
		return new Promise((resolve, reject)=>{
			this.Connection.query(string, toPrepare, (e, r, f)=>{
				if(e) reject(e)
				else resolve(r)
			})
		})
	}

}