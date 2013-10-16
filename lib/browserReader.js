var promise = require("liar");

function handleFile(file) {
	return promise(function(done) {
		var reader = new FileReader();
		reader.onload = function() {
			done(reader.result);
		};
		reader.readAsArrayBuffer(file);
	});
}
module.exports = function(fileList) {
	return promise(function(yes, no) {
		var table = {};
		var tablx = {};
		var i = 0;
		var len = fileList.length;
		while (i < len) {
			if (parseInt(fileList[i].name.slice(1, - 9), 16) > 8) {
				if (fileList[i].name.slice(-9) === ".gdbtable") {
					table[parseInt(fileList[i].name.slice(1, - 9), 16)] = fileList[i];
				}
				else if (fileList[i].name.slice(-9) === ".gdbtablx") {
					tablx[parseInt(fileList[i].name.slice(1, - 9), 16)] = fileList[i];
				}
			}
			i++;
		}
		var promises = [];
		for (var key in table) {
			promises.push(promise.map([table[key], tablx[key]], handleFile));
		}
		promise.all(promises).then(yes, no);
	});

};