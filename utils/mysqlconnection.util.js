// handles the connection to the database.

const Mysql = require('mysql')

const Connection = Mysql.createConnection({
	host: process.env.DB_HOST,
	user: process.env.DB_USR,
	password: process.env.DB_PSS,
	database: process.env.DB_NAME,
	
	multipleStatements: true,
})

Connection.connect()

module.exports = {
	Connection: Connection,

	async q(string, toPrepare = []){
		return new Promise((resolve, reject)=>{
			Connection.query(string, toPrepare, (e, r, f)=>{
				if(e) reject(e)
				else resolve(r)
			})
		})
	}
}