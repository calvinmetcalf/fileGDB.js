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
function parseText(data){
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
			var nullPlace = -1;
			if(nf){
				while(nf>0){
					flags.push(data.getUint8());
					nf-=8;
				}
			}
			var geometry;
			var out ={type:"Feature"};
			var row = headers.fields.fields.map(function(field,i){
				if(headers.nullableFields&&field.nullable){
					if(!flags[++nullPlace]){
						return;
					}
				}
				if(field.type === 7){
					geometry=i;
				}
				return dataTypes[field.type](data,field);
			}).filter(function(v){return v;});
			if(geometry>-1){
				out.geometry = row.splice(i,1)[0];
				
			}
			out.properties = row;
			return out;
		})
	};
};


