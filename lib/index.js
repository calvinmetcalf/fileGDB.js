var buffs = require('./read');
var reader = require('./nodeReader');
var fromZip = require('./fromZip');
module.exports= function(){
	if(arguments.length === 2){
		return buffs(arguments[0],arguments[1]);
	}
	if(typeof arguments[0] === 'string' &&!process.browser){
		return reader(arguments[0]);
	}
	if(process.browser&&arguments[0].toString()==="[object FileList]"){
		return reader(arguments[0]);
	}
	return fromZip(arguments[0]);
};