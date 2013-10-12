var fdb = require('../lib');
var fs = require('fs');
var path = require('path');

describe('point', function(){
	fs.readdirSync('./test/aul.gdb').forEach(function(filePath,i){
		if(path.extname(filePath)==='.gdbtable'){
			it('should work',function(){
				fs.writeFileSync('./test/pointTest'+i+'.json',JSON.stringify(fdb(fs.readFileSync('./test/aul.gdb/'+filePath),fs.readFileSync('./test/aul.gdb/'+path.basename(filePath,'.gdbtable')+'.gdbtablx'))),{encoding:'utf8'});
			});
		}
	});
});

describe('multi point', function(){
	fs.readdirSync('./test/multipointtest.gdb').forEach(function(filePath,i){
		if(path.extname(filePath)==='.gdbtable'){
			it('should work',function(){
				fs.writeFileSync('./test/multiPointTest'+i+'.json',JSON.stringify(fdb(fs.readFileSync('./test/multipointtest.gdb/'+filePath),fs.readFileSync('./test/multipointtest.gdb/'+path.basename(filePath,'.gdbtable')+'.gdbtablx'))),{encoding:'utf8'});
			});
		}
	});
});
