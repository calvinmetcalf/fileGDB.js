var dataTypes = [
	function(data,offset){
		return {
			data: data.getUint16(offset,true),
			offset:offset+2;
		}
	},
	function(data,offset){
		return {
			data: data.getUint32(offset,true),
			offset:offset+4;
		}
	},
	function(data,offset){
		return {
			data: data.getFloat32(offset,true),
			offset:offset+4;
		}
	},
	function(data,offset){
		return {
			data: data.getFloat64(offset,true),
			offset:offset+8;
		}
	},
	function(data,offset,row){
	//string
		var str ='';
		var i = 0;
		while(i<row.len){
			str += String.fromCharCode.apply(false,data.getUint8(offset++));
			i++;
		}
		return {
			data: str,
			offset:offset;
		}
	},
	function(data,offset){
		//date
		return {
			data: data.getFloat64(offset,true),
			offset:offset+8;
		}
	},
	function(data,offset){
		//oid
		return {
			data: "",
			offset:offset;
		}
	},
	function(data,offset){
		//shp
		return {
			data: "",
			offset:offset;
		}
	},
	function(data,offset){
		//binary
		var str ='';
		var i = 0;
		while(i<row.len){
			str += String.fromCharCode.apply(false,data.getUint8(offset++));
			i++;
		}
		return {
			data: str,
			offset:offset;
		}
	},
];

module.exports = function(buffer,headers,rowOffsets){
	return {
		type:'FeatureCollection',
		features:rowOffsets.map(function(offset,i){
			if(!offset){
				return null;
			}
			var len = (new DataView(buffer,offset,4)).getUint32(0,true);
			offset += 4;
			var data = new DataView(buffer,offset,len);
			var flags=[];
			var nf = headers.nullableFields;
			var nullPlace = -1;
			if(nf){
				while(nf--){
					flags.push(data.getUint8(offset++,true));
				}
			}
			headers.fields.forEach(function(field,j){
				if(headers.nullableFields&&field.nullable){
					if(!flags[++nullPlace]){
						return;
					};
				}
				var temp = dataTypes[field.type](data,offset,field));
				offset = temp.offset;
				return temp.data;
			});
		})
	};
};


