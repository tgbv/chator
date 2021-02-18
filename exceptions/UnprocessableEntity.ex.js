// 
module.exports = class extends Error {
	handle(res){
		res.status(422).send( 
			typeof this.message === 'object' ?
			this.message :
			{ message: this.message }
		)
	}
}
