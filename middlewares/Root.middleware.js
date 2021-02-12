// declares/defines variables used in req

module.exports = (req, res, next)=>{
	req._ = { }

	next()
}