var fdb = require('../lib');
var fs = require('fs');
var path = require('path');

describe('point', function(){
	fs.readdirSync('./test/aul.gdb').forEach(function(filePath,i){
		if(path.extname(filePath)==='.gdbtable'){
			it('should work on '+filePath,function(){
				fs.writeFileSync('./test/result/pointTest'+i+'.json',JSON.stringify(fdb(fs.readFileSync('./test/aul.gdb/'+filePath),fs.readFileSync('./test/aul.gdb/'+path.basename(filePath,'.gdbtable')+'.gdbtablx'))),{encoding:'utf8'});
			});
		}
	});
});
describe('gdb', function(){
	fs.readdirSync('./test/GRP.gdb').forEach(function(filePath,i){
		if(path.extname(filePath)==='.gdbtable'){
			it('should work on '+filePath,function(){
				fs.writeFileSync('./test/result/GRP'+i+'.json',JSON.stringify(fdb(fs.readFileSync('./test/GRP.gdb/'+filePath),fs.readFileSync('./test/GRP.gdb/'+path.basename(filePath,'.gdbtable')+'.gdbtablx'))),{encoding:'utf8'});
			});
		}
	});
});
describe('bikes', function(){
	fs.readdirSync('./test/BikeInventory.gdb').forEach(function(filePath,i){
		if(path.extname(filePath)==='.gdbtable'){
			it('should work on '+filePath,function(){
				fs.writeFileSync('./test/result/bike'+i+'.json',JSON.stringify(fdb(fs.readFileSync('./test/BikeInventory.gdb/'+filePath),fs.readFileSync('./test/BikeInventory.gdb/'+path.basename(filePath,'.gdbtable')+'.gdbtablx'))),{encoding:'utf8'});
			});
		}
	});
});

describe('multi point', function(){
	fs.readdirSync('./test/multipointtest.gdb').forEach(function(filePath,i){
		if(path.extname(filePath)==='.gdbtable'){
			it('should work on '+filePath,function(){
				fs.writeFileSync('./test/multiPointTest'+i+'.json',JSON.stringify(fdb(fs.readFileSync('./test/multipointtest.gdb/'+filePath),fs.readFileSync('./test/multipointtest.gdb/'+path.basename(filePath,'.gdbtable')+'.gdbtablx'))),{encoding:'utf8'});
			});
		}
	});
});

