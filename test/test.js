var fdb = require('../lib');
var fs = require('fs');
var path = require('path');

describe('gdb', function(){
	fs.readdirSync('./test/aul.gdb').forEach(function(filePath,i){
		if(path.extname(filePath)==='.gdbtable'){
			it('should work',function(){
				fs.writeFileSync('./test/test'+i+'.json',JSON.stringify(fdb(fs.readFileSync('./test/aul.gdb/'+filePath),fs.readFileSync('./test/aul.gdb/'+path.basename(filePath,'.gdbtable')+'.gdbtablx'))),{encoding:'utf8'});
			});
		}
	});
});

/*while(i<9){
	if(i===8){
		i++;
	}
	console.log('on ./data/a0000000'+i+'.gdbtable');

		fs.writeFileSync('./data/test'+i+'.json',JSON.stringify(fdb(fs.readFileSync('./data/a0000000'+i+'.gdbtable'),fs.readFileSync('./data/a0000000'+i+'.gdbtablx'))),{encoding:'utf8'});
	i++;
}*/