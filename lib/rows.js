var convertDate = require('./date');
var parseGeometry = require('./geometry');
var Data = require('./dataType');
var table = require("./table");
var tablex = require("./tablex");
function parseUUID(data){
		//uuid
		var out = "";
		var x = 16;
		while(x--){
			out += data.getUint8().toString(16);
		}
		return out;
	}
function parseText(data,row){
		//xml or string
		var str ='';
		var i = 0;
		var len = data.varuint();
		while(i<len){
			str += String.fromCharCode.call(false,data.getUint8());
			i++;
		}
		return str;
	}
var dataTypes = [
	function(data){
		return data.getUint16();
	},
	function(data){
		return data.getUint32();
	},
	function(data){
		return data.getFloat32();
	},
	function(data){
		return data.getFloat64();
	},
	parseText,
	function(data){
		//date
		return convertDate(data.getFloat64());
	},
	function(data){
		//oid
		return;
	},
	parseGeometry,
	function(data){
		//binary
		var out =[];
		var i = 0;
		var len = data.varuint();
		while(i<len){
			out.push(data.getUint8());
			i++;
		}
		return new ArrayBuffer(out);
	},
	null,
	parseUUID,
	parseUUID,
	parseText
];

module.exports = function(buffer,bufferx){
	var headers = table(buffer);
	var rowOffsets = tablex(bufferx);
	return {
		type:'FeatureCollection',
		features:rowOffsets.map(function(offset,i){
			if(!offset){
				return null;
			}
			var len = (new DataView(buffer,offset,4)).getUint32(0,true);
			offset += 4;
			var data = new Data(buffer,offset,len);
			var flags=[];
			var nf = headers.fields.nullableFields;
			var nullPlace = -0;
			if(nf){
				while(nf>0){
					flags.push(data.getUint8());
					nf-=8;
				}
			}
			var out ={type:"Feature"};
			out.properties={};
			headers.fields.fields.forEach(function(field,i){
				var test;
				if(nf){
					if(field.nullable){
						test = (flags[nullPlace >> 3] & (1 << (nullPlace % 8)));
						nullPlace++;
						if(test!==0){
							return;
						}
					}
				}
				var row = dataTypes[field.type](data,field);
				if(typeof row === 'undefined'){
					return;
				}
				if(field.type === 7){
					out.geometry = row;
				}else{
					out.properties[field.title]= row;
				}
			});
			return out;
		})
	};
};


