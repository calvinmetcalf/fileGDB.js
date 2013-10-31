var promise = require("lie");
var all = require('lie-all');
var read = require('./read');
var toArray = require('./util').toArray;
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
		var tableA = {};
		var tablxA = {};
		var i = 0;
		var len = fileList.length;
		while (i < len) {
				if (fileList[i].name.slice(-9) === ".gdbtable"&&(parseInt(fileList[i].name.slice(1,-9),16)===1||parseInt(fileList[i].name.slice(1,-9),16)>8)){
					tableA[parseInt(fileList[i].name.slice(1, - 9), 16)] = fileList[i];
				}
				else if (fileList[i].name.slice(-9) === ".gdbtablx"&&(parseInt(fileList[i].name.slice(1,-9),16)===1||parseInt(fileList[i].name.slice(1,-9),16)>8)) {
					tablxA[parseInt(fileList[i].name.slice(1, - 9), 16)] = fileList[i];
				}
			i++;
		}
		var table = toArray(tableA);
		var tablx = toArray(tablxA);
		function readFile(num) {
			return all([handleFile(table[num]), handleFile(tablx[num])]).then(function(buffs) {
				return read(buffs[0], buffs[1]);
			});
		}
		readFile(0).then(function(files) {
			var out = {};
			var i = 1;
			files.forEach(function(name) {
				if (name.Name.slice(0, 4) !== 'GDB_') {
					out[name.Name] = i++;
				}
			});
			return out;
		}).then(function(names) {
			var out = {};
			return all(Object.keys(names).map(function(key) {
				return readFile(names[key]).then(function(v) {
					out[key] = v;
				});
			})).then(function(a) {
				return out;
			});
		}).then(yes,no);
	});

};