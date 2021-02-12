// g_users table model

const Backbone = require('mysql-backbone')
const { MysqlConnection } = require('../utils')

// holds the model
const Model = Backbone.Model.extend({
	connection: MysqlConnection,
	tableName: 'g_users',
})

// holds the collection of models
const Collection = Backbone.Collection.extend({
	connection: MysqlConnection,
	tableName: 'g_users',
	model: Model,
})

// i can't export it directly :(
module.exports = new Collection



