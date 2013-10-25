exports.toArrayBuffer = function (buffer) {
	var len = buffer.length;
	var view = new Uint8Array(new ArrayBuffer(len));
	var i = -1;
	while (++i<len) {
		view[i] = buffer[i];
	}
	return view.buffer;
};

exports.toArray = function(obj){
	var keys = Object.keys(obj);
	keys.sort(function(a,b){return a-b});
	var out = [];
	keys.forEach(function(a){out.push(obj[a])});
	return out;
};