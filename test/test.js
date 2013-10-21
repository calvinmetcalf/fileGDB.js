var fdb = require('../lib');
var fs = require('fs');
var path = require('path');
var assert = require('geojson-assert');
function testIt(gdbPath){
	describe(gdbPath, function(){
		fs.readdirSync(gdbPath).forEach(function(filePath,i){
			if(path.extname(filePath)==='.gdbtable'){
				it('should work on '+filePath,function(){
					var result = fdb(fs.readFileSync(gdbPath+'/'+filePath),fs.readFileSync(gdbPath+'/'+path.basename(filePath,'.gdbtable')+'.gdbtablx'));
					JSON.stringify(result);
				});
			}
		});
		it('should work async on '+gdbPath,function(done){
			fdb(gdbPath).then(function(l){
				done(assert(l,true));
			},done);
		});
	});
}
['./test/aul.gdb','./test/GRP.gdb','./test/multipointtest.gdb','./test/bostonferry.gdb','./test/innerRing.gdb','./test/fuel.gdb'].map(testIt);
//uncoment if your sure you have enough memory
//testIt('./test/BikeInventory.gdb');