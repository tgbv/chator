// configures knex db connection
module.exports = require('knex')({
	client: 'mysql',
	connection:{
		host: process.env.DB_HOST,
		user: process.env.DB_USR,
		passsword: process.env.DB_PSS,
		database: process.env.DB_NAME,
		charset: 'utf8',
	}
})