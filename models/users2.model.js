const {Knex} = require('../utils')
const Bookshelf = require('bookshelf')(Knex)

module.exports = Bookshelf.model('User', {

	tableName: 'g_users',

})