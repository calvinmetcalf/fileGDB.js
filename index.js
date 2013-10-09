var rows = require('./rows');
function parseHeader(buffer){
	var data = new Uint32Array(buffer,0,40);
	return {
		rows:data[1],
		fileSize:data[6],
		fdOffset : data[8]
	};
}
function get2(offset, data) {
	var out = {
		meta: {}
	};
	out.meta.len = data.getUint8(offset++,true);
	out.meta.flag = data.getUint8(offset++,true);
	out.meta.nullable = !(out.meta.flag&1);
	out.offset=offset;
	return out;
}
function get3(offset, data) {
	var out = {
		meta: {}
	};
	out.meta.len = data.getUint8(offset++,true);
	out.meta.flag = data.getUint8(offset++,true);
	out.meta.nullable = !(out.meta.flag&1);
	out.offset=++offset;
	return out;
}
var dataHeaders = [
	get3,//int16
	get3,//int32
	get3,//flaot32
	get3,//float64
	function(offset, data) {
		//string
		var out = {
			meta: {}
		};
		out.meta.len = data.getUint32(offset, true);
		offset += 4;
		out.meta.flag = data.getUint8(offset++, true);
		offset++; //unknown byte
		out.meta.nullable = !(out.meta.flag & 1);
		out.offset = ++offset;
		return out;
	},
	get3,//datetime
	function(offset, data) {
		//oid
		var out = {
			meta: {}
		};
		offset++;
		out.meta.nullable =false;
		out.offset=offset;
		return out;
	},
	function(offset,data){
		//shape
		offset +=2;
		var out = {
			meta: {}
		};
		var srsLen = data.getUint16(offset, true);
		offset +=2;
		var i = 0;
		out.meta.wkt = "";
		while(i<srsLen){
			out.meta.wkt += String.fromCharCode(data.getUint8(offset++,true));
			i++;
		}
		
		var magic = data.getUint8(offset++,true);
		out.meta.origin = [];
		out.meta.origin.push(data.getFloat64(offset,true));
		offset += 8;
		out.meta.origin.push(data.getFloat64(offset,true));
		offset += 8;
		if(magic!==1){
			out.meta.origin.push(data.getFloat64(offset,true));
			offset += 8;
			out.meta.zscale = data.getFloat64(offset,true);
			offset += 8;
			if(magic!==5){
				out.meta.origin.push(data.getFloat64(offset,true));
				offset += 8;
				out.meta.mscale = data.getFloat64(offset,true);
				offset += 8;
			}
		}
		out.meta.xytolerance=data.getFloat64(offset,true);
		offset += 8;
		if(magic!==1){
			out.meta.ztolerance=data.getFloat64(offset,true);
			offset += 8;
			if(magic!==5){
				out.meta.mtolerance=data.getFloat64(offset,true);
				offset += 8;
			}
			i = 4;
			out.meta.extend = [];
			while(i--){
					out.meta.extend.push(data.getFloat64(offset,true));
				offset += 8;
			}
		}
		var magic2;
		if(magic>1){
			magic2 = data.getUint32(offset+1, true);
			if(magic2===0){
				offset+=16;
			}
			offset++;
			magic2 = data.getUint32(offset, true);
			offset+=(magic2<<3);
		}
		out.offset = offset;
		return out;
	},
	function(offset, data) {
		//binary
		var out = {
			meta: {}
		};
		offset++;
		out.meta.flag = data.getUint8(offset++,true);
		out.meta.nullable = !(out.meta.flag&1);
		out.offset=offset;
		return out;
	},
	null,
	get2,//UUID
	get2,//UUID
	get2,//xml
];
function parseFields(buffer){
	var data = new DataView(buffer,40);
	var out = {};
	out.size = data.getUint32(0<<2,true);
	out.version = data.getUint32(1<<2,true);
	out.geometry = data.getUint8(2<<2,true);
	out.num = data.getUint16(3<<2,true);
	out.fields = [];
	out.nullableFields = 0;
	var offset = 14;
	var i = 0;
	var cur;
	var j;
	var temp;
	while(i<out.fields){
		cur = {};
		cur.chars = data.getUint8(offset++,true);
		cur.title = "";
		j = 0;
		while(j<cur.chars){
			cur.title+=String.fromCharCode(data.getUint16(offset,true));
			j++;
			offset+=2;
		}
		cur.chars = data.getUint8(offset++,true);
		if(cur.chars>0){
			cur.alias="";
			j = 0;
			while(j<cur.chars){
				cur.alia+=String.fromCharCode(data.getUint16(offset,true));
				j++;
				offset+=2;
			}
			offset++;//skip blank byte
		}
		
		cur.type = data.getUint8(offset++,true);
		temp = dataHeaders[cur.type](offset,data);
		offset = temp.offset;
		cur.meta = temp.meta;
		if(cur.meta.nullable){
			out.nullableFields++;
		}
		out.fields[i++]=cur;
	}
	out.offset = offset;
	return out;
}
function gdbtable(buffer){
	var out = {};
	out.header = parseHeader(buffer);
	out.fields = parseFields(buffer);
	//todo parse rows
	return out;
}
function gdbtablex(buffer){
	var data = new DataView(buffer);
	var offset = 8;
	var rows = [];
	var len = data.getUint32(offset,true);
	offset +=8;
	var i = 0;
	while(i<len){
		rows[i++] = data.getUint32(offset,true);
		offset += 5;
	}
	return rows;
}
module.exports= function(table,tablex){
	return rows(table,gdbtable(table),gdbtablex(tablex));
};