var fs = require('fs');
var promise = require("liar");
var readDir = promise.denodify(fs.readdir);
var readFile = promise.denodify(fs.readFile);
module.exports = function(pathString){
	return promise(function(yes,no){
		readDir(pathString).then(function(filePaths){
			promise.map(filePaths.filter(function(filePath){
				return filePath.slice(-9) === ".gdbtable" && parseInt(filePath.slice(1, - 9), 16) > 8;
			}),function(filePath){
				return promise.map([pathString+'/'+filePath,pathString+'/'+filePath.slice(0,-1)+'x'],readFile);
			}).then(yes,no);
		},no);
	});
	
};