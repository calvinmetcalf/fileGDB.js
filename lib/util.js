exports.toArrayBuffer = function (buffer) {
	var len = buffer.length;
	var view = new Uint8Array(new ArrayBuffer(len));
	var i = -1;
	while (++i<len) {
		view[i] = buffer[i];
	}
	return view.buffer;
};