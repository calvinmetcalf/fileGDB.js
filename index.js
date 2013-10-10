var rows = require('./rows');
var parseFields = require('./fields');
var utils = require('./utils');
function parseHeader(buffer){
	var data = new Uint32Array(buffer,0,40);
	return {
		rows:data[1],
		fileSize:data[6],
		fdOffset : data[8]
	};
}
function gdbtable(buffer){
	var out = {};
	out.header = parseHeader(buffer);
	out.fields = parseFields(buffer);
	//todo parse rows
	return out;
}
function gdbtablex(buffer){
	var data = new DataView(buffer);
	var offset = 8;
	var rows = [];
	var len = data.getUint32(offset,true);
	offset +=8;//yes 8
	var i = 0;
	while(i<len){
		rows[i++] = data.getUint32(offset,true);
		offset += 5;//yes 5
	}
	return rows;
}
module.exports= function(table,tablex){
	return rows(table,gdbtable(table),gdbtablex(tablex));
};