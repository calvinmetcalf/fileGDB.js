var fdb = require('../lib');
var fs = require('fs');
var i = 1;
while(i<9){
	if(i===8){
		i++;
	}
	console.log('on ./data/a0000000'+i+'.gdbtable');
	//try{
		fs.writeFileSync('./data/test'+i+'.json',JSON.stringify(fdb(fs.readFileSync('./data/a0000000'+i+'.gdbtable'),fs.readFileSync('./data/a0000000'+i+'.gdbtablx'))),{encoding:'utf8'});
	//}catch(e){
	//	console.log(e);
	//}
	i++;
}