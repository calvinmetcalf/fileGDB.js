var rows = require('./rows');
var util = require('./util');
var promise = require("liar");

function buffs(table,tablex){
	if(!process.browser){
		table = util.toArrayBuffer(table);
		tablex = util.toArrayBuffer(tablex);
	}
	return rows(table,tablex);
}
module.exports= function(){
	if(arguments.length === 2){
		return buffs(arguments[0],arguments[1]);
	}
	if(typeof arguments[0] === 'string' &&!process.browser){
		return promise.map(require('./nodeReader')(arguments[0]),function(v){
			return buffs(v[0],v[1]);
		});
	}
	if(process.browser&&arguments[0].toString()==="[object FileList]"){
		return promise.map(require('./browserReader')(arguments[0]),function(v){
			return buffs(v[0],v[1]);
		});
	}
};