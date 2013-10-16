var fdb = require('../lib');
var fs = require('fs');
var path = require('path');

describe('point', function(){
	fs.readdirSync('./test/aul.gdb').forEach(function(filePath,i){
		if(path.extname(filePath)==='.gdbtable'){
			it('should work on '+filePath,function(){
				var outFile;
				var result = fdb(fs.readFileSync('./test/aul.gdb/'+filePath),fs.readFileSync('./test/aul.gdb/'+path.basename(filePath,'.gdbtable')+'.gdbtablx'));
				if(result.type  ===  'FeatureCollection'){
					outFile = './test/result/pointTest'+path.basename(filePath,'.gdbtable')+'.geojson';
				}else{
					outFile = './test/result/pointTest'+path.basename(filePath,'.gdbtable')+'.json';
				}
				fs.writeFileSync(outFile,JSON.stringify(result,false,4),{encoding:'utf8'});
			});
		}
	});
	it('should work async on ./test/aul.gdb',function(done){
		fdb('./test/aul.gdb').then(function(l){
			l.forEach(function(v,i){
				fs.writeFileSync('./test/result/pointTestAsync'+i+'.geojson',JSON.stringify(v,false,4),{encoding:'utf8'});
			});
			done();
		},done);
	});
});

describe('gdb', function(){
	fs.readdirSync('./test/GRP.gdb').forEach(function(filePath,i){
		if(path.extname(filePath)==='.gdbtable'){
			it('should work on '+filePath,function(){
				var outFile;
				var result = fdb(fs.readFileSync('./test/GRP.gdb/'+filePath),fs.readFileSync('./test/GRP.gdb/'+path.basename(filePath,'.gdbtable')+'.gdbtablx'));
				if(result.type === 'FeatureCollection'){
					outFile = './test/result/GRP'+path.basename(filePath,'.gdbtable')+'.geojson';
				}else{
					outFile = './test/result/GRP'+path.basename(filePath,'.gdbtable')+'.json';
				}
				fs.writeFileSync(outFile,JSON.stringify(result,false,4),{encoding:'utf8'});
			});
		}
	});
	it('should work async on ./test/GRP.gdb',function(done){
		fdb('./test/GRP.gdb').then(function(l){
			l.forEach(function(v,i){
				fs.writeFileSync('./test/result/GRPAsync'+i+'.geojson',JSON.stringify(v,false,4),{encoding:'utf8'});
			});
			done();
		},done);
	});
});
/*describe('bikes', function(){
	fs.readdirSync('./test/BikeInventory.gdb').forEach(function(filePath,i){
		if(path.extname(filePath)==='.gdbtable'){
			it('should work on '+filePath,function(){
				var outFile;
				var result = fdb(fs.readFileSync('./test/BikeInventory.gdb/'+filePath),fs.readFileSync('./test/BikeInventory.gdb/'+path.basename(filePath,'.gdbtable')+'.gdbtablx'));
				if(result.type === 'FeatureCollection'){
					outFile = './test/result/bike'+path.basename(filePath,'.gdbtable')+'.geojson';
				}else{
					outFile = './test/result/bike'+path.basename(filePath,'.gdbtable')+'.json';
				}
				fs.writeFileSync(outFile,JSON.stringify(result,false,4),{encoding:'utf8'});
			});
		}
	});
});*/

describe('multi point', function(){
	fs.readdirSync('./test/multipointtest.gdb').forEach(function(filePath,i){
		if(path.extname(filePath)==='.gdbtable'){
			it('should work on '+filePath,function(){
				var outFile;
				var result = fdb(fs.readFileSync('./test/multipointtest.gdb/'+filePath),fs.readFileSync('./test/multipointtest.gdb/'+path.basename(filePath,'.gdbtable')+'.gdbtablx'));
				if(result.type === 'FeatureCollection'){
					outFile = './test/result/multiPointTest'+path.basename(filePath,'.gdbtable')+'.geojson';
				}else{
					outFile = './test/result/multiPointTest'+path.basename(filePath,'.gdbtable')+'.json';
				}
				fs.writeFileSync(outFile,JSON.stringify(result,false,4),{encoding:'utf8'});
			});
		}
	});
	it('should work async on ./test/multipointtest.gdb',function(done){
		fdb('./test/multipointtest.gdb').then(function(l){
			l.forEach(function(v,i){
				fs.writeFileSync('./test/result/multiPointTestAsync'+i+'.geojson',JSON.stringify(v,false,4),{encoding:'utf8'});
			});
			done();
		},done);
	});
});
describe('ferry and boston', function(){
	fs.readdirSync('./test/bostonferry.gdb').forEach(function(filePath,i){
		if(path.extname(filePath)==='.gdbtable'){
			it('should work on '+filePath,function(){
				var outFile;
				var result = fdb(fs.readFileSync('./test/bostonferry.gdb/'+filePath),fs.readFileSync('./test/bostonferry.gdb/'+path.basename(filePath,'.gdbtable')+'.gdbtablx'));
				if(result.type === 'FeatureCollection'){
					outFile = './test/result/bostonferry'+path.basename(filePath,'.gdbtable')+'.geojson';
				}else{
					outFile = './test/result/bostonferry'+path.basename(filePath,'.gdbtable')+'.json';
				}
				fs.writeFileSync(outFile,JSON.stringify(result,false,4),{encoding:'utf8'});
			});
		}
	});
		it('should work async on ./test/bostonferry.gdb',function(done){
		fdb('./test/bostonferry.gdb').then(function(l){
			l.forEach(function(v,i){
				fs.writeFileSync('./test/result/bostonferryAsync'+i+'.geojson',JSON.stringify(v,false,4),{encoding:'utf8'});
			});
			done();
		},done);
	});
});
describe('inner ring', function(){
	fs.readdirSync('./test/innerRing.gdb').forEach(function(filePath,i){
		if(path.extname(filePath)==='.gdbtable'){
			it('should work on '+filePath,function(){
				var outFile;
				var result = fdb(fs.readFileSync('./test/innerRing.gdb/'+filePath),fs.readFileSync('./test/innerRing.gdb/'+path.basename(filePath,'.gdbtable')+'.gdbtablx'));
				if(result.type === 'FeatureCollection'){
					outFile = './test/result/innerRing'+path.basename(filePath,'.gdbtable')+'.geojson';
				}else{
					outFile = './test/result/innerRing'+path.basename(filePath,'.gdbtable')+'.json';
				}
				fs.writeFileSync(outFile,JSON.stringify(result,false,4),{encoding:'utf8'});
			});
		}
	});
		it('should work async on ./test/innerRing.gdb',function(done){
		fdb('./test/innerRing.gdb').then(function(l){
			l.forEach(function(v,i){
				fs.writeFileSync('./test/result/innerRingAsync'+i+'.geojson',JSON.stringify(v,false,4),{encoding:'utf8'});
			});
			done();
		},done);
	});
});