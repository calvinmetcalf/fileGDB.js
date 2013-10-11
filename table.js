var parseFields = require('./fields');
function parseHeader(buffer){
	var data = new Uint32Array(buffer,0,40);
	return {
		rows:data[1],
		fileSize:data[6],
		fdOffset : data[8]
	};
}
module.exports = function (buffer){
	var out = {};
	out.header = parseHeader(buffer);
	out.fields = parseFields(buffer);
	//todo parse rows
	return out;
};