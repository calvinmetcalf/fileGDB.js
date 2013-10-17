var fs = require('fs');
var path = require('path');
var promise = require("liar");
var readFile = promise.denodify(fs.readFile);
var readDir = promise.denodify(fs.readdir);
var read = require('./read');
function getNames(pathString){
	return readDir(pathString).then(function(rawPaths){
		var paths = rawPaths.filter(function(a){
			return a.slice(-9)==='.gdbtable';
		});
		paths.sort(function(a,b){
			return parseInt(a.slice(1,-9),16)-parseInt(b.slice(1,-9),16);
		});
		return readFiles(path.join(pathString,'a00000001.gdbtable')).then(function(files){
			var out = {};
			files.forEach(function(name,i){
					var fileName = paths[i-1];
					if(name.Name.slice(0,4)!=='GDB_'){
						out[name.Name]=fileName;
					}
				});
			return out;
		});
	});
}
function readFiles(file){
	return promise(function(yes,no){
		yes(promise.map([file,file.slice(0,-1)+'x'],readFile).then(function(buffers){
			return read(buffers[0],buffers[1]);
		}));
	});
}
module.exports = function(pathString){
	return getNames(pathString).then(function(names){
		var out = {};
		return promise.map(Object.keys(names),function(key){
				return readFiles(path.join(pathString,names[key])).then(function(v){
					out[key]=v;
				});
		}).then(function(a){
			return out;
		});
	});
};