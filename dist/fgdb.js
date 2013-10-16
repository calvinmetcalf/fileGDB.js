!function(e){"object"==typeof exports?module.exports=e():"function"==typeof define&&define.amd?define(e):"undefined"!=typeof window?window.fgdb=e():"undefined"!=typeof global?global.fgdb=e():"undefined"!=typeof self&&(self.fgdb=e())}(function(){var define,module,exports;
return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
var promise = require("liar");

function handleFile(file) {
	return promise(function(done) {
		var reader = new FileReader();
		reader.onload = function() {
			done(reader.result);
		};
		reader.readAsArrayBuffer(file);
	});
}
module.exports = function(fileList) {
	return promise(function(yes, no) {
		var table = {};
		var tablx = {};
		var i = 0;
		var len = fileList.length;
		while (i < len) {
			if (parseInt(fileList[i].name.slice(1, - 9), 16) > 8) {
				if (fileList[i].name.slice(-9) === ".gdbtable") {
					table[parseInt(fileList[i].name.slice(1, - 9), 16)] = fileList[i];
				}
				else if (fileList[i].name.slice(-9) === ".gdbtablx") {
					tablx[parseInt(fileList[i].name.slice(1, - 9), 16)] = fileList[i];
				}
			}
			i++;
		}
		var promises = [];
		for (var key in table) {
			promises.push(promise.map([table[key], tablx[key]], handleFile));
		}
		promise.all(promises).then(yes, no);
	});

};
},{"liar":13}],2:[function(require,module,exports){
var Long = require('long');
var l127 = Long.fromNumber(127,true);
function makeLong(n){
    return Long.fromNumber(n,true);
}
function Data(buffer,offset){
	this.data = new DataView(buffer);
	this.offset = offset;
	this.getUint8 = function(){
		return this.data.getUint8(this.offset++);
	};
	//these two functions are ported somewhat directly from
	//http://trac.osgeo.org/gdal/attachment/wiki/FGDBSpecification/dump_gdbtable.py#L60
	this.varuint = function (){
		//console.log('offset',this.offset);
		var ret = 0;
		var shift = -7;
		var b = 128;
		while(b & 128){
			shift += 7;
			//console.log('shift',shift);
			b = this.getUint8();
			//.log('b',b);
			ret = l127.and(makeLong(b)).shiftLeft(shift).or(makeLong(ret)).toNumber();
			//console.log('ret',ret);
		}
		return ret;
	};
	this.varint = function (){
		var b = this.getUint8();
		var ret = (b & 63);
		var sign = 1;
		if(b & 64){
			sign = -1;
		}
		if(!(b & 128)){
			return ret*sign;
		}
		var shift = -1;
		while(b & 128){
			shift += 7;
			b = this.getUint8();
			ret = l127.and(makeLong(b)).shiftLeft(shift).or(makeLong(ret)).toNumber();
		}
		return ret*sign;
	};
	this.getUint16 = function(){
		var out = this.data.getUint16(this.offset,true);
		this.offset += 2;
		return out;
	};
	this.getInt16 = function(){
		var out = this.data.getInt16(this.offset,true);
		this.offset += 2;
		return out;
	};
	this.getUint32 = function(){
		var out = this.data.getUint32(this.offset,true);
		this.offset += 4;
		return out;
	};
	this.getInt32 = function(){
		var out = this.data.getInt32(this.offset,true);
		this.offset += 4;
		return out;
	};
	this.getFloat32 = function(){
		var out = this.data.getFloat32(this.offset,true);
		this.offset += 4;
		return out;
	};
	this.getFloat64 = function(){
		var out = this.data.getFloat64(this.offset,true);
		this.offset += 8;
		return out;
	};
}
module.exports = Data;

},{"long":24}],3:[function(require,module,exports){
module.exports = function(days){
	//convert excel days since 12/30/1899 to JavaScript ms since 1/1/1970
	var unixDays = days - 25569;//days between two dates
	var ms = unixDays*864e5;//milliseconds per day
	return new Date(ms);
}
},{}],4:[function(require,module,exports){
var proj4 = require('proj4');
function get2(offset, data) {
	var out = {
		meta: {nullable:true}
	};
	out.meta.len = data.getUint8(offset++,true);
	out.meta.flag = data.getUint8(offset++,true);
	if((out.meta.flag&1)===0){
		out.meta.nullable = false;
	}
	out.offset=offset;
	return out;
}
function get3(offset, data) {
	var out = {
		meta: {nullable:true}
	};
	out.meta.len = data.getUint8(offset++,true);
	out.meta.flag = data.getUint8(offset++,true);
	if((out.meta.flag&1)===0){
		out.meta.nullable = false;
	}
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
			meta: {nullable:true}
		};
		out.meta.len = data.getUint32(offset, true);
		offset += 4;
		out.meta.flag = data.getUint8(offset++, true);
		if((out.meta.flag&1)===0){
			out.meta.nullable = false;
		}
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
		offset++;
		out.meta.nullable = false;
		out.offset=offset;
		return out;
	},
	function(offset,data){
		//shape
		offset +=2;
		var out = {
			meta: {nullable:true}
		};
		var srsLen = data.getUint16(offset, true);
		offset +=2;
		var i = 0;
		out.meta.wkt = "";
		var char;
		while(i<srsLen){
			char = data.getUint8(offset++,true);
			if(char){
				out.meta.wkt += String.fromCharCode(char);
			}
			i++;
		}
		if(out.meta.wkt){
			out.meta.proj = proj4(out.meta.wkt);
		}
		var magic = data.getUint8(offset++,true);
		out.meta.origin = [];
		out.meta.origin.push(data.getFloat64(offset,true));
		offset += 8;
		out.meta.origin.push(data.getFloat64(offset,true));
		offset += 8;
		var xyScale = data.getFloat64(offset,true);
		offset += 8;
		out.meta.scale = [xyScale,xyScale];
		if(magic!==1){
			out.meta.origin.push(data.getFloat64(offset,true));
			offset += 8;
			out.meta.scale.push(data.getFloat64(offset,true));
			offset += 8;
			if(magic!==5){
				out.meta.origin.push(data.getFloat64(offset,true));
				offset += 8;
				out.meta.scale.push(data.getFloat64(offset,true));
				offset += 8;
			}
		}
		var xytolerance=data.getFloat64(offset,true);
		out.meta.tolerance = [xytolerance,xytolerance];
		offset += 8;
		if(magic!==1){
			out.meta.tolerance.push(data.getFloat64(offset,true));
			offset += 8;
			if(magic!==5){
				out.meta.tolerance.push(data.getFloat64(offset,true));
				offset += 8;
			}
			i = 4;
			out.meta.extent = [];
			while(i--){
				out.meta.extent.push(data.getFloat64(offset,true));
				offset += 8;
			}
		}
		//console.log('tolerance',out.meta.tolerance);
		//console.log('extent',out.meta.extent);
		function testMagic3(num){
			return num === 0;
		}
		var magic2,magic3;
		while(true){
			magic2 = data.getUint8(offset+1,true);
			magic3 = [data.getUint8(offset,true),data.getUint8(offset+2,true),data.getUint8(offset+3,true),data.getUint8(offset+4,true)];
			//console.log('magic2',magic2);
			if(magic2<5&&magic2>0&&magic3.every(testMagic3)){
				offset+=5;
				offset+=(magic2*8);
				break;
			}else{
				offset+=8;
			}
		}
		out.offset = offset;
		return out;
	},
	function(offset, data) {
		//binary
		var out = {
			meta: {nullable:true}
		};
		offset++;
		out.meta.flag = data.getUint8(offset++,true);
		if((out.meta.flag&1)===0){
			out.meta.nullable = false;
		}
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
	out.geometry=false;
	var i = 0;
	var cur;
	var j;
	var temp;
	while(i<out.num){
		cur = {};
		cur.chars = data.getUint8(offset++,true);
		while(cur.chars===0){
			cur.chars = data.getUint8(offset++,true);
		}
		cur.title = "";
		j = 0;
		while(j<cur.chars){
			cur.title+=String.fromCharCode(data.getUint16(offset,true));
			j++;
			offset+=2;
		}
		//console.log('title',cur.title);
		cur.chars = data.getUint8(offset++,true);
		if(cur.chars>0){
			cur.alias="";
			j = 0;
			while(j<cur.chars){
				cur.alias+=String.fromCharCode(data.getUint16(offset,true));
				j++;
				offset+=2;
			}
			//console.log('alias',cur.alias);
		}
		cur.type = data.getUint8(offset++,true);
		//console.log('type',cur.type);
		if(!dataHeaders[cur.type]){
			throw('not a real type');
		}
		temp = dataHeaders[cur.type](offset,data);
		offset = temp.offset;
		cur.meta = temp.meta;
		if(cur.type === 7){
			out.geometry=true;
			out.bbox = cur.meta.extent;
		}
		if(cur.meta.nullable){
			out.nullableFields++;
			cur.nullable=true;
		}
		out.fields[i++]=cur;
	}
	out.offset = offset;
	return out;
}
module.exports = parseFields

},{"proj4":40}],5:[function(require,module,exports){
var Long = require('long');
function checkIt(check,num){
	return !Long.fromNumber(num,true).and(check);
}
var zCheck = Long.fromNumber(0x80000000,true);
var mCheck = Long.fromNumber(0x40000000,true);
var cCheck = Long.fromNumber(0x20000000,true);
function isClockWise(array){
	var sum = 0;
	var i = 1;
	var len = array.length;
	var prev,cur;
	while(i<len){
		prev = cur||array[0];
		cur = array[i];
		sum += ((cur[0]-prev[0])*(cur[1]+prev[1]));
		i++;
	}
	return sum > 0;
}
function polyReduce(a,b){
	if(isClockWise(b)||!a.length){
		a.push([b]);
	}else{
		a[a.length-1].push(b);
	}
	return a;
}
var types = {
	11: {
		base: "point",
		m: true,
		z: true
	},
	10: {
		base: "line",
		m: false,
		z: true
	},
	13: {
		base: "line",
		m: true,
		z: true
	},
	15: {
		base: "polygon",
		m: true,
		z: true
	},
	21: {
		base: "point",
		m: true,
		z: false
	},
	23: {
		base: "line",
		m: true,
		z: false
	},
	19: {
		base: "polygon",
		m: false,
		z: true
	},
	18: {
		base: "mpoint",
		m: true,
		z: true
	},
	28: {
		base: "mpoint",
		m: true,
		z: false
	},
	20: {
		base: "mpoint",
		m: false,
		z: true
	},
	1: {
		base: "point",
		m: false,
		z: false
	},
	3: {
		base: "line",
		m: false,
		z: false
	},
	5: {
		base: "polygon",
		m: false,
		z: false
	},
	25: {
		base: "polygon",
		m: true,
		z: false
	},
	9: {
		base: "point",
		m: false,
		z: true
	},
	8: {
		base: "mpoint",
		m: false,
		z: false
	}
};
function MakePoint(meta){
	this.origin = meta.origin;
	this.scale = meta.scale;
	this.min = Math.min(this.origin.length,this.scale.length);
	function addit(v,i){
		if(i>=this.tmin){
			return;
		}
		return v/this.scale[i]+this.origin[i];
	}
	function reduceit(v,i){
		if(i>=this.rmin){
			return;
		}
		this.accumulater[i]+=(v/this.scale[i]);
		return this.accumulater[i];
	}
	this.convert = function(point,origin){
		origin = origin||this.origin;
		var scale = this.scale;
		var tmin = Math.min(point.length,this.min);
		return  point.map(function(v,i){
			if(i>=tmin){
				return;
			}
			return v/scale[i]+origin[i];
		},this);
	};
	this.reduceBegin=function(point){
		var npoint = this.convert(point);
		this.accumulater = npoint.slice();
		this.line = [npoint];
	};
	this.reduce = function(point){
		this.rmin = Math.min(point.length,this.min,this.accumulater.length);
		this.line.push(point.map(reduceit,this));
	};
}
module.exports = function(data,row){
	function getU(shape){
		var raw = [];
		raw.push(data.varuint());//x
		raw.push(data.varuint());//y
		if(shape.base==='point'){
			if(shape.z){
				raw.push(data.varuint());
			}
			if(shape.m){
				raw.push(data.varuint());
			}
		}
		return raw;
	}
	function getI(shape){
		var raw = [];
		raw.push(data.varint());//x
		raw.push(data.varint());//y
		if(shape.base==='point'){
			if(shape.z){
				raw.push(data.varint());
			}
			if(shape.m){
				raw.push(data.varint());
			}
		}
		return raw;
	}
	var converter;
	if(row.meta.proj){
		converter = function (point){
			return row.meta.proj.inverse(point);
		};
	}else{
		converter = function(point){
			return point;
		};
	}
	
	var makePoint = new MakePoint(row.meta);
	function typeFuncs(shape){
		if(shape.base === 'point' || shape.base === 'mpoint'){
			return typeFuncs[shape.base](shape);
		}else{
			return typeFuncs.complex(shape);
		}
	}
	typeFuncs.point = function(shape){
		return {
				type:"Point",
				coordinates:converter(makePoint.convert(getU(shape)))
			};
	};
	typeFuncs.mpoint = function(shape){
		var len = data.varuint();
		//console.log('len',len);
		var mins = [data.varuint(),data.varuint()];
		var maxes = [data.varuint(),data.varuint()];
		var bbox = makePoint.convert(mins).concat(makePoint.convert(maxes,makePoint.convert(mins)));
		//console.log('mins',makePoint.convert(mins));
		//console.log('maxes',makePoint.convert(maxes,makePoint.convert(mins)));
		var i = 1;
		var point1 = getI(shape);
		var points = [];
		while(i++<len){
			points.push(getI(shape));
		}
		if(shape.z){
			point1.push(data.varint());
			i = 1;
			while(i<len){
				points[i-1].push(data.varint());
				i++;
			}
		}
		makePoint.reduceBegin(point1);
		points.forEach(function(v){
			makePoint.reduce(v);
		});
		var outPoints = makePoint.line.map(converter);
		if(outPoints.length ===1){
			return {
				type:"Point",
				coordinates:outPoints[0]
			};
		}else if(outPoints.length >1){
			return {
				bbox:bbox,
				type:"MultiPoint",
				coordinates:outPoints
			};
		}else{
			return;
		}
	};
	typeFuncs.complex = function(shape){
		var points = data.varuint();
		var tPoints = points;
		var parts = data.varuint();
		var mins = [data.varuint(),data.varuint()];
		var maxes = [data.varuint(),data.varuint()];
		var bbox = makePoint.convert(mins).concat(makePoint.convert(maxes,makePoint.convert(mins)));
		var i = 1;
		var lens = [];
		var tlen;
		while(i++<parts){
			tlen = data.varuint();
			tPoints -= tlen;
			lens.push(tlen);
		}
		lens.push(tPoints);
		var lines = [];
		var rawLines = [];
		var part = -1;
		var point = 1;
		var point1 = getI(shape);
		while(++part<parts){
			rawLines[part]=[];
			while(point++<lens[part]){
				rawLines[part].push(getI(shape));
			}
			point = 0;
		}
		if(shape.z){
			point1.push(data.varint());
			point = 1;
			while(++part<parts){
				while(point<lens[part]){
					rawLines[part][point].push(data.varint());
					point++;
				}
				point = 0;
			}
		}
		makePoint.reduceBegin(point1);
		rawLines.forEach(function(rawPart,i){
			rawPart.forEach(function(rawPoint){
				makePoint.reduce(rawPoint);
			});
			if(shape.base==='polygon'){
				makePoint.line.push(makePoint.line[0]);
			}
			lines.push(makePoint.line.map(converter));
			makePoint.line = [];
		});
		var out = {};
		if(shape.base==='line'){
			if(lines.length ===1){
				return {
					bbox:bbox,
					type:"LineString",
					coordinates:lines[0]
				}; 
			}else if(lines.length>1){
				return {
					bbox:bbox,
					type:"MultiLineString",
					coordinates:lines
				}; 
			}else{
				return;
			}
		}else if(shape.base==='polygon'){
			out.bbox = bbox;
			out.coordinates = lines.reduce(polyReduce,[]);
			if(out.coordinates.length === 1){
				out.type = "Polygon";
				out.coordinates = out.coordinates[0];
				return out;
			}else{
				out.type = "MultiPolygon";
				return out;
			}
		}
	};
	var len = data.varuint();
	//console.log('len',len);
	if(!len){
		return null;
	}
	var expectedOffset = len+data.offset;
	var type = data.varuint();
	var shape;
	if(!type){
		//console.log(type + ' is not a real type');
		data.offset = expectedOffset;
		return;
	}else if(types[type]){
		shape = types[type];
	}else if(!(type&255)){
		if(checkIt(cCheck,type)){
			data.offset = expectedOffset;
			return;
		}
		shape = {
			base:'line',
			z:checkIt(zCheck,type),
			m:checkIt(mCheck,type)
		};
	}else{
		data.offset = expectedOffset;
		return;
	}
	shape = types[type];
	var geometry = typeFuncs(shape);
	data.offset = expectedOffset;
	return geometry;
};

},{"long":24}],6:[function(require,module,exports){
var process=require("__browserify_process");var rows = require('./rows');
var util = require('./util');
var promise = require("liar");

function buffs(table,tablex){
	if(!process.browser){
		table = util.toArrayBuffer(table);
		tablex = util.toArrayBuffer(tablex);
	}
	return rows(table,tablex);
}
module.exports= function(){
	if(arguments.length === 2){
		return buffs(arguments[0],arguments[1]);
	}
	if(typeof arguments[0] === 'string' &&!process.browser){
		return promise.map(require('./nodeReader')(arguments[0]),function(v){
			return buffs(v[0],v[1]);
		});
	}
	if(process.browser&&arguments[0].toString()==="[object FileList]"){
		return promise.map(require('./browserReader')(arguments[0]),function(v){
			return buffs(v[0],v[1]);
		});
	}
};
},{"./browserReader":1,"./nodeReader":7,"./rows":8,"./util":10,"__browserify_process":12,"liar":13}],7:[function(require,module,exports){
var fs = require('fs');
var promise = require("liar");
var readDir = promise.denodify(fs.readdir);
var readFile = promise.denodify(fs.readFile);
module.exports = function(pathString){
	return promise(function(yes,no){
		readDir(pathString).then(function(filePaths){
			promise.map(filePaths.filter(function(filePath){
				return filePath.slice(-9) === ".gdbtable" && parseInt(filePath.slice(1, - 9), 16) > 8;
			}),function(filePath){
				return promise.map([pathString+'/'+filePath,pathString+'/'+filePath.slice(0,-1)+'x'],readFile);
			}).then(yes,no);
		},no);
	});
	
};
},{"fs":11,"liar":13}],8:[function(require,module,exports){
var convertDate = require('./date');
var parseGeometry = require('./geometry');
var Data = require('./dataType');
var parseFields = require('./fields');
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
		//console.log('len',len);
		while(i<len){
			str += String.fromCharCode.call(false,data.getUint8());
			i++;
		}
		//console.log('str',str);
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
	var fieldInfo = parseFields(buffer);
	var rowOffsets = tablex(bufferx);
	var out = rowOffsets.map(function(offset,i){
			//console.log('row',i);
			if(!offset){
				return null;
			}
			var len = (new DataView(buffer,offset,4)).getUint32(0,true);
			offset += 4;
			var data = new Data(buffer,offset,len);
			var flags=[];
			var nf = fieldInfo.nullableFields;
			var nullPlace = 0;
			var nullableThings = false;
			if(nf){
				nullableThings=true;
				while(nf>0){
					flags.push(data.getUint8());
					nf-=8;
				}
			}
			//console.log('flags',flags);
			var nullGeometry = false;
			var out ={};
			if(fieldInfo.geometry){
				out.type="Feature";
				out.properties={};
			}
			fieldInfo.fields.forEach(function(field,i){
				//console.log('title',field.title);
				var test;
				if(nullableThings){
					if(field.nullable){
						//console.log('nullPlace',nullPlace);
						test = (flags[nullPlace >> 3] & (1 << (nullPlace % 8)));
						nullPlace++;
						if(test!==0){
							return;
						}
					}
				}
				var row = dataTypes[field.type](data,field);
				//console.log('row',row);
				if(typeof row === 'undefined'){
					return;
				}
				if(fieldInfo.geometry){
					if(field.type === 7){
						if(row){
							out.geometry = row;
							if(out.geometry.bbox){
								out.bbox = out.geometry.bbox;
								delete out.geometry.bbox;
							}
							//console.log(row);
						}else{
							nullGeometry=true;
							return;
						}
					}else{
						out.properties[field.title]= row;
					}
				}else{
					out[field.title]= row;
				}
			});
			if(nullGeometry){
				return;
			}else{
				return out;
			}
			
		}).filter(function(row){
			return row;
		});
	if(fieldInfo.geometry){
		return {
			type:'FeatureCollection',
			features:out,
			bbox:fieldInfo.bbox
		};
	}else{
		return out;
	}
};



},{"./dataType":2,"./date":3,"./fields":4,"./geometry":5,"./tablex":9}],9:[function(require,module,exports){
module.exports = function (buffer){
	var data = new DataView(buffer);
	var offset = 8;
	var rows = [];
	var len = data.getUint32(offset,true);
	offset +=8;//yes 8
	var i = 0;
	while(i<len){
		rows[i++] = data.getUint32(offset,true);
		offset += 5;//yes 5
	}
	return rows;
};
},{}],10:[function(require,module,exports){
exports.toArrayBuffer = function (buffer) {
	var len = buffer.length;
	var view = new Uint8Array(new ArrayBuffer(len));
	var i = -1;
	while (++i<len) {
		view[i] = buffer[i];
	}
	return view.buffer;
};
},{}],11:[function(require,module,exports){

// not implemented
// The reason for having an empty file and not throwing is to allow
// untraditional implementation of this module.

},{}],12:[function(require,module,exports){
// shim for using process in browser

var process = module.exports = {};

process.nextTick = (function () {
    var canSetImmediate = typeof window !== 'undefined'
    && window.setImmediate;
    var canPost = typeof window !== 'undefined'
    && window.postMessage && window.addEventListener
    ;

    if (canSetImmediate) {
        return function (f) { return window.setImmediate(f) };
    }

    if (canPost) {
        var queue = [];
        window.addEventListener('message', function (ev) {
            if (ev.source === window && ev.data === 'process-tick') {
                ev.stopPropagation();
                if (queue.length > 0) {
                    var fn = queue.shift();
                    fn();
                }
            }
        }, true);

        return function nextTick(fn) {
            queue.push(fn);
            window.postMessage('process-tick', '*');
        };
    }

    return function nextTick(fn) {
        setTimeout(fn, 0);
    };
})();

process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];

process.binding = function (name) {
    throw new Error('process.binding is not supported');
}

// TODO(shtylman)
process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};

},{}],13:[function(require,module,exports){
var promise = require('lie');
promise.all = function(array) {
    return promise(function(fulfill, reject) {
        var len = array.length;
        var fulfilled = 0;
        var out = [];
        var onSuccess = function(n) {
            return function(v) {
                out[n] = v;
                if (++fulfilled === len) {
                    fulfill(out);
                }
            };
        };
        array.map(function(a) {
            if (a && typeof a.then === 'function') {
                return a;
            }
            else {
                return promise(function(yes) {
                    yes(a);
                });
            }
        }).forEach(function(v, i) {
            v.then(onSuccess(i), function(a) {
                reject(a);
            });
        });
    });
};
promise.some = function(array) {
    return promise(function(fulfill, reject) {
        var len = array.length;
        var rejected = 0;
        var out = [];

        function onFailure(n) {
            return function(v) {
                out[n] = v;
                if (++rejected === len) {
                    reject(out);
                }
            };
        }
        array.forEach(function(v, i) {
            v.then(function(a) {
                fulfill(a);
            }, onFailure(i));
        });
    });
};
promise.map = function(array, func) {
    if (Array.isArray(array)) {
        return promise.all(array.map(func));
    }
    else if (typeof array.then === 'function') {
        return array.then(function(a) {
            return promise.all(a.map(func));
        });
    }
};
promise.denodify = function(func) {
    return function() {
        var args = Array.prototype.concat.apply([], arguments);
        return promise(function(resolve, reject) {
            args.push(function(err, success) {
                if (err) {
                    reject(err);
                }
                else {
                    resolve(success);
                }
            });
            func.apply(undefined, args);
        });
    };
};
module.exports = promise;
},{"lie":14}],14:[function(require,module,exports){
var immediate = require('immediate');
// Creates a deferred: an object with a promise and corresponding resolve/reject methods
function Promise(resolver) {
     if (!(this instanceof Promise)) {
        return new Promise(resolver);
    }
    var sucessQueue = [];
    var failureQueue = [];
    var resolved = false;
    // The `handler` variable points to the function that will
    // 1) handle a .then(onFulfilled, onRejected) call
    // 2) handle a .resolve or .reject call (if not fulfilled)
    // Before 2), `handler` holds a queue of callbacks.
    // After 2), `handler` is a simple .then handler.
    // We use only one function to save memory and complexity.
     // Case 1) handle a .then(onFulfilled, onRejected) call
    function pending(onFulfilled, onRejected){
        return Promise(function(success,failure){
            if(typeof onFulfilled === 'function'){
                sucessQueue.push({
                    resolve: success,
                    reject: failure,
                    callback:onFulfilled
                });
            }else{
                sucessQueue.push({
                    next: success,
                    callback:false
                });
            }
            if(typeof onRejected === 'function'){
                failureQueue.push({
                    resolve: success,
                    reject: failure,
                    callback:onRejected
                });
            }else{
                failureQueue.push({
                    next: failure,
                    callback:false
                });
            }
        });
    }
    this.then = function(onFulfilled, onRejected) {
        return resolved?resolved(onFulfilled, onRejected):pending(onFulfilled, onRejected);
    };
    // Case 2) handle a .resolve or .reject call
        // (`onFulfilled` acts as a sentinel)
        // The actual function signature is
        // .re[ject|solve](sentinel, success, value)
    function resolve(success, value){
        if(resolved){
            return;
        }
        resolved = createHandler(this, value, success?0:1);
        var queue = success ? sucessQueue : failureQueue;
        var len = queue.length;
        var i = -1;
        while(++i < len) {
            if (queue[i].callback) {
                immediate(execute,queue[i].callback, value, queue[i].resolve, queue[i].reject);
            }else if(!queue[i].next){
                console.log(queue[i]);
            }else{
                queue[i].next(value);
            }
        }
        // Replace this handler with a simple resolved or rejected handler
    }
    var fulfill = resolve.bind(this,true);
    var reject = resolve.bind(this,false);
    try{
        resolver(function(a){
            if(a && typeof a.then==='function'){
                a.then(fulfill,reject);
            }else{
                fulfill(a);
            }
        },reject);
    }catch(e){
        reject(e);
    }
}

// Creates a fulfilled or rejected .then function
function createHandler(scope, value, success) {
    return function() {
        var callback = arguments[success];
        if (typeof callback !== 'function') {
            return scope;
        }
        return Promise(function(resolve,reject){
            immediate(execute,callback,value,resolve,reject);
       });
    };
}

// Executes the callback with the specified value,
// resolving or rejecting the deferred
function execute(callback, value, resolve, reject) {
        try {
            var result = callback(value);
            if (result && typeof result.then === 'function') {
                result.then(resolve, reject);
            }
            else {
                resolve(result);
            }
        }
        catch (error) {
            reject(error);
        }
}
module.exports = Promise;

},{"immediate":16}],15:[function(require,module,exports){
var global=typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {};module.exports = typeof global === "object" && global ? global : this;
},{}],16:[function(require,module,exports){
"use strict";
var types = [
    require("./nextTick"),
    require("./mutation"),
    require("./realSetImmediate"),
    require("./postMessage"),
    require("./messageChannel"),
    require("./stateChange"),
    require("./timeout")
];
var handlerQueue = [];

function drainQueue() {
    var i = 0,
        task,
        innerQueue = handlerQueue;
	handlerQueue = [];
	/*jslint boss: true */
	while (task = innerQueue[i++]) {
		task();
	}
}
var nextTick;
types.some(function (obj) {
    var t = obj.test();
    if (t) {
        nextTick = obj.install(drainQueue);
    }
    return t;
});
var retFunc = function (task) {
    var len, args;
    if (arguments.length > 1 && typeof task === "function") {
        args = Array.prototype.slice.call(arguments, 1);
        args.unshift(undefined);
        task = task.bind.apply(task, args);
    }
    if ((len = handlerQueue.push(task)) === 1) {
        nextTick(drainQueue);
    }
    return len;
};
retFunc.clear = function (n) {
    if (n <= handlerQueue.length) {
        handlerQueue[n - 1] = function () {};
    }
    return this;
};
module.exports = retFunc;

},{"./messageChannel":17,"./mutation":18,"./nextTick":19,"./postMessage":20,"./realSetImmediate":21,"./stateChange":22,"./timeout":23}],17:[function(require,module,exports){
"use strict";
var globe = require("./global");
exports.test = function () {
    return !!globe.MessageChannel;
};

exports.install = function (func) {
    var channel = new globe.MessageChannel();
    channel.port1.onmessage = func;
    return function () {
        channel.port2.postMessage(0);
    };
};
},{"./global":15}],18:[function(require,module,exports){
"use strict";
//based off rsvp
//https://github.com/tildeio/rsvp.js/blob/master/lib/rsvp/async.js
var globe = require("./global");

var MutationObserver = globe.MutationObserver || globe.WebKitMutationObserver;

exports.test = function () {
    return MutationObserver;
};

exports.install = function (handle) {
    var observer = new MutationObserver(handle);
    var element = globe.document.createElement("div");
    observer.observe(element, { attributes: true });

    // Chrome Memory Leak: https://bugs.webkit.org/show_bug.cgi?id=93661
    globe.addEventListener("unload", function () {
        observer.disconnect();
        observer = null;
    }, false);
    return function () {
        element.setAttribute("drainQueue", "drainQueue");
    };
};
},{"./global":15}],19:[function(require,module,exports){
var process=require("__browserify_process");"use strict";
exports.test = function () {
    // Don't get fooled by e.g. browserify environments.
    return typeof process === "object" && Object.prototype.toString.call(process) === "[object process]";
};

exports.install = function () {
    return process.nextTick;
};
},{"__browserify_process":12}],20:[function(require,module,exports){
"use strict";
var globe = require("./global");
exports.test = function () {
    // The test against `importScripts` prevents this implementation from being installed inside a web worker,
    // where `global.postMessage` means something completely different and can"t be used for this purpose.

    if (!globe.postMessage || globe.importScripts) {
        return false;
    }

    var postMessageIsAsynchronous = true;
    var oldOnMessage = globe.onmessage;
    globe.onmessage = function () {
        postMessageIsAsynchronous = false;
    };
    globe.postMessage("", "*");
    globe.onmessage = oldOnMessage;

    return postMessageIsAsynchronous;
};

exports.install = function (func) {
    var codeWord = "com.calvinmetcalf.setImmediate" + Math.random();
    function globalMessage(event) {
        if (event.source === globe && event.data === codeWord) {
            func();
        }
    }
    if (globe.addEventListener) {
        globe.addEventListener("message", globalMessage, false);
    } else {
        globe.attachEvent("onmessage", globalMessage);
    }
    return function () {
        globe.postMessage(codeWord, "*");
    };
};
},{"./global":15}],21:[function(require,module,exports){
"use strict";
var globe = require("./global");
exports.test = function () {
    return  globe.setImmediate;
};

exports.install = function (handle) {
    //return globe.setImmediate.bind(globe, handle);
    return globe.setTimeout.bind(globe,handle,0);
};

},{"./global":15}],22:[function(require,module,exports){
"use strict";
var globe = require("./global");
exports.test = function () {
    return "document" in globe && "onreadystatechange" in globe.document.createElement("script");
};

exports.install = function (handle) {
    return function () {

        // Create a <script> element; its readystatechange event will be fired asynchronously once it is inserted
        // into the document. Do so, thus queuing up the task. Remember to clean up once it's been called.
        var scriptEl = globe.document.createElement("script");
        scriptEl.onreadystatechange = function () {
            handle();

            scriptEl.onreadystatechange = null;
            scriptEl.parentNode.removeChild(scriptEl);
            scriptEl = null;
        };
        globe.document.documentElement.appendChild(scriptEl);

        return handle;
    };
};
},{"./global":15}],23:[function(require,module,exports){
"use strict";
exports.test = function () {
    return true;
};

exports.install = function (t) {
    return function () {
        setTimeout(t, 0);
    };
};
},{}],24:[function(require,module,exports){
/*
 Copyright 2013 Daniel Wirtz <dcode@dcode.io>
 Copyright 2009 The Closure Library Authors. All Rights Reserved.

 Licensed under the Apache License, Version 2.0 (the "License");
 you may not use this file except in compliance with the License.
 You may obtain a copy of the License at

 http://www.apache.org/licenses/LICENSE-2.0

 Unless required by applicable law or agreed to in writing, software
 distributed under the License is distributed on an "AS-IS" BASIS,
 WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 See the License for the specific language governing permissions and
 limitations under the License.
 */

/**
 * @license Long.js (c) 2013 Daniel Wirtz <dcode@dcode.io>
 * Released under the Apache License, Version 2.0
 * see: https://github.com/dcodeIO/Long.js for details
 * 
 * Long.js is based on goog.math.Long from the Closure Library.
 * Copyright 2009 The Closure Library Authors. All Rights Reserved.
 * Released under the Apache License, Version 2.0
 * see: https://code.google.com/p/closure-library/ for details
 */

/**
 * Defines a Long class for representing a 64-bit two's-complement
 * integer value, which faithfully simulates the behavior of a Java "long". This
 * implementation is derived from LongLib in GWT.
 */
(function(global) {

    /**
     * Constructs a 64-bit two's-complement integer, given its low and high 32-bit
     * values as *signed* integers.  See the from* functions below for more
     * convenient ways of constructing Longs.
     *
     * The internal representation of a long is the two given signed, 32-bit values.
     * We use 32-bit pieces because these are the size of integers on which
     * Javascript performs bit-operations.  For operations like addition and
     * multiplication, we split each number into 16-bit pieces, which can easily be
     * multiplied within Javascript's floating-point representation without overflow
     * or change in sign.
     *
     * In the algorithms below, we frequently reduce the negative case to the
     * positive case by negating the input(s) and then post-processing the result.
     * Note that we must ALWAYS check specially whether those values are MIN_VALUE
     * (-2^63) because -MIN_VALUE == MIN_VALUE (since 2^63 cannot be represented as
     * a positive number, it overflows back into a negative).  Not handling this
     * case would often result in infinite recursion.
     * 
     * @exports Long
     * @param {number} low The low (signed) 32 bits of the long.
     * @param {number} high The high (signed) 32 bits of the long.
     * @param {boolean=} unsigned Whether unsigned or not. Defaults to false (signed).
     * @constructor
     */
    var Long = function(low, high, unsigned) {
        
        /**
         * The low 32 bits as a signed value.
         * @type {number}
         * @expose
         */
        this.low = low | 0;

        /**
         * The high 32 bits as a signed value.
         * @type {number}
         * @expose
         */
        this.high = high | 0;

        /**
         * Whether unsigned or not.
         * @type {boolean}
         * @expose
         */
        this.unsigned = !!unsigned;
    };

    // NOTE: Common constant values ZERO, ONE, NEG_ONE, etc. are defined below the from* methods on which they depend.

    // NOTE: The following cache variables are used internally only and are therefore not exposed as properties of the
    // Long class.
    
    /**
     * A cache of the Long representations of small integer values.
     * @type {!Object}
     */
    var INT_CACHE = {};

    /**
     * A cache of the Long representations of small unsigned integer values.
     * @type {!Object}
     */
    var UINT_CACHE = {};

    /**
     * Returns a Long representing the given (32-bit) integer value.
     * @param {number} value The 32-bit integer in question.
     * @param {boolean=} unsigned Whether unsigned or not. Defaults to false (signed).
     * @return {!Long} The corresponding Long value.
     * @expose
     */
    Long.fromInt = function(value, unsigned) {
        if (!unsigned) {
            value = value | 0;
            if (-128 <= value && value < 128) {
                var cachedObj = INT_CACHE[value];
                if (cachedObj) return cachedObj;
            }
            var obj = new Long(value, value < 0 ? -1 : 0, false);
            if (-128 <= value && value < 128) {
                INT_CACHE[value] = obj;
            }
            return obj;
        } else {
            value = value >>> 0;
            if (0 <= value && value < 256) {
                var cachedObj = UINT_CACHE[value];
                if (cachedObj) return cachedObj;
            }
            var obj = new Long(value, (value | 0) < 0 ? -1 : 0, true);
            if (0 <= value && value < 256) {
                UINT_CACHE[value] = obj;
            }
            return obj;
        }
    };

    /**
     * Returns a Long representing the given value, provided that it is a finite
     * number.  Otherwise, zero is returned.
     * @param {number} value The number in question.
     * @param {boolean=} unsigned Whether unsigned or not. Defaults to false (signed).
     * @return {!Long} The corresponding Long value.
     * @expose
     */
    Long.fromNumber = function(value, unsigned) {
        unsigned = !!unsigned;
        if (isNaN(value) || !isFinite(value)) {
            return Long.ZERO;
        } else if (!unsigned && value <= -TWO_PWR_63_DBL) {
            return Long.MIN_SIGNED_VALUE;
        } else if (unsigned && value <= 0) {
            return Long.MIN_UNSIGNED_VALUE;
        } else if (!unsigned && value + 1 >= TWO_PWR_63_DBL) {
            return Long.MAX_SIGNED_VALUE;
        } else if (unsigned && value >= TWO_PWR_64_DBL) {
            return Long.MAX_UNSIGNED_VALUE;
        } else if (value < 0) {
            return Long.fromNumber(-value, false).negate();
        } else {
            return new Long((value % TWO_PWR_32_DBL) | 0, (value / TWO_PWR_32_DBL) | 0, unsigned);
        }
    };

    /**
     * Returns a Long representing the 64bit integer that comes by concatenating the given low and high bits. Each is
     *  assumed to use 32 bits.
     * @param {number} lowBits The low 32 bits.
     * @param {number} highBits The high 32 bits.
     * @param {boolean=} unsigned Whether unsigned or not. Defaults to false (signed).
     * @return {!Long} The corresponding Long value.
     * @expose
     */
    Long.fromBits = function(lowBits, highBits, unsigned) {
        return new Long(lowBits, highBits, unsigned);
    };

    /**
     * Returns a Long representing the 64bit integer that comes by concatenating the given low, middle and high bits.
     *  Each is assumed to use 28 bits.
     * @param {number} part0 The low 28 bits
     * @param {number} part1 The middle 28 bits
     * @param {number} part2 The high 28 (8) bits
     * @param {boolean=} unsigned Whether unsigned or not. Defaults to false (signed).
     * @return {!Long}
     * @expose
     */
    Long.from28Bits = function(part0, part1, part2, unsigned) {
        // 00000000000000000000000000001111 11111111111111111111111122222222 2222222222222
        // LLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLL HHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHH
        return Long.fromBits(part0 | (part1 << 28), (part1 >>> 4) | (part2) << 24, unsigned);
    };

    /**
     * Returns a Long representation of the given string, written using the given
     * radix.
     * @param {string} str The textual representation of the Long.
     * @param {(boolean|number)=} unsigned Whether unsigned or not. Defaults to false (signed).
     * @param {number=} radix The radix in which the text is written.
     * @return {!Long} The corresponding Long value.
     * @expose
     */
    Long.fromString = function(str, unsigned, radix) {
        if (str.length == 0) {
            throw(new Error('number format error: empty string'));
        }
        if (typeof unsigned == 'number') { // For goog.math.Long compatibility
            radix = unsigned;
            unsigned = false;
        }
        radix = radix || 10;
        if (radix < 2 || 36 < radix) {
            throw(new Error('radix out of range: ' + radix));
        }

        if (str.charAt(0) == '-') {
            return Long.fromString(str.substring(1), unsigned, radix).negate();
        } else if (str.indexOf('-') >= 0) {
            throw(new Error('number format error: interior "-" character: ' + str));
        }

        // Do several (8) digits each time through the loop, so as to
        // minimize the calls to the very expensive emulated div.
        var radixToPower = Long.fromNumber(Math.pow(radix, 8));

        var result = Long.ZERO;
        for (var i = 0; i < str.length; i += 8) {
            var size = Math.min(8, str.length - i);
            var value = parseInt(str.substring(i, i + size), radix);
            if (size < 8) {
                var power = Long.fromNumber(Math.pow(radix, size));
                result = result.multiply(power).add(Long.fromNumber(value));
            } else {
                result = result.multiply(radixToPower);
                result = result.add(Long.fromNumber(value));
            }
        }
        return result;
    };

    // NOTE: the compiler should inline these constant values below and then remove these variables, so there should be
    // no runtime penalty for these.
    
    // NOTE: The following constant values are used internally only and are therefore not exposed as properties of the
    // Long class.

    /**
     * @type {number}
     */
    var TWO_PWR_16_DBL = 1 << 16;

    /**
     * @type {number}
     */
    var TWO_PWR_24_DBL = 1 << 24;

    /**
     * @type {number}
     */
    var TWO_PWR_32_DBL = TWO_PWR_16_DBL * TWO_PWR_16_DBL;

    /**
     * @type {number}
     */
    var TWO_PWR_31_DBL = TWO_PWR_32_DBL / 2;

    /**
     * @type {number}
     */
    var TWO_PWR_48_DBL = TWO_PWR_32_DBL * TWO_PWR_16_DBL;

    /**
     * @type {number}
     */
    var TWO_PWR_64_DBL = TWO_PWR_32_DBL * TWO_PWR_32_DBL;

    /**
     * @type {number}
     */
    var TWO_PWR_63_DBL = TWO_PWR_64_DBL / 2;

    /**
     * @type {!Long}
     */
    var TWO_PWR_24 = Long.fromInt(1 << 24);

    /**
     * @type {!Long}
     * @expose
     */
    Long.ZERO = Long.fromInt(0);

    /**
     * @type {!Long}
     * @expose
     */
    Long.ONE = Long.fromInt(1);

    /**
     * @type {!Long}
     * @expose
     */
    Long.NEG_ONE = Long.fromInt(-1);

    /**
     * @type {!Long}
     * @expose
     */
    Long.MAX_SIGNED_VALUE = Long.fromBits(0xFFFFFFFF | 0, 0x7FFFFFFF | 0, false);

    /**
     * @type {!Long}
     * @expose
     */
    Long.MAX_UNSIGNED_VALUE = Long.fromBits(0xFFFFFFFF | 0, 0xFFFFFFFF | 0, true);

    /**
     * Alias of {@link Long.MAX_SIGNED_VALUE} for goog.math.Long compatibility.
     * @type {!Long}
     * @expose
     */
    Long.MAX_VALUE = Long.MAX_SIGNED_VALUE;

    /**
     * @type {!Long}
     * @expose
     */
    Long.MIN_SIGNED_VALUE = Long.fromBits(0, 0x80000000 | 0, false);

    /**
     * @type {!Long}
     * @expose
     */
    Long.MIN_UNSIGNED_VALUE = Long.fromBits(0, 0, true);

    /**
     * Alias of {@link Long.MIN_SIGNED_VALUE}  for goog.math.Long compatibility.
     * @type {!Long}
     * @expose
     */
    Long.MIN_VALUE = Long.MIN_SIGNED_VALUE;

    /**
     * @return {number} The value, assuming it is a 32-bit integer.
     * @expose
     */
    Long.prototype.toInt = function() {
        return this.unsigned ? this.low >>> 0 : this.low;
    };

    /**
     * @return {number} The closest floating-point representation to this value.
     * @expose
     */
    Long.prototype.toNumber = function() {
        if (this.unsigned) {
            return ((this.high >>> 0) * TWO_PWR_32_DBL) + (this.low >>> 0);
        }
        return this.high * TWO_PWR_32_DBL + (this.low >>> 0);
    };

    /**
     * @param {number=} radix The radix in which the text should be written.
     * @return {string} The textual representation of this value.
     * @override
     * @expose
     */
    Long.prototype.toString = function(radix) {
        radix = radix || 10;
        if (radix < 2 || 36 < radix) {
            throw(new Error('radix out of range: ' + radix));
        }
        if (this.isZero()) {
            return '0';
        }
        if (this.isNegative()) { // Unsigned Longs are never negative
            if (this.equals(Long.MIN_SIGNED_VALUE)) {
                // We need to change the Long value before it can be negated, so we remove
                // the bottom-most digit in this base and then recurse to do the rest.
                var radixLong = Long.fromNumber(radix);
                var div = this.div(radixLong);
                var rem = div.multiply(radixLong).subtract(this);
                return div.toString(radix) + rem.toInt().toString(radix);
            } else {
                return '-' + this.negate().toString(radix);
            }
        }

        // Do several (6) digits each time through the loop, so as to
        // minimize the calls to the very expensive emulated div.
        var radixToPower = Long.fromNumber(Math.pow(radix, 6));
        var rem = this;
        var result = '';
        while (true) {
            var remDiv = rem.div(radixToPower);
            var intval = rem.subtract(remDiv.multiply(radixToPower)).toInt();
            var digits = intval.toString(radix);
            rem = remDiv;
            if (rem.isZero()) {
                return digits + result;
            } else {
                while (digits.length < 6) {
                    digits = '0' + digits;
                }
                result = '' + digits + result;
            }
        }
    };

    /**
     * @return {number} The high 32 bits as a signed value.
     * @expose
     */
    Long.prototype.getHighBits = function() {
        return this.high;
    };

    /**
     * @return {number} The high 32 bits as an unsigned value.
     * @expose
     */
    Long.prototype.getHighBitsUnsigned = function() {
        return this.high >>> 0;
    };

    /**
     * @return {number} The low 32 bits as a signed value.
     * @expose
     */
    Long.prototype.getLowBits = function() {
        return this.low;
    };

    /**
     * @return {number} The low 32 bits as an unsigned value.
     * @expose
     */
    Long.prototype.getLowBitsUnsigned = function() {
        return this.low >>> 0;
    };

    /**
     * @return {number} Returns the number of bits needed to represent the absolute
     *     value of this Long.
     * @expose
     */
    Long.prototype.getNumBitsAbs = function() {
        if (this.isNegative()) { // Unsigned Longs are never negative
            if (this.equals(Long.MIN_SIGNED_VALUE)) {
                return 64;
            } else {
                return this.negate().getNumBitsAbs();
            }
        } else {
            var val = this.high != 0 ? this.high : this.low;
            for (var bit = 31; bit > 0; bit--) {
                if ((val & (1 << bit)) != 0) {
                    break;
                }
            }
            return this.high != 0 ? bit + 33 : bit + 1;
        }
    };

    /**
     * @return {boolean} Whether this value is zero.
     * @expose
     */
    Long.prototype.isZero = function() {
        return this.high == 0 && this.low == 0;
    };

    /**
     * @return {boolean} Whether this value is negative.
     * @expose
     */
    Long.prototype.isNegative = function() {
        return !this.unsigned && this.high < 0;
    };

    /**
     * @return {boolean} Whether this value is odd.
     * @expose
     */
    Long.prototype.isOdd = function() {
        return (this.low & 1) == 1;
    };

    /**
     * @return {boolean} Whether this value is even.
     */
    Long.prototype.isEven = function() {
        return (this.low & 1) == 0;
    };

    /**
     * @param {Long} other Long to compare against.
     * @return {boolean} Whether this Long equals the other.
     * @expose
     */
    Long.prototype.equals = function(other) {
        if (this.unsigned != other.unsigned && (this.high >>> 31) != (other.high >>> 31)) return false;
        return (this.high == other.high) && (this.low == other.low);
    };

    /**
     * @param {Long} other Long to compare against.
     * @return {boolean} Whether this Long does not equal the other.
     * @expose
     */
    Long.prototype.notEquals = function(other) {
        return !this.equals(other);
    };

    /**
     * @param {Long} other Long to compare against.
     * @return {boolean} Whether this Long is less than the other.
     * @expose
     */
    Long.prototype.lessThan = function(other) {
        return this.compare(other) < 0;
    };

    /**
     * @param {Long} other Long to compare against.
     * @return {boolean} Whether this Long is less than or equal to the other.
     * @expose
     */
    Long.prototype.lessThanOrEqual = function(other) {
        return this.compare(other) <= 0;
    };

    /**
     * @param {Long} other Long to compare against.
     * @return {boolean} Whether this Long is greater than the other.
     * @expose
     */
    Long.prototype.greaterThan = function(other) {
        return this.compare(other) > 0;
    };

    /**
     * @param {Long} other Long to compare against.
     * @return {boolean} Whether this Long is greater than or equal to the other.
     * @expose
     */
    Long.prototype.greaterThanOrEqual = function(other) {
        return this.compare(other) >= 0;
    };

    /**
     * Compares this Long with the given one.
     * @param {Long} other Long to compare against.
     * @return {number} 0 if they are the same, 1 if the this is greater, and -1
     *     if the given one is greater.
     * @expose
     */
    Long.prototype.compare = function(other) {
        if (this.equals(other)) {
            return 0;
        }
        var thisNeg = this.isNegative();
        var otherNeg = other.isNegative();
        if (thisNeg && !otherNeg) return -1;
        if (!thisNeg && otherNeg) return 1;
        if (!this.unsigned) {
            // At this point the signs are the same
            return this.subtract(other).isNegative() ? -1 : 1;
        } else {
            // Both are positive if at least one is unsigned
            return (other.high >>> 0) > (this.high >>> 0) || (other.high == this.high && (other.low >>> 0) > (this.low >>> 0)) ? -1 : 1;
        }
    };

    /**
     * @return {!Long} The negation of this value.
     * @expose
     */
    Long.prototype.negate = function() {
        if (!this.unsigned && this.equals(Long.MIN_SIGNED_VALUE)) {
            return Long.MIN_SIGNED_VALUE;
        }
        return this.not().add(Long.ONE);
    };

    /**
     * Returns the sum of this and the given Long.
     * @param {Long} other Long to add to this one.
     * @return {!Long} The sum of this and the given Long.
     * @expose
     */
    Long.prototype.add = function(other) {
        // Divide each number into 4 chunks of 16 bits, and then sum the chunks.
        
        var a48 = this.high >>> 16;
        var a32 = this.high & 0xFFFF;
        var a16 = this.low >>> 16;
        var a00 = this.low & 0xFFFF;

        var b48 = other.high >>> 16;
        var b32 = other.high & 0xFFFF;
        var b16 = other.low >>> 16;
        var b00 = other.low & 0xFFFF;

        var c48 = 0, c32 = 0, c16 = 0, c00 = 0;
        c00 += a00 + b00;
        c16 += c00 >>> 16;
        c00 &= 0xFFFF;
        c16 += a16 + b16;
        c32 += c16 >>> 16;
        c16 &= 0xFFFF;
        c32 += a32 + b32;
        c48 += c32 >>> 16;
        c32 &= 0xFFFF;
        c48 += a48 + b48;
        c48 &= 0xFFFF;
        return Long.fromBits((c16 << 16) | c00, (c48 << 16) | c32, this.unsigned);
    };

    /**
     * Returns the difference of this and the given Long.
     * @param {Long} other Long to subtract from this.
     * @return {!Long} The difference of this and the given Long.
     * @expose
     */
    Long.prototype.subtract = function(other) {
        return this.add(other.negate());
    };

    /**
     * Returns the product of this and the given long.
     * @param {Long} other Long to multiply with this.
     * @return {!Long} The product of this and the other.
     * @expose
     */
    Long.prototype.multiply = function(other) {
        if (this.isZero()) {
            return Long.ZERO;
        } else if (other.isZero()) {
            return Long.ZERO;
        }

        if (this.equals(Long.MIN_VALUE)) {
            return other.isOdd() ? Long.MIN_VALUE : Long.ZERO;
        } else if (other.equals(Long.MIN_VALUE)) {
            return this.isOdd() ? Long.MIN_VALUE : Long.ZERO;
        }

        if (this.isNegative()) {
            if (other.isNegative()) {
                return this.negate().multiply(other.negate());
            } else {
                return this.negate().multiply(other).negate();
            }
        } else if (other.isNegative()) {
            return this.multiply(other.negate()).negate();
        }
        // If both longs are small, use float multiplication
        if (this.lessThan(TWO_PWR_24) &&
            other.lessThan(TWO_PWR_24)) {
            return Long.fromNumber(this.toNumber() * other.toNumber(), this.unsigned);
        }

        // Divide each long into 4 chunks of 16 bits, and then add up 4x4 products.
        // We can skip products that would overflow.
        
        var a48 = this.high >>> 16;
        var a32 = this.high & 0xFFFF;
        var a16 = this.low >>> 16;
        var a00 = this.low & 0xFFFF;

        var b48 = other.high >>> 16;
        var b32 = other.high & 0xFFFF;
        var b16 = other.low >>> 16;
        var b00 = other.low & 0xFFFF;

        var c48 = 0, c32 = 0, c16 = 0, c00 = 0;
        c00 += a00 * b00;
        c16 += c00 >>> 16;
        c00 &= 0xFFFF;
        c16 += a16 * b00;
        c32 += c16 >>> 16;
        c16 &= 0xFFFF;
        c16 += a00 * b16;
        c32 += c16 >>> 16;
        c16 &= 0xFFFF;
        c32 += a32 * b00;
        c48 += c32 >>> 16;
        c32 &= 0xFFFF;
        c32 += a16 * b16;
        c48 += c32 >>> 16;
        c32 &= 0xFFFF;
        c32 += a00 * b32;
        c48 += c32 >>> 16;
        c32 &= 0xFFFF;
        c48 += a48 * b00 + a32 * b16 + a16 * b32 + a00 * b48;
        c48 &= 0xFFFF;
        return Long.fromBits((c16 << 16) | c00, (c48 << 16) | c32, this.unsigned);
    };

    /**
     * Returns this Long divided by the given one.
     * @param {Long} other Long by which to divide.
     * @return {!Long} This Long divided by the given one.
     * @expose
     */
    Long.prototype.div = function(other) {
        if (other.isZero()) {
            throw(new Error('division by zero'));
        } else if (this.isZero()) {
            return Long.ZERO;
        }
        if (this.equals(Long.MIN_SIGNED_VALUE)) {
            if (other.equals(Long.ONE) || other.equals(Long.NEG_ONE)) {
                return min;  // recall that -MIN_VALUE == MIN_VALUE
            } else if (other.equals(Long.MIN_VALUE)) {
                return Long.ONE;
            } else {
                // At this point, we have |other| >= 2, so |this/other| < |MIN_VALUE|.
                var halfThis = this.shiftRight(1);
                var approx = halfThis.div(other).shiftLeft(1);
                if (approx.equals(Long.ZERO)) {
                    return other.isNegative() ? Long.ONE : Long.NEG_ONE;
                } else {
                    var rem = this.subtract(other.multiply(approx));
                    var result = approx.add(rem.div(other));
                    return result;
                }
            }
        } else if (other.equals(Long.MIN_VALUE)) {
            return Long.ZERO;
        }
        if (this.isNegative()) {
            if (other.isNegative()) {
                return this.negate().div(other.negate());
            } else {
                return this.negate().div(other).negate();
            }
        } else if (other.isNegative()) {
            return this.div(other.negate()).negate();
        }

        // Repeat the following until the remainder is less than other:  find a
        // floating-point that approximates remainder / other *from below*, add this
        // into the result, and subtract it from the remainder.  It is critical that
        // the approximate value is less than or equal to the real value so that the
        // remainder never becomes negative.
        var res = Long.ZERO;
        var rem = this;
        while (rem.greaterThanOrEqual(other)) {
            // Approximate the result of division. This may be a little greater or
            // smaller than the actual value.
            var approx = Math.max(1, Math.floor(rem.toNumber() / other.toNumber()));

            // We will tweak the approximate result by changing it in the 48-th digit or
            // the smallest non-fractional digit, whichever is larger.
            var log2 = Math.ceil(Math.log(approx) / Math.LN2);
            var delta = (log2 <= 48) ? 1 : Math.pow(2, log2 - 48);

            // Decrease the approximation until it is smaller than the remainder.  Note
            // that if it is too large, the product overflows and is negative.
            var approxRes = Long.fromNumber(approx, this.unsigned);
            var approxRem = approxRes.multiply(other);
            while (approxRem.isNegative() || approxRem.greaterThan(rem)) {
                approx -= delta;
                approxRes = Long.fromNumber(approx, this.unsigned);
                approxRem = approxRes.multiply(other);
            }

            // We know the answer can't be zero... and actually, zero would cause
            // infinite recursion since we would make no progress.
            if (approxRes.isZero()) {
                approxRes = Long.ONE;
            }

            res = res.add(approxRes);
            rem = rem.subtract(approxRem);
        }
        return res;
    };

    /**
     * Returns this Long modulo the given one.
     * @param {Long} other Long by which to mod.
     * @return {!Long} This Long modulo the given one.
     * @expose
     */
    Long.prototype.modulo = function(other) {
        return this.subtract(this.div(other).multiply(other));
    };

    /**
     * @return {!Long} The bitwise-NOT of this value.
     * @expose
     */
    Long.prototype.not = function() {
        return Long.fromBits(~this.low, ~this.high, this.unsigned);
    };

    /**
     * Returns the bitwise-AND of this Long and the given one.
     * @param {Long} other The Long with which to AND.
     * @return {!Long} The bitwise-AND of this and the other.
     * @expose
     */
    Long.prototype.and = function(other) {
        return Long.fromBits(this.low & other.low, this.high & other.high, this.unsigned);
    };

    /**
     * Returns the bitwise-OR of this Long and the given one.
     * @param {Long} other The Long with which to OR.
     * @return {!Long} The bitwise-OR of this and the other.
     * @expose
     */
    Long.prototype.or = function(other) {
        return Long.fromBits(this.low | other.low, this.high | other.high, this.unsigned);
    };

    /**
     * Returns the bitwise-XOR of this Long and the given one.
     * @param {Long} other The Long with which to XOR.
     * @return {!Long} The bitwise-XOR of this and the other.
     * @expose
     */
    Long.prototype.xor = function(other) {
        return Long.fromBits(this.low ^ other.low, this.high ^ other.high, this.unsigned);
    };

    /**
     * Returns this Long with bits shifted to the left by the given amount.
     * @param {number} numBits The number of bits by which to shift.
     * @return {!Long} This shifted to the left by the given amount.
     * @expose
     */
    Long.prototype.shiftLeft = function(numBits) {
        numBits &= 63;
        if (numBits == 0) {
            return this;
        } else {
            var low = this.low;
            if (numBits < 32) {
                var high = this.high;
                return Long.fromBits(low << numBits, (high << numBits) | (low >>> (32 - numBits)), this.unsigned);
            } else {
                return Long.fromBits(0, low << (numBits - 32), this.unsigned);
            }
        }
    };

    /**
     * Returns this Long with bits shifted to the right by the given amount.
     * @param {number} numBits The number of bits by which to shift.
     * @return {!Long} This shifted to the right by the given amount.
     * @expose
     */
    Long.prototype.shiftRight = function(numBits) {
        numBits &= 63;
        if (numBits == 0) {
            return this;
        } else {
            var high = this.high;
            if (numBits < 32) {
                var low = this.low;
                return Long.fromBits((low >>> numBits) | (high << (32 - numBits)), high >> numBits, this.unsigned);
            } else {
                return Long.fromBits(high >> (numBits - 32), high >= 0 ? 0 : -1, this.unsigned);
            }
        }
    };

    /**
     * Returns this Long with bits shifted to the right by the given amount, with
     * the new top bits matching the current sign bit.
     * @param {number} numBits The number of bits by which to shift.
     * @return {!Long} This shifted to the right by the given amount, with
     *     zeros placed into the new leading bits.
     * @expose
     */
    Long.prototype.shiftRightUnsigned = function(numBits) {
        numBits &= 63;
        if (numBits == 0) {
            return this;
        } else {
            var high = this.high;
            if (numBits < 32) {
                var low = this.low;
                return Long.fromBits((low >>> numBits) | (high << (32 - numBits)), high >>> numBits, this.unsigned);
            } else if (numBits == 32) {
                return Long.fromBits(high, 0, this.unsigned);
            } else {
                return Long.fromBits(high >>> (numBits - 32), 0, this.unsigned);
            }
        }
    };

    /**
     * @return {!Long} Signed long
     * @expose
     */
    Long.prototype.toSigned = function() {
        var l = this.clone();
        l.unsigned = false;
        return l;
    };

    /**
     * @return {!Long} Unsigned long
     * @expose
     */
    Long.prototype.toUnsigned = function() {
        var l = this.clone();
        l.unsigned = true;
        return l;
    };
    
    /**
     * @return {Long} Cloned instance with the same low/high bits and unsigned flag.
     * @expose
     */
    Long.prototype.clone = function() {
        return new Long(this.low, this.high, this.unsigned);
    };

    // Enable module loading if available
    if (typeof module != 'undefined' && module["exports"]) { // CommonJS
        module["exports"] = Long;
    } else if (typeof define != 'undefined' && define["amd"]) { // AMD
        define("Math/Long", [], function() { return Long; });
    } else { // Shim
        if (!global["dcodeIO"]) {
            global["dcodeIO"] = {};
        }
        global["dcodeIO"]["Long"] = Long;
    }

})(this);

},{}],25:[function(require,module,exports){
var mgrs = require('./mgrs');

function Point(x, y, z) {
  if (!(this instanceof Point)) {
    return new Point(x, y, z);
  }
  if (typeof x === 'object') {
    this.x = x[0];
    this.y = x[1];
    this.z = x[2] || 0.0;
  }
  else if (typeof x === 'string' && typeof y === 'undefined') {
    var coords = x.split(',');
    this.x = parseFloat(coords[0]);
    this.y = parseFloat(coords[1]);
    this.z = parseFloat(coords[2]) || 0.0;
  }
  else {
    this.x = x;
    this.y = y;
    this.z = z || 0.0;
  }
  this.clone = function() {
    return new Point(this.x, this.y, this.z);
  };
  this.toString = function() {
    return ("x=" + this.x + ",y=" + this.y);
  };
  /** 
   * APIMethod: toShortString
   * Return a short string version of the point.
   *
   * Return:
   * {String} Shortened String representation of ..Point object. 
   *         (ex. <i>"5, 42"</i>)
   */
  this.toShortString = function() {
    return (this.x + ", " + this.y);
  };
}

Point.fromMGRS = function(mgrsStr) {
  var llbbox = mgrs.inverse(mgrsStr);
  return new Point((llbbox[2] + llbbox[0]) / 2, (llbbox[3] + llbbox[1]) / 2);
};
Point.prototype.toMGRS = function(accuracy) {
  return mgrs.forward({
    lon: this.x,
    lat: this.y
  }, accuracy);
};
module.exports = Point;
},{"./mgrs":41}],26:[function(require,module,exports){
var extend = require('./extend');
var common = require('./common');
var defs = require('./defs');
var constants = require('./constants/index');
var datum = require('./datum');
var projections = require('./projections/index');
var wkt = require('./wkt');
var projStr = require('./projString');

function proj(srsCode) {
  if (!(this instanceof proj)) {
    return new proj(srsCode);
  }
  this.srsCodeInput = srsCode;
  this.x0 = 0;
  this.y0 = 0;
  var obj;
  if (typeof srsCode === 'string') {
    //check to see if this is a WKT string
    if (srsCode in defs) {
      this.deriveConstants(defs[srsCode]);
      extend(this, defs[srsCode]);
    }
    else if ((srsCode.indexOf('GEOGCS') >= 0) || (srsCode.indexOf('GEOCCS') >= 0) || (srsCode.indexOf('PROJCS') >= 0) || (srsCode.indexOf('LOCAL_CS') >= 0)) {
      obj = wkt(srsCode);
      this.deriveConstants(obj);
      extend(this, obj);
      //this.loadProjCode(this.projName);
    }
    else if (srsCode[0] === '+') {
      obj = projStr(srsCode);
      this.deriveConstants(obj);
      extend(this, obj);
    }
  }
  else {
    this.deriveConstants(srsCode);
    extend(this, srsCode);
  }

  this.initTransforms(this.projName);
}
proj.projections = projections;
proj.projections.start();
proj.prototype = {
  /**
   * Function: initTransforms
   *    Finalize the initialization of the Proj object
   *
   */
  initTransforms: function(projName) {
    var ourProj = proj.projections.get(projName);
    if (ourProj) {
      extend(this, ourProj);
      this.init();
    }
    else {
      throw ("unknown projection " + projName);
    }
  },

  deriveConstants: function(self) {
    // DGR 2011-03-20 : nagrids -> nadgrids
    if (self.nadgrids && self.nadgrids.length === 0) {
      self.nadgrids = null;
    }
    if (self.nadgrids) {
      self.grids = self.nadgrids.split(",");
      var g = null,
        l = self.grids.length;
      if (l > 0) {
        for (var i = 0; i < l; i++) {
          g = self.grids[i];
          var fg = g.split("@");
          if (fg[fg.length - 1] === "") {
            //..reportError("nadgrids syntax error '" + self.nadgrids + "' : empty grid found");
            continue;
          }
          self.grids[i] = {
            mandatory: fg.length === 1, //@=> optional grid (no error if not found)
            name: fg[fg.length - 1],
            grid: constants.grids[fg[fg.length - 1]] //FIXME: grids loading ...
          };
          if (self.grids[i].mandatory && !self.grids[i].grid) {
            //..reportError("Missing '" + self.grids[i].name + "'");
          }
        }
      }
      // DGR, 2011-03-20: grids is an array of objects that hold
      // the loaded grids, its name and the mandatory informations of it.
    }
    if (self.datumCode && self.datumCode !== 'none') {
      var datumDef = constants.Datum[self.datumCode];
      if (datumDef) {
        self.datum_params = datumDef.towgs84 ? datumDef.towgs84.split(',') : null;
        self.ellps = datumDef.ellipse;
        self.datumName = datumDef.datumName ? datumDef.datumName : self.datumCode;
      }
    }
    if (!self.a) { // do we have an ellipsoid?
      var ellipse = constants.Ellipsoid[self.ellps] ? constants.Ellipsoid[self.ellps] : constants.Ellipsoid.WGS84;
      extend(self, ellipse);
    }
    if (self.rf && !self.b) {
      self.b = (1.0 - 1.0 / self.rf) * self.a;
    }
    if (self.rf === 0 || Math.abs(self.a - self.b) < common.EPSLN) {
      self.sphere = true;
      self.b = self.a;
    }
    self.a2 = self.a * self.a; // used in geocentric
    self.b2 = self.b * self.b; // used in geocentric
    self.es = (self.a2 - self.b2) / self.a2; // e ^ 2
    self.e = Math.sqrt(self.es); // eccentricity
    if (self.R_A) {
      self.a *= 1 - self.es * (common.SIXTH + self.es * (common.RA4 + self.es * common.RA6));
      self.a2 = self.a * self.a;
      self.b2 = self.b * self.b;
      self.es = 0;
    }
    self.ep2 = (self.a2 - self.b2) / self.b2; // used in geocentric
    if (!self.k0) {
      self.k0 = 1.0; //default value
    }
    //DGR 2010-11-12: axis
    if (!self.axis) {
      self.axis = "enu";
    }

    self.datum = datum(self);
  }
};
module.exports = proj;

},{"./common":28,"./constants/index":33,"./datum":35,"./defs":37,"./extend":38,"./projString":42,"./projections/index":51,"./wkt":71}],27:[function(require,module,exports){
module.exports = function(crs, denorm, point) {
  var xin = point.x,
    yin = point.y,
    zin = point.z || 0.0;
  var v, t, i;
  for (i = 0; i < 3; i++) {
    if (denorm && i === 2 && point.z === undefined) {
      continue;
    }
    if (i === 0) {
      v = xin;
      t = 'x';
    }
    else if (i === 1) {
      v = yin;
      t = 'y';
    }
    else {
      v = zin;
      t = 'z';
    }
    switch (crs.axis[i]) {
    case 'e':
      point[t] = v;
      break;
    case 'w':
      point[t] = -v;
      break;
    case 'n':
      point[t] = v;
      break;
    case 's':
      point[t] = -v;
      break;
    case 'u':
      if (point[t] !== undefined) {
        point.z = v;
      }
      break;
    case 'd':
      if (point[t] !== undefined) {
        point.z = -v;
      }
      break;
    default:
      //console.log("ERROR: unknow axis ("+crs.axis[i]+") - check definition of "+crs.projName);
      return null;
    }
  }
  return point;
};

},{}],28:[function(require,module,exports){
exports.PI = 3.141592653589793238; //Math.PI;
exports.HALF_PI = 1.570796326794896619; //Math.PI*0.5;
exports.TWO_PI = 6.283185307179586477; //Math.PI*2;
exports.FORTPI = 0.78539816339744833;
exports.R2D = 57.29577951308232088;
exports.D2R = 0.01745329251994329577;
exports.SEC_TO_RAD = 4.84813681109535993589914102357e-6;
/* SEC_TO_RAD = Pi/180/3600 */
exports.EPSLN = 1.0e-10;
exports.MAX_ITER = 20;
// following constants from geocent.c
exports.COS_67P5 = 0.38268343236508977;
/* cosine of 67.5 degrees */
exports.AD_C = 1.0026000;
/* Toms region 1 constant */

/* datum_type values */
exports.PJD_UNKNOWN = 0;
exports.PJD_3PARAM = 1;
exports.PJD_7PARAM = 2;
exports.PJD_GRIDSHIFT = 3;
exports.PJD_WGS84 = 4; // WGS84 or equivalent
exports.PJD_NODATUM = 5; // WGS84 or equivalent
exports.SRS_WGS84_SEMIMAJOR = 6378137; // only used in grid shift transforms
exports.SRS_WGS84_ESQUARED = 0.006694379990141316; //DGR: 2012-07-29

// ellipoid pj_set_ell.c
exports.SIXTH = 0.1666666666666666667;
/* 1/6 */
exports.RA4 = 0.04722222222222222222;
/* 17/360 */
exports.RA6 = 0.02215608465608465608;
/* 67/3024 */
exports.RV4 = 0.06944444444444444444;
/* 5/72 */
exports.RV6 = 0.04243827160493827160;
/* 55/1296 */

// Function to compute the constant small m which is the radius of
//   a parallel of latitude; phi; divided by the semimajor axis.
// -----------------------------------------------------------------
exports.msfnz = function(eccent, sinphi, cosphi) {
  var con = eccent * sinphi;
  return cosphi / (Math.sqrt(1 - con * con));
};

// Function to compute the constant small t for use in the forward
//   computations in the Lambert Conformal Conic and the Polar
//   Stereographic projections.
// -----------------------------------------------------------------
exports.tsfnz = function(eccent, phi, sinphi) {
  var con = eccent * sinphi;
  var com = 0.5 * eccent;
  con = Math.pow(((1 - con) / (1 + con)), com);
  return (Math.tan(0.5 * (this.HALF_PI - phi)) / con);
};

// Function to compute the latitude angle; phi2; for the inverse of the
//   Lambert Conformal Conic and Polar Stereographic projections.
// ----------------------------------------------------------------
exports.phi2z = function(eccent, ts) {
  var eccnth = 0.5 * eccent;
  var con, dphi;
  var phi = this.HALF_PI - 2 * Math.atan(ts);
  for (var i = 0; i <= 15; i++) {
    con = eccent * Math.sin(phi);
    dphi = this.HALF_PI - 2 * Math.atan(ts * (Math.pow(((1 - con) / (1 + con)), eccnth))) - phi;
    phi += dphi;
    if (Math.abs(dphi) <= 0.0000000001) {
      return phi;
    }
  }
  //console.log("phi2z has NoConvergence");
  return -9999;
};

/* Function to compute constant small q which is the radius of a 
   parallel of latitude, phi, divided by the semimajor axis. 
------------------------------------------------------------*/
exports.qsfnz = function(eccent, sinphi) {
  var con;
  if (eccent > 1.0e-7) {
    con = eccent * sinphi;
    return ((1 - eccent * eccent) * (sinphi / (1 - con * con) - (0.5 / eccent) * Math.log((1 - con) / (1 + con))));
  }
  else {
    return (2 * sinphi);
  }
};

/* Function to compute the inverse of qsfnz
------------------------------------------------------------*/
exports.iqsfnz = function(eccent, q) {
  var temp = 1 - (1 - eccent * eccent) / (2 * eccent) * Math.log((1 - eccent) / (1 + eccent));
  if (Math.abs(Math.abs(q) - temp) < 1.0E-6) {
    if (q < 0) {
      return (-1 * exports.HALF_PI);
    }
    else {
      return exports.HALF_PI;
    }
  }
  //var phi = 0.5* q/(1-eccent*eccent);
  var phi = Math.asin(0.5 * q);
  var dphi;
  var sin_phi;
  var cos_phi;
  var con;
  for (var i = 0; i < 30; i++) {
    sin_phi = Math.sin(phi);
    cos_phi = Math.cos(phi);
    con = eccent * sin_phi;
    dphi = Math.pow(1 - con * con, 2) / (2 * cos_phi) * (q / (1 - eccent * eccent) - sin_phi / (1 - con * con) + 0.5 / eccent * Math.log((1 - con) / (1 + con)));
    phi += dphi;
    if (Math.abs(dphi) <= 0.0000000001) {
      return phi;
    }
  }

  //console.log("IQSFN-CONV:Latitude failed to converge after 30 iterations");
  return NaN;
};

/* Function to eliminate roundoff errors in asin
----------------------------------------------*/
exports.asinz = function(x) {
  if (Math.abs(x) > 1) {
    x = (x > 1) ? 1 : -1;
  }
  return Math.asin(x);
};

// following functions from gctpc cproj.c for transverse mercator projections
exports.e0fn = function(x) {
  return (1 - 0.25 * x * (1 + x / 16 * (3 + 1.25 * x)));
};
exports.e1fn = function(x) {
  return (0.375 * x * (1 + 0.25 * x * (1 + 0.46875 * x)));
};
exports.e2fn = function(x) {
  return (0.05859375 * x * x * (1 + 0.75 * x));
};
exports.e3fn = function(x) {
  return (x * x * x * (35 / 3072));
};
exports.mlfn = function(e0, e1, e2, e3, phi) {
  return (e0 * phi - e1 * Math.sin(2 * phi) + e2 * Math.sin(4 * phi) - e3 * Math.sin(6 * phi));
};
exports.imlfn = function(ml, e0, e1, e2, e3) {
  var phi;
  var dphi;

  phi = ml / e0;
  for (var i = 0; i < 15; i++) {
    dphi = (ml - (e0 * phi - e1 * Math.sin(2 * phi) + e2 * Math.sin(4 * phi) - e3 * Math.sin(6 * phi))) / (e0 - 2 * e1 * Math.cos(2 * phi) + 4 * e2 * Math.cos(4 * phi) - 6 * e3 * Math.cos(6 * phi));
    phi += dphi;
    if (Math.abs(dphi) <= 0.0000000001) {
      return phi;
    }
  }

  //..reportError("IMLFN-CONV:Latitude failed to converge after 15 iterations");
  return NaN;
};

exports.srat = function(esinp, exp) {
  return (Math.pow((1 - esinp) / (1 + esinp), exp));
};

// Function to return the sign of an argument
exports.sign = function(x) {
  if (x < 0) {
    return (-1);
  }
  else {
    return (1);
  }
};

// Function to adjust longitude to -180 to 180; input in radians
exports.adjust_lon = function(x) {
  x = (Math.abs(x) < this.PI) ? x : (x - (this.sign(x) * this.TWO_PI));
  return x;
};

// IGNF - DGR : algorithms used by IGN France

// Function to adjust latitude to -90 to 90; input in radians
exports.adjust_lat = function(x) {
  x = (Math.abs(x) < this.HALF_PI) ? x : (x - (this.sign(x) * this.PI));
  return x;
};

// Latitude Isometrique - close to tsfnz ...
exports.latiso = function(eccent, phi, sinphi) {
  if (Math.abs(phi) > this.HALF_PI) {
    return Number.NaN;
  }
  if (phi === this.HALF_PI) {
    return Number.POSITIVE_INFINITY;
  }
  if (phi === -1 * this.HALF_PI) {
    return Number.NEGATIVE_INFINITY;
  }

  var con = eccent * sinphi;
  return Math.log(Math.tan((this.HALF_PI + phi) / 2)) + eccent * Math.log((1 - con) / (1 + con)) / 2;
};

exports.fL = function(x, L) {
  return 2 * Math.atan(x * Math.exp(L)) - this.HALF_PI;
};

// Inverse Latitude Isometrique - close to ph2z
exports.invlatiso = function(eccent, ts) {
  var phi = this.fL(1, ts);
  var Iphi = 0;
  var con = 0;
  do {
    Iphi = phi;
    con = eccent * Math.sin(Iphi);
    phi = this.fL(Math.exp(eccent * Math.log((1 + con) / (1 - con)) / 2), ts);
  } while (Math.abs(phi - Iphi) > 1.0e-12);
  return phi;
};

// Needed for Gauss Schreiber
// Original:  Denis Makarov (info@binarythings.com)
// Web Site:  http://www.binarythings.com
exports.sinh = function(x) {
  var r = Math.exp(x);
  r = (r - 1 / r) / 2;
  return r;
};

exports.cosh = function(x) {
  var r = Math.exp(x);
  r = (r + 1 / r) / 2;
  return r;
};

exports.tanh = function(x) {
  var r = Math.exp(x);
  r = (r - 1 / r) / (r + 1 / r);
  return r;
};

exports.asinh = function(x) {
  var s = (x >= 0 ? 1 : -1);
  return s * (Math.log(Math.abs(x) + Math.sqrt(x * x + 1)));
};

exports.acosh = function(x) {
  return 2 * Math.log(Math.sqrt((x + 1) / 2) + Math.sqrt((x - 1) / 2));
};

exports.atanh = function(x) {
  return Math.log((x - 1) / (x + 1)) / 2;
};

// Grande Normale
exports.gN = function(a, e, sinphi) {
  var temp = e * sinphi;
  return a / Math.sqrt(1 - temp * temp);
};

//code from the PROJ.4 pj_mlfn.c file;  this may be useful for other projections
exports.pj_enfn = function(es) {
  var en = [];
  en[0] = this.C00 - es * (this.C02 + es * (this.C04 + es * (this.C06 + es * this.C08)));
  en[1] = es * (this.C22 - es * (this.C04 + es * (this.C06 + es * this.C08)));
  var t = es * es;
  en[2] = t * (this.C44 - es * (this.C46 + es * this.C48));
  t *= es;
  en[3] = t * (this.C66 - es * this.C68);
  en[4] = t * es * this.C88;
  return en;
};

exports.pj_mlfn = function(phi, sphi, cphi, en) {
  cphi *= sphi;
  sphi *= sphi;
  return (en[0] * phi - cphi * (en[1] + sphi * (en[2] + sphi * (en[3] + sphi * en[4]))));
};

exports.pj_inv_mlfn = function(arg, es, en) {
  var k = 1 / (1 - es);
  var phi = arg;
  for (var i = exports.MAX_ITER; i; --i) { /* rarely goes over 2 iterations */
    var s = Math.sin(phi);
    var t = 1 - es * s * s;
    //t = this.pj_mlfn(phi, s, Math.cos(phi), en) - arg;
    //phi -= t * (t * Math.sqrt(t)) * k;
    t = (this.pj_mlfn(phi, s, Math.cos(phi), en) - arg) * (t * Math.sqrt(t)) * k;
    phi -= t;
    if (Math.abs(t) < exports.EPSLN) {
      return phi;
    }
  }
  //..reportError("cass:pj_inv_mlfn: Convergence error");
  return phi;
};

/**
 * Determine correction values
 * source: nad_intr.c (DGR: 2012-07-29)
 */
exports.nad_intr = function(pin, ct) {
  // force computation by decreasing by 1e-7 to be as closed as possible
  // from computation under C:C++ by leveraging rounding problems ...
  var t = {
    x: (pin.x - 1e-7) / ct.del[0],
    y: (pin.y - 1e-7) / ct.del[1]
  };
  var indx = {
    x: Math.floor(t.x),
    y: Math.floor(t.y)
  };
  var frct = {
    x: t.x - 1 * indx.x,
    y: t.y - 1 * indx.y
  };
  var val = {
    x: Number.NaN,
    y: Number.NaN
  };
  var inx;
  if (indx.x < 0) {
    if (!(indx.x === -1 && frct.x > 0.99999999999)) {
      return val;
    }
    indx.x++;
    frct.x = 0;
  }
  else {
    inx = indx.x + 1;
    if (inx >= ct.lim[0]) {
      if (!(inx === ct.lim[0] && frct.x < 1e-11)) {
        return val;
      }
      indx.x--;
      frct.x = 1;
    }
  }
  if (indx.y < 0) {
    if (!(indx.y === -1 && frct.y > 0.99999999999)) {
      return val;
    }
    indx.y++;
    frct.y = 0;
  }
  else {
    inx = indx.y + 1;
    if (inx >= ct.lim[1]) {
      if (!(inx === ct.lim[1] && frct.y < 1e-11)) {
        return val;
      }
      indx.y++;
      frct.y = 1;
    }
  }
  inx = (indx.y * ct.lim[0]) + indx.x;
  var f00 = {
    x: ct.cvs[inx][0],
    y: ct.cvs[inx][1]
  };
  inx++;
  var f10 = {
    x: ct.cvs[inx][0],
    y: ct.cvs[inx][1]
  };
  inx += ct.lim[0];
  var f11 = {
    x: ct.cvs[inx][0],
    y: ct.cvs[inx][1]
  };
  inx--;
  var f01 = {
    x: ct.cvs[inx][0],
    y: ct.cvs[inx][1]
  };
  var m11 = frct.x * frct.y,
    m10 = frct.x * (1 - frct.y),
    m00 = (1 - frct.x) * (1 - frct.y),
    m01 = (1 - frct.x) * frct.y;
  val.x = (m00 * f00.x + m10 * f10.x + m01 * f01.x + m11 * f11.x);
  val.y = (m00 * f00.y + m10 * f10.y + m01 * f01.y + m11 * f11.y);
  return val;
};

/**
 * Correct value
 * source: nad_cvt.c (DGR: 2012-07-29)
 */
exports.nad_cvt = function(pin, inverse, ct) {
  var val = {
    "x": Number.NaN,
    "y": Number.NaN
  };
  if (isNaN(pin.x)) {
    return val;
  }
  var tb = {
    "x": pin.x,
    "y": pin.y
  };
  tb.x -= ct.ll[0];
  tb.y -= ct.ll[1];
  tb.x = exports.adjust_lon(tb.x - exports.PI) + exports.PI;
  var t = exports.nad_intr(tb, ct);
  if (inverse) {
    if (isNaN(t.x)) {
      return val;
    }
    t.x = tb.x + t.x;
    t.y = tb.y - t.y;
    var i = 9,
      tol = 1e-12;
    var dif, del;
    do {
      del = exports.nad_intr(t, ct);
      if (isNaN(del.x)) {
        this.reportError("Inverse grid shift iteration failed, presumably at grid edge.  Using first approximation.");
        break;
      }
      dif = {
        "x": t.x - del.x - tb.x,
        "y": t.y + del.y - tb.y
      };
      t.x -= dif.x;
      t.y -= dif.y;
    } while (i-- && Math.abs(dif.x) > tol && Math.abs(dif.y) > tol);
    if (i < 0) {
      this.reportError("Inverse grid shift iterator failed to converge.");
      return val;
    }
    val.x = exports.adjust_lon(t.x + ct.ll[0]);
    val.y = t.y + ct.ll[1];
  }
  else {
    if (!isNaN(t.x)) {
      val.x = pin.x - t.x;
      val.y = pin.y + t.y;
    }
  }
  return val;
};

/* meridinal distance for ellipsoid and inverse
 **    8th degree - accurate to < 1e-5 meters when used in conjuction
 **		with typical major axis values.
 **	Inverse determines phi to EPS (1e-11) radians, about 1e-6 seconds.
 */
exports.C00 = 1;
exports.C02 = 0.25;
exports.C04 = 0.046875;
exports.C06 = 0.01953125;
exports.C08 = 0.01068115234375;
exports.C22 = 0.75;
exports.C44 = 0.46875;
exports.C46 = 0.01302083333333333333;
exports.C48 = 0.00712076822916666666;
exports.C66 = 0.36458333333333333333;
exports.C68 = 0.00569661458333333333;
exports.C88 = 0.3076171875;

},{}],29:[function(require,module,exports){
exports.wgs84 = {
  towgs84: "0,0,0",
  ellipse: "WGS84",
  datumName: "WGS84"
};
exports.ch1903 = {
  towgs84: "674.374,15.056,405.346",
  ellipse: "bessel",
  datumName: "swiss"
};
exports.ggrs87 = {
  towgs84: "-199.87,74.79,246.62",
  ellipse: "GRS80",
  datumName: "Greek_Geodetic_Reference_System_1987"
};
exports.nad83 = {
  towgs84: "0,0,0",
  ellipse: "GRS80",
  datumName: "North_American_Datum_1983"
};
exports.nad27 = {
  nadgrids: "@conus,@alaska,@ntv2_0.gsb,@ntv1_can.dat",
  ellipse: "clrk66",
  datumName: "North_American_Datum_1927"
};
exports.potsdam = {
  towgs84: "606.0,23.0,413.0",
  ellipse: "bessel",
  datumName: "Potsdam Rauenberg 1950 DHDN"
};
exports.carthage = {
  towgs84: "-263.0,6.0,431.0",
  ellipse: "clark80",
  datumName: "Carthage 1934 Tunisia"
};
exports.hermannskogel = {
  towgs84: "653.0,-212.0,449.0",
  ellipse: "bessel",
  datumName: "Hermannskogel"
};
exports.ire65 = {
  towgs84: "482.530,-130.596,564.557,-1.042,-0.214,-0.631,8.15",
  ellipse: "mod_airy",
  datumName: "Ireland 1965"
};
exports.rassadiran = {
  towgs84: "-133.63,-157.5,-158.62",
  ellipse: "intl",
  datumName: "Rassadiran"
};
exports.nzgd49 = {
  towgs84: "59.47,-5.04,187.44,0.47,-0.1,1.024,-4.5993",
  ellipse: "intl",
  datumName: "New Zealand Geodetic Datum 1949"
};
exports.osgb36 = {
  towgs84: "446.448,-125.157,542.060,0.1502,0.2470,0.8421,-20.4894",
  ellipse: "airy",
  datumName: "Airy 1830"
};
exports.s_jtsk = {
  towgs84: "589,76,480",
  ellipse: 'bessel',
  datumName: 'S-JTSK (Ferro)'
};
exports.beduaram = {
  towgs84: '-106,-87,188',
  ellipse: 'clrk80',
  datumName: 'Beduaram'
};
exports.gunung_segara = {
  towgs84: '-403,684,41',
  ellipse: 'bessel',
  datumName: 'Gunung Segara Jakarta'
};
},{}],30:[function(require,module,exports){
exports.MERIT = {
  a: 6378137.0,
  rf: 298.257,
  ellipseName: "MERIT 1983"
};
exports.SGS85 = {
  a: 6378136.0,
  rf: 298.257,
  ellipseName: "Soviet Geodetic System 85"
};
exports.GRS80 = {
  a: 6378137.0,
  rf: 298.257222101,
  ellipseName: "GRS 1980(IUGG, 1980)"
};
exports.IAU76 = {
  a: 6378140.0,
  rf: 298.257,
  ellipseName: "IAU 1976"
};
exports.airy = {
  a: 6377563.396,
  b: 6356256.910,
  ellipseName: "Airy 1830"
};
exports.APL4 = {
  a: 6378137,
  rf: 298.25,
  ellipseName: "Appl. Physics. 1965"
};
exports.NWL9D = {
  a: 6378145.0,
  rf: 298.25,
  ellipseName: "Naval Weapons Lab., 1965"
};
exports.mod_airy = {
  a: 6377340.189,
  b: 6356034.446,
  ellipseName: "Modified Airy"
};
exports.andrae = {
  a: 6377104.43,
  rf: 300.0,
  ellipseName: "Andrae 1876 (Den., Iclnd.)"
};
exports.aust_SA = {
  a: 6378160.0,
  rf: 298.25,
  ellipseName: "Australian Natl & S. Amer. 1969"
};
exports.GRS67 = {
  a: 6378160.0,
  rf: 298.2471674270,
  ellipseName: "GRS 67(IUGG 1967)"
};
exports.bessel = {
  a: 6377397.155,
  rf: 299.1528128,
  ellipseName: "Bessel 1841"
};
exports.bess_nam = {
  a: 6377483.865,
  rf: 299.1528128,
  ellipseName: "Bessel 1841 (Namibia)"
};
exports.clrk66 = {
  a: 6378206.4,
  b: 6356583.8,
  ellipseName: "Clarke 1866"
};
exports.clrk80 = {
  a: 6378249.145,
  rf: 293.4663,
  ellipseName: "Clarke 1880 mod."
};
exports.clrk58 = {
  a: 6378293.645208759,
  rf: 294.2606763692654,
  ellipseName: "Clarke 1858"
};
exports.CPM = {
  a: 6375738.7,
  rf: 334.29,
  ellipseName: "Comm. des Poids et Mesures 1799"
};
exports.delmbr = {
  a: 6376428.0,
  rf: 311.5,
  ellipseName: "Delambre 1810 (Belgium)"
};
exports.engelis = {
  a: 6378136.05,
  rf: 298.2566,
  ellipseName: "Engelis 1985"
};
exports.evrst30 = {
  a: 6377276.345,
  rf: 300.8017,
  ellipseName: "Everest 1830"
};
exports.evrst48 = {
  a: 6377304.063,
  rf: 300.8017,
  ellipseName: "Everest 1948"
};
exports.evrst56 = {
  a: 6377301.243,
  rf: 300.8017,
  ellipseName: "Everest 1956"
};
exports.evrst69 = {
  a: 6377295.664,
  rf: 300.8017,
  ellipseName: "Everest 1969"
};
exports.evrstSS = {
  a: 6377298.556,
  rf: 300.8017,
  ellipseName: "Everest (Sabah & Sarawak)"
};
exports.fschr60 = {
  a: 6378166.0,
  rf: 298.3,
  ellipseName: "Fischer (Mercury Datum) 1960"
};
exports.fschr60m = {
  a: 6378155.0,
  rf: 298.3,
  ellipseName: "Fischer 1960"
};
exports.fschr68 = {
  a: 6378150.0,
  rf: 298.3,
  ellipseName: "Fischer 1968"
};
exports.helmert = {
  a: 6378200.0,
  rf: 298.3,
  ellipseName: "Helmert 1906"
};
exports.hough = {
  a: 6378270.0,
  rf: 297.0,
  ellipseName: "Hough"
};
exports.intl = {
  a: 6378388.0,
  rf: 297.0,
  ellipseName: "International 1909 (Hayford)"
};
exports.kaula = {
  a: 6378163.0,
  rf: 298.24,
  ellipseName: "Kaula 1961"
};
exports.lerch = {
  a: 6378139.0,
  rf: 298.257,
  ellipseName: "Lerch 1979"
};
exports.mprts = {
  a: 6397300.0,
  rf: 191.0,
  ellipseName: "Maupertius 1738"
};
exports.new_intl = {
  a: 6378157.5,
  b: 6356772.2,
  ellipseName: "New International 1967"
};
exports.plessis = {
  a: 6376523.0,
  rf: 6355863.0,
  ellipseName: "Plessis 1817 (France)"
};
exports.krass = {
  a: 6378245.0,
  rf: 298.3,
  ellipseName: "Krassovsky, 1942"
};
exports.SEasia = {
  a: 6378155.0,
  b: 6356773.3205,
  ellipseName: "Southeast Asia"
};
exports.walbeck = {
  a: 6376896.0,
  b: 6355834.8467,
  ellipseName: "Walbeck"
};
exports.WGS60 = {
  a: 6378165.0,
  rf: 298.3,
  ellipseName: "WGS 60"
};
exports.WGS66 = {
  a: 6378145.0,
  rf: 298.25,
  ellipseName: "WGS 66"
};
exports.WGS7 = {
  a: 6378135.0,
  rf: 298.26,
  ellipseName: "WGS 72"
};
exports.WGS84 = {
  a: 6378137.0,
  rf: 298.257223563,
  ellipseName: "WGS 84"
};
exports.sphere = {
  a: 6370997.0,
  b: 6370997.0,
  ellipseName: "Normal Sphere (r=6370997)"
};
},{}],31:[function(require,module,exports){
exports.greenwich = 0.0; //"0dE",
exports.lisbon = -9.131906111111; //"9d07'54.862\"W",
exports.paris = 2.337229166667; //"2d20'14.025\"E",
exports.bogota = -74.080916666667; //"74d04'51.3\"W",
exports.madrid = -3.687938888889; //"3d41'16.58\"W",
exports.rome = 12.452333333333; //"12d27'8.4\"E",
exports.bern = 7.439583333333; //"7d26'22.5\"E",
exports.jakarta = 106.807719444444; //"106d48'27.79\"E",
exports.ferro = -17.666666666667; //"17d40'W",
exports.brussels = 4.367975; //"4d22'4.71\"E",
exports.stockholm = 18.058277777778; //"18d3'29.8\"E",
exports.athens = 23.7163375; //"23d42'58.815\"E",
exports.oslo = 10.722916666667; //"10d43'22.5\"E"
},{}],32:[function(require,module,exports){
// Based on . CTABLE  structure :
  // FIXME: better to have array instead of object holding longitudes, latitudes members
  //        In the former case, one has to document index 0 is longitude and
  //        1 is latitude ...
  //        In the later case, grid object gets bigger !!!!
  //        Solution 1 is chosen based on pj_gridinfo.c
exports.null = { // name of grid's file
  "ll": [-3.14159265, - 1.57079633], // lower-left coordinates in radians (longitude, latitude):
  "del": [3.14159265, 1.57079633], // cell's size in radians (longitude, latitude):
  "lim": [3, 3], // number of nodes in longitude, latitude (including edges):
  "count": 9, // total number of nodes
  "cvs": [ // shifts : in ntv2 reverse order : lon, lat in radians ...
    [0.0, 0.0],
    [0.0, 0.0],
    [0.0, 0.0], // for (lon= 0; lon<lim[0]; lon++) {
    [0.0, 0.0],
    [0.0, 0.0],
    [0.0, 0.0], //   for (lat= 0; lat<lim[1]; lat++) { p= cvs[lat*lim[0]+lon]; }
    [0.0, 0.0],
    [0.0, 0.0],
    [0.0, 0.0] // }
  ]
};
},{}],33:[function(require,module,exports){
exports.PrimeMeridian = require('./PrimeMeridian');

exports.Ellipsoid = require('./Ellipsoid');

exports.Datum = require('./Datum');

//..WGS84 = Proj('WGS84');
exports.Datum.OSB36 = exports.Datum.OSGB36; //as returned from spatialreference.org

exports.grids = require('./grids');

},{"./Datum":29,"./Ellipsoid":30,"./PrimeMeridian":31,"./grids":32}],34:[function(require,module,exports){
var point = require('./Point');
var proj = require('./Proj');
var transform = require('./transform');
var wgs84 = proj('WGS84');

function transformer(from, to, coords) {
  var transformedArray;
  if (Array.isArray(coords)) {
    transformedArray = transform(from, to, point(coords));
    if (coords.length === 3) {
      return [transformedArray.x, transformedArray.y, transformedArray.z];
    }
    else {
      return [transformedArray.x, transformedArray.y];
    }
  }
  else {
    return transform(from, to, coords);
  }
}

function checkProj(item) {
  if (item instanceof proj) {
    return item;
  }
  if (item.oProj) {
    return item.oProj;
  }
  return proj(item);
}
module.exports = function(fromProj, toProj, coord) {
  fromProj = checkProj(fromProj);
  var single = false;
  var obj;
  if (typeof toProj === 'undefined') {
    toProj = fromProj;
    fromProj = wgs84;
    single = true;
  }
  else if (typeof toProj.x !== 'undefined' || Array.isArray(toProj)) {
    coord = toProj;
    toProj = fromProj;
    fromProj = wgs84;
    single = true;
  }
  toProj = checkProj(toProj);
  if (coord) {
    return transformer(fromProj, toProj, coord);
  }
  else {
    obj = {
      forward: function(coords) {
        return transformer(fromProj, toProj, coords);
      },
      inverse: function(coords) {
        return transformer(toProj, fromProj, coords);
      }
    };
    if (single) {
      obj.oProj = toProj;
    }
    return obj;
  }
};
},{"./Point":25,"./Proj":26,"./transform":69}],35:[function(require,module,exports){
var common = require('./common');
var datum = function(proj) {
  if (!(this instanceof datum)) {
    return new datum(proj);
  }
  this.datum_type = common.PJD_WGS84; //default setting
  if (!proj) {
    return;
  }
  if (proj.datumCode && proj.datumCode === 'none') {
    this.datum_type = common.PJD_NODATUM;
  }
  if (proj.datum_params) {
    for (var i = 0; i < proj.datum_params.length; i++) {
      proj.datum_params[i] = parseFloat(proj.datum_params[i]);
    }
    if (proj.datum_params[0] !== 0 || proj.datum_params[1] !== 0 || proj.datum_params[2] !== 0) {
      this.datum_type = common.PJD_3PARAM;
    }
    if (proj.datum_params.length > 3) {
      if (proj.datum_params[3] !== 0 || proj.datum_params[4] !== 0 || proj.datum_params[5] !== 0 || proj.datum_params[6] !== 0) {
        this.datum_type = common.PJD_7PARAM;
        proj.datum_params[3] *= common.SEC_TO_RAD;
        proj.datum_params[4] *= common.SEC_TO_RAD;
        proj.datum_params[5] *= common.SEC_TO_RAD;
        proj.datum_params[6] = (proj.datum_params[6] / 1000000.0) + 1.0;
      }
    }
  }
  // DGR 2011-03-21 : nadgrids support
  this.datum_type = proj.grids ? common.PJD_GRIDSHIFT : this.datum_type;

  this.a = proj.a; //datum object also uses these values
  this.b = proj.b;
  this.es = proj.es;
  this.ep2 = proj.ep2;
  this.datum_params = proj.datum_params;
  if (this.datum_type === common.PJD_GRIDSHIFT) {
    this.grids = proj.grids;
  }
};
datum.prototype = {


  /****************************************************************/
  // cs_compare_datums()
  //   Returns TRUE if the two datums match, otherwise FALSE.
  compare_datums: function(dest) {
    if (this.datum_type !== dest.datum_type) {
      return false; // false, datums are not equal
    }
    else if (this.a !== dest.a || Math.abs(this.es - dest.es) > 0.000000000050) {
      // the tolerence for es is to ensure that GRS80 and WGS84
      // are considered identical
      return false;
    }
    else if (this.datum_type === common.PJD_3PARAM) {
      return (this.datum_params[0] === dest.datum_params[0] && this.datum_params[1] === dest.datum_params[1] && this.datum_params[2] === dest.datum_params[2]);
    }
    else if (this.datum_type === common.PJD_7PARAM) {
      return (this.datum_params[0] === dest.datum_params[0] && this.datum_params[1] === dest.datum_params[1] && this.datum_params[2] === dest.datum_params[2] && this.datum_params[3] === dest.datum_params[3] && this.datum_params[4] === dest.datum_params[4] && this.datum_params[5] === dest.datum_params[5] && this.datum_params[6] === dest.datum_params[6]);
    }
    else if (this.datum_type === common.PJD_GRIDSHIFT || dest.datum_type === common.PJD_GRIDSHIFT) {
      //alert("ERROR: Grid shift transformations are not implemented.");
      //return false
      //DGR 2012-07-29 lazy ...
      return this.nadgrids === dest.nadgrids;
    }
    else {
      return true; // datums are equal
    }
  }, // cs_compare_datums()

  /*
   * The function Convert_Geodetic_To_Geocentric converts geodetic coordinates
   * (latitude, longitude, and height) to geocentric coordinates (X, Y, Z),
   * according to the current ellipsoid parameters.
   *
   *    Latitude  : Geodetic latitude in radians                     (input)
   *    Longitude : Geodetic longitude in radians                    (input)
   *    Height    : Geodetic height, in meters                       (input)
   *    X         : Calculated Geocentric X coordinate, in meters    (output)
   *    Y         : Calculated Geocentric Y coordinate, in meters    (output)
   *    Z         : Calculated Geocentric Z coordinate, in meters    (output)
   *
   */
  geodetic_to_geocentric: function(p) {
    var Longitude = p.x;
    var Latitude = p.y;
    var Height = p.z ? p.z : 0; //Z value not always supplied
    var X; // output
    var Y;
    var Z;

    var Error_Code = 0; //  GEOCENT_NO_ERROR;
    var Rn; /*  Earth radius at location  */
    var Sin_Lat; /*  Math.sin(Latitude)  */
    var Sin2_Lat; /*  Square of Math.sin(Latitude)  */
    var Cos_Lat; /*  Math.cos(Latitude)  */

    /*
     ** Don't blow up if Latitude is just a little out of the value
     ** range as it may just be a rounding issue.  Also removed longitude
     ** test, it should be wrapped by Math.cos() and Math.sin().  NFW for PROJ.4, Sep/2001.
     */
    if (Latitude < -common.HALF_PI && Latitude > -1.001 * common.HALF_PI) {
      Latitude = -common.HALF_PI;
    }
    else if (Latitude > common.HALF_PI && Latitude < 1.001 * common.HALF_PI) {
      Latitude = common.HALF_PI;
    }
    else if ((Latitude < -common.HALF_PI) || (Latitude > common.HALF_PI)) {
      /* Latitude out of range */
      //..reportError('geocent:lat out of range:' + Latitude);
      return null;
    }

    if (Longitude > common.PI) {
      Longitude -= (2 * common.PI);
    }
    Sin_Lat = Math.sin(Latitude);
    Cos_Lat = Math.cos(Latitude);
    Sin2_Lat = Sin_Lat * Sin_Lat;
    Rn = this.a / (Math.sqrt(1.0e0 - this.es * Sin2_Lat));
    X = (Rn + Height) * Cos_Lat * Math.cos(Longitude);
    Y = (Rn + Height) * Cos_Lat * Math.sin(Longitude);
    Z = ((Rn * (1 - this.es)) + Height) * Sin_Lat;

    p.x = X;
    p.y = Y;
    p.z = Z;
    return Error_Code;
  }, // cs_geodetic_to_geocentric()


  geocentric_to_geodetic: function(p) {
    /* local defintions and variables */
    /* end-criterium of loop, accuracy of sin(Latitude) */
    var genau = 1e-12;
    var genau2 = (genau * genau);
    var maxiter = 30;

    var P; /* distance between semi-minor axis and location */
    var RR; /* distance between center and location */
    var CT; /* sin of geocentric latitude */
    var ST; /* cos of geocentric latitude */
    var RX;
    var RK;
    var RN; /* Earth radius at location */
    var CPHI0; /* cos of start or old geodetic latitude in iterations */
    var SPHI0; /* sin of start or old geodetic latitude in iterations */
    var CPHI; /* cos of searched geodetic latitude */
    var SPHI; /* sin of searched geodetic latitude */
    var SDPHI; /* end-criterium: addition-theorem of sin(Latitude(iter)-Latitude(iter-1)) */
    var At_Pole; /* indicates location is in polar region */
    var iter; /* # of continous iteration, max. 30 is always enough (s.a.) */

    var X = p.x;
    var Y = p.y;
    var Z = p.z ? p.z : 0.0; //Z value not always supplied
    var Longitude;
    var Latitude;
    var Height;

    At_Pole = false;
    P = Math.sqrt(X * X + Y * Y);
    RR = Math.sqrt(X * X + Y * Y + Z * Z);

    /*      special cases for latitude and longitude */
    if (P / this.a < genau) {

      /*  special case, if P=0. (X=0., Y=0.) */
      At_Pole = true;
      Longitude = 0.0;

      /*  if (X,Y,Z)=(0.,0.,0.) then Height becomes semi-minor axis
       *  of ellipsoid (=center of mass), Latitude becomes PI/2 */
      if (RR / this.a < genau) {
        Latitude = common.HALF_PI;
        Height = -this.b;
        return;
      }
    }
    else {
      /*  ellipsoidal (geodetic) longitude
       *  interval: -PI < Longitude <= +PI */
      Longitude = Math.atan2(Y, X);
    }

    /* --------------------------------------------------------------
     * Following iterative algorithm was developped by
     * "Institut for Erdmessung", University of Hannover, July 1988.
     * Internet: www.ife.uni-hannover.de
     * Iterative computation of CPHI,SPHI and Height.
     * Iteration of CPHI and SPHI to 10**-12 radian resp.
     * 2*10**-7 arcsec.
     * --------------------------------------------------------------
     */
    CT = Z / RR;
    ST = P / RR;
    RX = 1.0 / Math.sqrt(1.0 - this.es * (2.0 - this.es) * ST * ST);
    CPHI0 = ST * (1.0 - this.es) * RX;
    SPHI0 = CT * RX;
    iter = 0;

    /* loop to find sin(Latitude) resp. Latitude
     * until |sin(Latitude(iter)-Latitude(iter-1))| < genau */
    do {
      iter++;
      RN = this.a / Math.sqrt(1.0 - this.es * SPHI0 * SPHI0);

      /*  ellipsoidal (geodetic) height */
      Height = P * CPHI0 + Z * SPHI0 - RN * (1.0 - this.es * SPHI0 * SPHI0);

      RK = this.es * RN / (RN + Height);
      RX = 1.0 / Math.sqrt(1.0 - RK * (2.0 - RK) * ST * ST);
      CPHI = ST * (1.0 - RK) * RX;
      SPHI = CT * RX;
      SDPHI = SPHI * CPHI0 - CPHI * SPHI0;
      CPHI0 = CPHI;
      SPHI0 = SPHI;
    }
    while (SDPHI * SDPHI > genau2 && iter < maxiter);

    /*      ellipsoidal (geodetic) latitude */
    Latitude = Math.atan(SPHI / Math.abs(CPHI));

    p.x = Longitude;
    p.y = Latitude;
    p.z = Height;
    return p;
  }, // cs_geocentric_to_geodetic()

  /** Convert_Geocentric_To_Geodetic
   * The method used here is derived from 'An Improved Algorithm for
   * Geocentric to Geodetic Coordinate Conversion', by Ralph Toms, Feb 1996
   */
  geocentric_to_geodetic_noniter: function(p) {
    var X = p.x;
    var Y = p.y;
    var Z = p.z ? p.z : 0; //Z value not always supplied
    var Longitude;
    var Latitude;
    var Height;

    var W; /* distance from Z axis */
    var W2; /* square of distance from Z axis */
    var T0; /* initial estimate of vertical component */
    var T1; /* corrected estimate of vertical component */
    var S0; /* initial estimate of horizontal component */
    var S1; /* corrected estimate of horizontal component */
    var Sin_B0; /* Math.sin(B0), B0 is estimate of Bowring aux variable */
    var Sin3_B0; /* cube of Math.sin(B0) */
    var Cos_B0; /* Math.cos(B0) */
    var Sin_p1; /* Math.sin(phi1), phi1 is estimated latitude */
    var Cos_p1; /* Math.cos(phi1) */
    var Rn; /* Earth radius at location */
    var Sum; /* numerator of Math.cos(phi1) */
    var At_Pole; /* indicates location is in polar region */

    X = parseFloat(X); // cast from string to float
    Y = parseFloat(Y);
    Z = parseFloat(Z);

    At_Pole = false;
    if (X !== 0.0) {
      Longitude = Math.atan2(Y, X);
    }
    else {
      if (Y > 0) {
        Longitude = common.HALF_PI;
      }
      else if (Y < 0) {
        Longitude = -common.HALF_PI;
      }
      else {
        At_Pole = true;
        Longitude = 0.0;
        if (Z > 0.0) { /* north pole */
          Latitude = common.HALF_PI;
        }
        else if (Z < 0.0) { /* south pole */
          Latitude = -common.HALF_PI;
        }
        else { /* center of earth */
          Latitude = common.HALF_PI;
          Height = -this.b;
          return;
        }
      }
    }
    W2 = X * X + Y * Y;
    W = Math.sqrt(W2);
    T0 = Z * common.AD_C;
    S0 = Math.sqrt(T0 * T0 + W2);
    Sin_B0 = T0 / S0;
    Cos_B0 = W / S0;
    Sin3_B0 = Sin_B0 * Sin_B0 * Sin_B0;
    T1 = Z + this.b * this.ep2 * Sin3_B0;
    Sum = W - this.a * this.es * Cos_B0 * Cos_B0 * Cos_B0;
    S1 = Math.sqrt(T1 * T1 + Sum * Sum);
    Sin_p1 = T1 / S1;
    Cos_p1 = Sum / S1;
    Rn = this.a / Math.sqrt(1.0 - this.es * Sin_p1 * Sin_p1);
    if (Cos_p1 >= common.COS_67P5) {
      Height = W / Cos_p1 - Rn;
    }
    else if (Cos_p1 <= -common.COS_67P5) {
      Height = W / -Cos_p1 - Rn;
    }
    else {
      Height = Z / Sin_p1 + Rn * (this.es - 1.0);
    }
    if (At_Pole === false) {
      Latitude = Math.atan(Sin_p1 / Cos_p1);
    }

    p.x = Longitude;
    p.y = Latitude;
    p.z = Height;
    return p;
  }, // geocentric_to_geodetic_noniter()

  /****************************************************************/
  // pj_geocentic_to_wgs84( p )
  //  p = point to transform in geocentric coordinates (x,y,z)
  geocentric_to_wgs84: function(p) {

    if (this.datum_type === common.PJD_3PARAM) {
      // if( x[io] === HUGE_VAL )
      //    continue;
      p.x += this.datum_params[0];
      p.y += this.datum_params[1];
      p.z += this.datum_params[2];

    }
    else if (this.datum_type === common.PJD_7PARAM) {
      var Dx_BF = this.datum_params[0];
      var Dy_BF = this.datum_params[1];
      var Dz_BF = this.datum_params[2];
      var Rx_BF = this.datum_params[3];
      var Ry_BF = this.datum_params[4];
      var Rz_BF = this.datum_params[5];
      var M_BF = this.datum_params[6];
      // if( x[io] === HUGE_VAL )
      //    continue;
      var x_out = M_BF * (p.x - Rz_BF * p.y + Ry_BF * p.z) + Dx_BF;
      var y_out = M_BF * (Rz_BF * p.x + p.y - Rx_BF * p.z) + Dy_BF;
      var z_out = M_BF * (-Ry_BF * p.x + Rx_BF * p.y + p.z) + Dz_BF;
      p.x = x_out;
      p.y = y_out;
      p.z = z_out;
    }
  }, // cs_geocentric_to_wgs84

  /****************************************************************/
  // pj_geocentic_from_wgs84()
  //  coordinate system definition,
  //  point to transform in geocentric coordinates (x,y,z)
  geocentric_from_wgs84: function(p) {

    if (this.datum_type === common.PJD_3PARAM) {
      //if( x[io] === HUGE_VAL )
      //    continue;
      p.x -= this.datum_params[0];
      p.y -= this.datum_params[1];
      p.z -= this.datum_params[2];

    }
    else if (this.datum_type === common.PJD_7PARAM) {
      var Dx_BF = this.datum_params[0];
      var Dy_BF = this.datum_params[1];
      var Dz_BF = this.datum_params[2];
      var Rx_BF = this.datum_params[3];
      var Ry_BF = this.datum_params[4];
      var Rz_BF = this.datum_params[5];
      var M_BF = this.datum_params[6];
      var x_tmp = (p.x - Dx_BF) / M_BF;
      var y_tmp = (p.y - Dy_BF) / M_BF;
      var z_tmp = (p.z - Dz_BF) / M_BF;
      //if( x[io] === HUGE_VAL )
      //    continue;

      p.x = x_tmp + Rz_BF * y_tmp - Ry_BF * z_tmp;
      p.y = -Rz_BF * x_tmp + y_tmp + Rx_BF * z_tmp;
      p.z = Ry_BF * x_tmp - Rx_BF * y_tmp + z_tmp;
    } //cs_geocentric_from_wgs84()
  }
};

/** point object, nothing fancy, just allows values to be
    passed back and forth by reference rather than by value.
    Other point classes may be used as long as they have
    x and y properties, which will get modified in the transform method.
*/
module.exports = datum;

},{"./common":28}],36:[function(require,module,exports){
var common = require('./common');
module.exports = function(source, dest, point) {
  var wp, i, l;

  function checkParams(fallback) {
    return (fallback === common.PJD_3PARAM || fallback === common.PJD_7PARAM);
  }
  // Short cut if the datums are identical.
  if (source.compare_datums(dest)) {
    return point; // in this case, zero is sucess,
    // whereas cs_compare_datums returns 1 to indicate TRUE
    // confusing, should fix this
  }

  // Explicitly skip datum transform by setting 'datum=none' as parameter for either source or dest
  if (source.datum_type === common.PJD_NODATUM || dest.datum_type === common.PJD_NODATUM) {
    return point;
  }

  //DGR: 2012-07-29 : add nadgrids support (begin)
  var src_a = source.a;
  var src_es = source.es;

  var dst_a = dest.a;
  var dst_es = dest.es;

  var fallback = source.datum_type;
  // If this datum requires grid shifts, then apply it to geodetic coordinates.
  if (fallback === common.PJD_GRIDSHIFT) {
    if (this.apply_gridshift(source, 0, point) === 0) {
      source.a = common.SRS_WGS84_SEMIMAJOR;
      source.es = common.SRS_WGS84_ESQUARED;
    }
    else {
      // try 3 or 7 params transformation or nothing ?
      if (!source.datum_params) {
        source.a = src_a;
        source.es = source.es;
        return point;
      }
      wp = 1;
      for (i = 0, l = source.datum_params.length; i < l; i++) {
        wp *= source.datum_params[i];
      }
      if (wp === 0) {
        source.a = src_a;
        source.es = source.es;
        return point;
      }
      if (source.datum_params.length > 3) {
        fallback = common.PJD_7PARAM;
      }
      else {
        fallback = common.PJD_3PARAM;
      }
    }
  }
  if (dest.datum_type === common.PJD_GRIDSHIFT) {
    dest.a = common.SRS_WGS84_SEMIMAJOR;
    dest.es = common.SRS_WGS84_ESQUARED;
  }
  // Do we need to go through geocentric coordinates?
  if (source.es !== dest.es || source.a !== dest.a || checkParams(fallback) || checkParams(dest.datum_type)) {
    //DGR: 2012-07-29 : add nadgrids support (end)
    // Convert to geocentric coordinates.
    source.geodetic_to_geocentric(point);
    // CHECK_RETURN;
    // Convert between datums
    if (checkParams(source.datum_type)) {
      source.geocentric_to_wgs84(point);
      // CHECK_RETURN;
    }
    if (checkParams(dest.datum_type)) {
      dest.geocentric_from_wgs84(point);
      // CHECK_RETURN;
    }
    // Convert back to geodetic coordinates
    dest.geocentric_to_geodetic(point);
    // CHECK_RETURN;
  }
  // Apply grid shift to destination if required
  if (dest.datum_type === common.PJD_GRIDSHIFT) {
    this.apply_gridshift(dest, 1, point);
    // CHECK_RETURN;
  }

  source.a = src_a;
  source.es = src_es;
  dest.a = dst_a;
  dest.es = dst_es;

  return point;
};


},{"./common":28}],37:[function(require,module,exports){
var globals = require('./global');
var parseProj = require('./projString');
var wkt = require('./wkt');

function defs(name) {
  /*global console*/
  var that = this;
  if (arguments.length === 2) {
    if (arguments[1][0] === '+') {
      defs[name] = parseProj(arguments[1]);
    }
    else {
      defs[name] = wkt(arguments[1]);
    }
  }
  else if (arguments.length === 1) {
    if (Array.isArray(name)) {
      return name.map(function(v) {
        if (Array.isArray(v)) {
          defs.apply(that, v);
        }
        else {
          defs(v);
        }
      });
    }
    else if (typeof name === 'string') {

    }
    else if ('EPSG' in name) {
      defs['EPSG:' + name.EPSG] = name;
    }
    else if ('ESRI' in name) {
      defs['ESRI:' + name.ESRI] = name;
    }
    else if ('IAU2000' in name) {
      defs['IAU2000:' + name.IAU2000] = name;
    }
    else {
      console.log(name);
    }
    return;
  }


}
globals(defs);
module.exports = defs;

},{"./global":39,"./projString":42,"./wkt":71}],38:[function(require,module,exports){
module.exports = function(destination, source) {
  destination = destination || {};
  var value, property;
  if (!source) {
    return destination;
  }
  for (property in source) {
    value = source[property];
    if (value !== undefined) {
      destination[property] = value;
    }
  }
  return destination;
};

},{}],39:[function(require,module,exports){
module.exports = function(defs) {
  defs('WGS84', "+title=WGS 84 (long/lat) +proj=longlat +ellps=WGS84 +datum=WGS84 +units=degrees");
  defs('EPSG:4326', "+title=WGS 84 (long/lat) +proj=longlat +ellps=WGS84 +datum=WGS84 +units=degrees");
  defs('EPSG:4269', "+title=NAD83 (long/lat) +proj=longlat +a=6378137.0 +b=6356752.31414036 +ellps=GRS80 +datum=NAD83 +units=degrees");
  defs('EPSG:3857', "+title=WGS 84 / Pseudo-Mercator +proj=merc +a=6378137 +b=6378137 +lat_ts=0.0 +lon_0=0.0 +x_0=0.0 +y_0=0 +k=1.0 +units=m +nadgrids=@null +no_defs");

  defs['EPSG:3785'] = defs['EPSG:3857']; // maintain backward compat, official code is 3857
  defs.GOOGLE = defs['EPSG:3857'];
  defs['EPSG:900913'] = defs['EPSG:3857'];
  defs['EPSG:102113'] = defs['EPSG:3857'];
};

},{}],40:[function(require,module,exports){
var proj4 = require('./core');
proj4.defaultDatum = 'WGS84'; //default datum
proj4.Proj = require('./Proj');
proj4.WGS84 = new proj4.Proj('WGS84');
proj4.Point = require('./Point');
proj4.defs = require('./defs');
proj4.transform = require('./transform');
proj4.mgrs = require('./mgrs');
proj4.version = require('./version');
module.exports = proj4;
},{"./Point":25,"./Proj":26,"./core":34,"./defs":37,"./mgrs":41,"./transform":69,"./version":70}],41:[function(require,module,exports){
/*
Portions of this software are based on a port of components from the OpenMap
com.bbn.openmap.proj.coords Java package. An initial port was initially created
by Patrice G. Cappelaere and included in Community Mapbuilder
(http://svn.codehaus.org/mapbuilder/), which is licensed under the LGPL license
as per http://www.gnu.org/copyleft/lesser.html. OpenMap is licensed under the
following license agreement:


               OpenMap Software License Agreement
               ----------------------------------

This Agreement sets forth the terms and conditions under which
the software known as OpenMap(tm) will be licensed by BBN
Technologies ("BBN") to you ("Licensee"), and by which Derivative 
Works (as hereafter defined) of OpenMap will be licensed by you to BBN.

Definitions:

 "Derivative Work(s)" shall mean any revision, enhancement,
 modification, translation, abridgement, condensation or
 expansion created by Licensee or BBN that is based upon the
 Software or a portion thereof that would be a copyright
 infringement if prepared without the authorization of the
 copyright owners of the Software or portion thereof.

 "OpenMap" shall mean a programmer's toolkit for building map
 based applications as originally created by BBN, and any
 Derivative Works thereof as created by either BBN or Licensee,
 but shall include only those Derivative Works BBN has approved
 for inclusion into, and BBN has integrated into OpenMap.

 "Standard Version" shall mean OpenMap, as originally created by
 BBN.

 "Software" shall mean OpenMap and the Derivative Works created
 by Licensee and the collection of files distributed by the
 Licensee with OpenMap, and the collection of files created
 through textual modifications.

 "Copyright Holder" is whoever is named in the copyright or
 copyrights for the Derivative Works.

 "Licensee" is you, only if you agree to be bound by the terms
 and conditions set forth in this Agreement.

 "Reasonable copying fee" is whatever you can justify on the
 basis of media cost, duplication charges, time of people
 involved.

 "Freely Available" means that no fee is charged for the item
 itself, though there may be fees involved in handling the item.
 It also means that recipients of the item may redistribute it
 under the same conditions that they received it.

1. BBN maintains all rights, title and interest in and to
OpenMap, including all applicable copyrights, trade secrets,
patents and other intellectual rights therein.  Licensee hereby
grants to BBN all right, title and interest into the compilation
of OpenMap.  Licensee shall own all rights, title and interest
into the Derivative Works created by Licensee (subject to the
compilation ownership by BBN).

2. BBN hereby grants to Licensee a royalty free, worldwide right
and license to use, copy, distribute and make Derivative Works of
OpenMap, and sublicensing rights of any of the foregoing in
accordance with the terms and conditions of this Agreement,
provided that you duplicate all of the original copyright notices
and associated disclaimers.

3. Licensee hereby grants to BBN a royalty free, worldwide right
and license to use, copy, distribute and make Derivative Works of
Derivative Works created by Licensee and sublicensing rights of
any of the foregoing.

4. Licensee's right to create Derivative Works in the Software is
subject to Licensee agreement to insert a prominent notice in
each changed file stating how and when you changed that file, and
provided that you do at least ONE of the following:

    a) place your modifications in the Public Domain or otherwise
       make them Freely Available, such as by posting said
       modifications to Usenet or an equivalent medium, or
       placing the modifications on a major archive site and by
       providing your modifications to the Copyright Holder.

    b) use the modified Package only within your corporation or
       organization.

    c) rename any non-standard executables so the names do not
       conflict with standard executables, which must also be
       provided, and provide a separate manual page for each
       non-standard executable that clearly documents how it
       differs from OpenMap.

    d) make other distribution arrangements with the Copyright
       Holder.

5. Licensee may distribute the programs of this Software in
object code or executable form, provided that you do at least ONE
of the following:

    a) distribute an OpenMap version of the executables and
       library files, together with instructions (in the manual
       page or equivalent) on where to get OpenMap.

    b) accompany the distribution with the machine-readable
       source code with your modifications.

    c) accompany any non-standard executables with their
       corresponding OpenMap executables, giving the non-standard
       executables non-standard names, and clearly documenting
       the differences in manual pages (or equivalent), together
       with instructions on where to get OpenMap.

    d) make other distribution arrangements with the Copyright
       Holder.

6. You may charge a reasonable copying fee for any distribution
of this Software.  You may charge any fee you choose for support
of this Software.  You may not charge a fee for this Software
itself.  However, you may distribute this Software in aggregate
with other (possibly commercial) programs as part of a larger
(possibly commercial) software distribution provided that you do
not advertise this Software as a product of your own.

7. The data and images supplied as input to or produced as output
from the Software do not automatically fall under the copyright
of this Software, but belong to whomever generated them, and may
be sold commercially, and may be aggregated with this Software.

8. BBN makes no representation about the suitability of OpenMap
for any purposes.  BBN shall have no duty or requirement to
include any Derivative Works into OpenMap.

9. Each party hereto represents and warrants that they have the
full unrestricted right to grant all rights and licenses granted
to the other party herein.

10. THIS PACKAGE IS PROVIDED "AS IS" WITHOUT WARRANTIES OF ANY
KIND, WHETHER EXPRESS OR IMPLIED, INCLUDING (BUT NOT LIMITED TO)
ALL IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS, AND
WITHOUT ANY WARRANTIES AS TO NONINFRINGEMENT.

11. IN NO EVENT SHALL COPYRIGHT HOLDER BE LIABLE FOR ANY DIRECT,
SPECIAL, INDIRECT OR CONSEQUENTIAL DAMAGES WHATSOEVER RESULTING
FROM LOSS OF USE OF DATA OR PROFITS, WHETHER IN AN ACTION OF
CONTRACT, NEGLIGENCE OR OTHER TORTIOUS CONDUCT, ARISING OUT OF OR
IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS PACKAGE.

12. Without limitation of the foregoing, You agree to commit no
act which, directly or indirectly, would violate any U.S. law,
regulation, or treaty, or any other international treaty or
agreement to which the United States adheres or with which the
United States complies, relating to the export or re-export of
any commodities, software, or technical data.
*/



/**
 * UTM zones are grouped, and assigned to one of a group of 6
 * sets.
 *
 * {int} @private
 */
var NUM_100K_SETS = 6;

/**
 * The column letters (for easting) of the lower left value, per
 * set.
 *
 * {string} @private
 */
var SET_ORIGIN_COLUMN_LETTERS = 'AJSAJS';

/**
 * The row letters (for northing) of the lower left value, per
 * set.
 *
 * {string} @private
 */
var SET_ORIGIN_ROW_LETTERS = 'AFAFAF';

var A = 65; // A
var I = 73; // I
var O = 79; // O
var V = 86; // V
var Z = 90; // Z

/**
 * Conversion of lat/lon to MGRS.
 *
 * @param {object} ll Object literal with lat and lon properties on a
 *     WGS84 ellipsoid.
 * @param {int} accuracy Accuracy in digits (5 for 1 m, 4 for 10 m, 3 for
 *      100 m, 4 for 1000 m or 5 for 10000 m). Optional, default is 5.
 * @return {string} the MGRS string for the given location and accuracy.
 */
exports.forward = function(ll, accuracy) {
  accuracy = accuracy || 5; // default accuracy 1m
  return encode(LLtoUTM({
    lat: ll.lat,
    lon: ll.lon
  }), accuracy);
};

/**
 * Conversion of MGRS to lat/lon.
 *
 * @param {string} mgrs MGRS string.
 * @return {array} An array with left (longitude), bottom (latitude), right
 *     (longitude) and top (latitude) values in WGS84, representing the
 *     bounding box for the provided MGRS reference.
 */
exports.inverse = function(mgrs) {
  var bbox = UTMtoLL(decode(mgrs.toUpperCase()));
  return [bbox.left, bbox.bottom, bbox.right, bbox.top];
};

/**
 * Conversion from degrees to radians.
 *
 * @private
 * @param {number} deg the angle in degrees.
 * @return {number} the angle in radians.
 */
function degToRad(deg) {
  return (deg * (Math.PI / 180.0));
}

/**
 * Conversion from radians to degrees.
 *
 * @private
 * @param {number} rad the angle in radians.
 * @return {number} the angle in degrees.
 */
function radToDeg(rad) {
  return (180.0 * (rad / Math.PI));
}

/**
 * Converts a set of Longitude and Latitude co-ordinates to UTM
 * using the WGS84 ellipsoid.
 *
 * @private
 * @param {object} ll Object literal with lat and lon properties
 *     representing the WGS84 coordinate to be converted.
 * @return {object} Object literal containing the UTM value with easting,
 *     northing, zoneNumber and zoneLetter properties, and an optional
 *     accuracy property in digits. Returns null if the conversion failed.
 */
function LLtoUTM(ll) {
  var Lat = ll.lat;
  var Long = ll.lon;
  var a = 6378137.0; //ellip.radius;
  var eccSquared = 0.00669438; //ellip.eccsq;
  var k0 = 0.9996;
  var LongOrigin;
  var eccPrimeSquared;
  var N, T, C, A, M;
  var LatRad = degToRad(Lat);
  var LongRad = degToRad(Long);
  var LongOriginRad;
  var ZoneNumber;
  // (int)
  ZoneNumber = Math.floor((Long + 180) / 6) + 1;

  //Make sure the longitude 180.00 is in Zone 60
  if (Long === 180) {
    ZoneNumber = 60;
  }

  // Special zone for Norway
  if (Lat >= 56.0 && Lat < 64.0 && Long >= 3.0 && Long < 12.0) {
    ZoneNumber = 32;
  }

  // Special zones for Svalbard
  if (Lat >= 72.0 && Lat < 84.0) {
    if (Long >= 0.0 && Long < 9.0) {
      ZoneNumber = 31;
    }
    else if (Long >= 9.0 && Long < 21.0) {
      ZoneNumber = 33;
    }
    else if (Long >= 21.0 && Long < 33.0) {
      ZoneNumber = 35;
    }
    else if (Long >= 33.0 && Long < 42.0) {
      ZoneNumber = 37;
    }
  }

  LongOrigin = (ZoneNumber - 1) * 6 - 180 + 3; //+3 puts origin
  // in middle of
  // zone
  LongOriginRad = degToRad(LongOrigin);

  eccPrimeSquared = (eccSquared) / (1 - eccSquared);

  N = a / Math.sqrt(1 - eccSquared * Math.sin(LatRad) * Math.sin(LatRad));
  T = Math.tan(LatRad) * Math.tan(LatRad);
  C = eccPrimeSquared * Math.cos(LatRad) * Math.cos(LatRad);
  A = Math.cos(LatRad) * (LongRad - LongOriginRad);

  M = a * ((1 - eccSquared / 4 - 3 * eccSquared * eccSquared / 64 - 5 * eccSquared * eccSquared * eccSquared / 256) * LatRad - (3 * eccSquared / 8 + 3 * eccSquared * eccSquared / 32 + 45 * eccSquared * eccSquared * eccSquared / 1024) * Math.sin(2 * LatRad) + (15 * eccSquared * eccSquared / 256 + 45 * eccSquared * eccSquared * eccSquared / 1024) * Math.sin(4 * LatRad) - (35 * eccSquared * eccSquared * eccSquared / 3072) * Math.sin(6 * LatRad));

  var UTMEasting = (k0 * N * (A + (1 - T + C) * A * A * A / 6.0 + (5 - 18 * T + T * T + 72 * C - 58 * eccPrimeSquared) * A * A * A * A * A / 120.0) + 500000.0);

  var UTMNorthing = (k0 * (M + N * Math.tan(LatRad) * (A * A / 2 + (5 - T + 9 * C + 4 * C * C) * A * A * A * A / 24.0 + (61 - 58 * T + T * T + 600 * C - 330 * eccPrimeSquared) * A * A * A * A * A * A / 720.0)));
  if (Lat < 0.0) {
    UTMNorthing += 10000000.0; //10000000 meter offset for
    // southern hemisphere
  }

  return {
    northing: Math.round(UTMNorthing),
    easting: Math.round(UTMEasting),
    zoneNumber: ZoneNumber,
    zoneLetter: getLetterDesignator(Lat)
  };
}

/**
 * Converts UTM coords to lat/long, using the WGS84 ellipsoid. This is a convenience
 * class where the Zone can be specified as a single string eg."60N" which
 * is then broken down into the ZoneNumber and ZoneLetter.
 *
 * @private
 * @param {object} utm An object literal with northing, easting, zoneNumber
 *     and zoneLetter properties. If an optional accuracy property is
 *     provided (in meters), a bounding box will be returned instead of
 *     latitude and longitude.
 * @return {object} An object literal containing either lat and lon values
 *     (if no accuracy was provided), or top, right, bottom and left values
 *     for the bounding box calculated according to the provided accuracy.
 *     Returns null if the conversion failed.
 */
function UTMtoLL(utm) {

  var UTMNorthing = utm.northing;
  var UTMEasting = utm.easting;
  var zoneLetter = utm.zoneLetter;
  var zoneNumber = utm.zoneNumber;
  // check the ZoneNummber is valid
  if (zoneNumber < 0 || zoneNumber > 60) {
    return null;
  }

  var k0 = 0.9996;
  var a = 6378137.0; //ellip.radius;
  var eccSquared = 0.00669438; //ellip.eccsq;
  var eccPrimeSquared;
  var e1 = (1 - Math.sqrt(1 - eccSquared)) / (1 + Math.sqrt(1 - eccSquared));
  var N1, T1, C1, R1, D, M;
  var LongOrigin;
  var mu, phi1Rad;

  // remove 500,000 meter offset for longitude
  var x = UTMEasting - 500000.0;
  var y = UTMNorthing;

  // We must know somehow if we are in the Northern or Southern
  // hemisphere, this is the only time we use the letter So even
  // if the Zone letter isn't exactly correct it should indicate
  // the hemisphere correctly
  if (zoneLetter < 'N') {
    y -= 10000000.0; // remove 10,000,000 meter offset used
    // for southern hemisphere
  }

  // There are 60 zones with zone 1 being at West -180 to -174
  LongOrigin = (zoneNumber - 1) * 6 - 180 + 3; // +3 puts origin
  // in middle of
  // zone

  eccPrimeSquared = (eccSquared) / (1 - eccSquared);

  M = y / k0;
  mu = M / (a * (1 - eccSquared / 4 - 3 * eccSquared * eccSquared / 64 - 5 * eccSquared * eccSquared * eccSquared / 256));

  phi1Rad = mu + (3 * e1 / 2 - 27 * e1 * e1 * e1 / 32) * Math.sin(2 * mu) + (21 * e1 * e1 / 16 - 55 * e1 * e1 * e1 * e1 / 32) * Math.sin(4 * mu) + (151 * e1 * e1 * e1 / 96) * Math.sin(6 * mu);
  // double phi1 = ProjMath.radToDeg(phi1Rad);

  N1 = a / Math.sqrt(1 - eccSquared * Math.sin(phi1Rad) * Math.sin(phi1Rad));
  T1 = Math.tan(phi1Rad) * Math.tan(phi1Rad);
  C1 = eccPrimeSquared * Math.cos(phi1Rad) * Math.cos(phi1Rad);
  R1 = a * (1 - eccSquared) / Math.pow(1 - eccSquared * Math.sin(phi1Rad) * Math.sin(phi1Rad), 1.5);
  D = x / (N1 * k0);

  var lat = phi1Rad - (N1 * Math.tan(phi1Rad) / R1) * (D * D / 2 - (5 + 3 * T1 + 10 * C1 - 4 * C1 * C1 - 9 * eccPrimeSquared) * D * D * D * D / 24 + (61 + 90 * T1 + 298 * C1 + 45 * T1 * T1 - 252 * eccPrimeSquared - 3 * C1 * C1) * D * D * D * D * D * D / 720);
  lat = radToDeg(lat);

  var lon = (D - (1 + 2 * T1 + C1) * D * D * D / 6 + (5 - 2 * C1 + 28 * T1 - 3 * C1 * C1 + 8 * eccPrimeSquared + 24 * T1 * T1) * D * D * D * D * D / 120) / Math.cos(phi1Rad);
  lon = LongOrigin + radToDeg(lon);

  var result;
  if (utm.accuracy) {
    var topRight = UTMtoLL({
      northing: utm.northing + utm.accuracy,
      easting: utm.easting + utm.accuracy,
      zoneLetter: utm.zoneLetter,
      zoneNumber: utm.zoneNumber
    });
    result = {
      top: topRight.lat,
      right: topRight.lon,
      bottom: lat,
      left: lon
    };
  }
  else {
    result = {
      lat: lat,
      lon: lon
    };
  }
  return result;
}

/**
 * Calculates the MGRS letter designator for the given latitude.
 *
 * @private
 * @param {number} lat The latitude in WGS84 to get the letter designator
 *     for.
 * @return {char} The letter designator.
 */
function getLetterDesignator(lat) {
  //This is here as an error flag to show that the Latitude is
  //outside MGRS limits
  var LetterDesignator = 'Z';

  if ((84 >= lat) && (lat >= 72)) {
    LetterDesignator = 'X';
  }
  else if ((72 > lat) && (lat >= 64)) {
    LetterDesignator = 'W';
  }
  else if ((64 > lat) && (lat >= 56)) {
    LetterDesignator = 'V';
  }
  else if ((56 > lat) && (lat >= 48)) {
    LetterDesignator = 'U';
  }
  else if ((48 > lat) && (lat >= 40)) {
    LetterDesignator = 'T';
  }
  else if ((40 > lat) && (lat >= 32)) {
    LetterDesignator = 'S';
  }
  else if ((32 > lat) && (lat >= 24)) {
    LetterDesignator = 'R';
  }
  else if ((24 > lat) && (lat >= 16)) {
    LetterDesignator = 'Q';
  }
  else if ((16 > lat) && (lat >= 8)) {
    LetterDesignator = 'P';
  }
  else if ((8 > lat) && (lat >= 0)) {
    LetterDesignator = 'N';
  }
  else if ((0 > lat) && (lat >= -8)) {
    LetterDesignator = 'M';
  }
  else if ((-8 > lat) && (lat >= -16)) {
    LetterDesignator = 'L';
  }
  else if ((-16 > lat) && (lat >= -24)) {
    LetterDesignator = 'K';
  }
  else if ((-24 > lat) && (lat >= -32)) {
    LetterDesignator = 'J';
  }
  else if ((-32 > lat) && (lat >= -40)) {
    LetterDesignator = 'H';
  }
  else if ((-40 > lat) && (lat >= -48)) {
    LetterDesignator = 'G';
  }
  else if ((-48 > lat) && (lat >= -56)) {
    LetterDesignator = 'F';
  }
  else if ((-56 > lat) && (lat >= -64)) {
    LetterDesignator = 'E';
  }
  else if ((-64 > lat) && (lat >= -72)) {
    LetterDesignator = 'D';
  }
  else if ((-72 > lat) && (lat >= -80)) {
    LetterDesignator = 'C';
  }
  return LetterDesignator;
}

/**
 * Encodes a UTM location as MGRS string.
 *
 * @private
 * @param {object} utm An object literal with easting, northing,
 *     zoneLetter, zoneNumber
 * @param {number} accuracy Accuracy in digits (1-5).
 * @return {string} MGRS string for the given UTM location.
 */
function encode(utm, accuracy) {
  var seasting = "" + utm.easting,
    snorthing = "" + utm.northing;

  return utm.zoneNumber + utm.zoneLetter + get100kID(utm.easting, utm.northing, utm.zoneNumber) + seasting.substr(seasting.length - 5, accuracy) + snorthing.substr(snorthing.length - 5, accuracy);
}

/**
 * Get the two letter 100k designator for a given UTM easting,
 * northing and zone number value.
 *
 * @private
 * @param {number} easting
 * @param {number} northing
 * @param {number} zoneNumber
 * @return the two letter 100k designator for the given UTM location.
 */
function get100kID(easting, northing, zoneNumber) {
  var setParm = get100kSetForZone(zoneNumber);
  var setColumn = Math.floor(easting / 100000);
  var setRow = Math.floor(northing / 100000) % 20;
  return getLetter100kID(setColumn, setRow, setParm);
}

/**
 * Given a UTM zone number, figure out the MGRS 100K set it is in.
 *
 * @private
 * @param {number} i An UTM zone number.
 * @return {number} the 100k set the UTM zone is in.
 */
function get100kSetForZone(i) {
  var setParm = i % NUM_100K_SETS;
  if (setParm === 0) {
    setParm = NUM_100K_SETS;
  }

  return setParm;
}

/**
 * Get the two-letter MGRS 100k designator given information
 * translated from the UTM northing, easting and zone number.
 *
 * @private
 * @param {number} column the column index as it relates to the MGRS
 *        100k set spreadsheet, created from the UTM easting.
 *        Values are 1-8.
 * @param {number} row the row index as it relates to the MGRS 100k set
 *        spreadsheet, created from the UTM northing value. Values
 *        are from 0-19.
 * @param {number} parm the set block, as it relates to the MGRS 100k set
 *        spreadsheet, created from the UTM zone. Values are from
 *        1-60.
 * @return two letter MGRS 100k code.
 */
function getLetter100kID(column, row, parm) {
  // colOrigin and rowOrigin are the letters at the origin of the set
  var index = parm - 1;
  var colOrigin = SET_ORIGIN_COLUMN_LETTERS.charCodeAt(index);
  var rowOrigin = SET_ORIGIN_ROW_LETTERS.charCodeAt(index);

  // colInt and rowInt are the letters to build to return
  var colInt = colOrigin + column - 1;
  var rowInt = rowOrigin + row;
  var rollover = false;

  if (colInt > Z) {
    colInt = colInt - Z + A - 1;
    rollover = true;
  }

  if (colInt === I || (colOrigin < I && colInt > I) || ((colInt > I || colOrigin < I) && rollover)) {
    colInt++;
  }

  if (colInt === O || (colOrigin < O && colInt > O) || ((colInt > O || colOrigin < O) && rollover)) {
    colInt++;

    if (colInt === I) {
      colInt++;
    }
  }

  if (colInt > Z) {
    colInt = colInt - Z + A - 1;
  }

  if (rowInt > V) {
    rowInt = rowInt - V + A - 1;
    rollover = true;
  }
  else {
    rollover = false;
  }

  if (((rowInt === I) || ((rowOrigin < I) && (rowInt > I))) || (((rowInt > I) || (rowOrigin < I)) && rollover)) {
    rowInt++;
  }

  if (((rowInt === O) || ((rowOrigin < O) && (rowInt > O))) || (((rowInt > O) || (rowOrigin < O)) && rollover)) {
    rowInt++;

    if (rowInt === I) {
      rowInt++;
    }
  }

  if (rowInt > V) {
    rowInt = rowInt - V + A - 1;
  }

  var twoLetter = String.fromCharCode(colInt) + String.fromCharCode(rowInt);
  return twoLetter;
}

/**
 * Decode the UTM parameters from a MGRS string.
 *
 * @private
 * @param {string} mgrsString an UPPERCASE coordinate string is expected.
 * @return {object} An object literal with easting, northing, zoneLetter,
 *     zoneNumber and accuracy (in meters) properties.
 */
function decode(mgrsString) {

  if (mgrsString && mgrsString.length === 0) {
    throw ("MGRSPoint coverting from nothing");
  }

  var length = mgrsString.length;

  var hunK = null;
  var sb = "";
  var testChar;
  var i = 0;

  // get Zone number
  while (!(/[A-Z]/).test(testChar = mgrsString.charAt(i))) {
    if (i >= 2) {
      throw ("MGRSPoint bad conversion from: " + mgrsString);
    }
    sb += testChar;
    i++;
  }

  var zoneNumber = parseInt(sb, 10);

  if (i === 0 || i + 3 > length) {
    // A good MGRS string has to be 4-5 digits long,
    // ##AAA/#AAA at least.
    throw ("MGRSPoint bad conversion from: " + mgrsString);
  }

  var zoneLetter = mgrsString.charAt(i++);

  // Should we check the zone letter here? Why not.
  if (zoneLetter <= 'A' || zoneLetter === 'B' || zoneLetter === 'Y' || zoneLetter >= 'Z' || zoneLetter === 'I' || zoneLetter === 'O') {
    throw ("MGRSPoint zone letter " + zoneLetter + " not handled: " + mgrsString);
  }

  hunK = mgrsString.substring(i, i += 2);

  var set = get100kSetForZone(zoneNumber);

  var east100k = getEastingFromChar(hunK.charAt(0), set);
  var north100k = getNorthingFromChar(hunK.charAt(1), set);

  // We have a bug where the northing may be 2000000 too low.
  // How
  // do we know when to roll over?

  while (north100k < getMinNorthing(zoneLetter)) {
    north100k += 2000000;
  }

  // calculate the char index for easting/northing separator
  var remainder = length - i;

  if (remainder % 2 !== 0) {
    throw ("MGRSPoint has to have an even number \nof digits after the zone letter and two 100km letters - front \nhalf for easting meters, second half for \nnorthing meters" + mgrsString);
  }

  var sep = remainder / 2;

  var sepEasting = 0.0;
  var sepNorthing = 0.0;
  var accuracyBonus, sepEastingString, sepNorthingString, easting, northing;
  if (sep > 0) {
    accuracyBonus = 100000.0 / Math.pow(10, sep);
    sepEastingString = mgrsString.substring(i, i + sep);
    sepEasting = parseFloat(sepEastingString) * accuracyBonus;
    sepNorthingString = mgrsString.substring(i + sep);
    sepNorthing = parseFloat(sepNorthingString) * accuracyBonus;
  }

  easting = sepEasting + east100k;
  northing = sepNorthing + north100k;

  return {
    easting: easting,
    northing: northing,
    zoneLetter: zoneLetter,
    zoneNumber: zoneNumber,
    accuracy: accuracyBonus
  };
}

/**
 * Given the first letter from a two-letter MGRS 100k zone, and given the
 * MGRS table set for the zone number, figure out the easting value that
 * should be added to the other, secondary easting value.
 *
 * @private
 * @param {char} e The first letter from a two-letter MGRS 100´k zone.
 * @param {number} set The MGRS table set for the zone number.
 * @return {number} The easting value for the given letter and set.
 */
function getEastingFromChar(e, set) {
  // colOrigin is the letter at the origin of the set for the
  // column
  var curCol = SET_ORIGIN_COLUMN_LETTERS.charCodeAt(set - 1);
  var eastingValue = 100000.0;
  var rewindMarker = false;

  while (curCol !== e.charCodeAt(0)) {
    curCol++;
    if (curCol === I) {
      curCol++;
    }
    if (curCol === O) {
      curCol++;
    }
    if (curCol > Z) {
      if (rewindMarker) {
        throw ("Bad character: " + e);
      }
      curCol = A;
      rewindMarker = true;
    }
    eastingValue += 100000.0;
  }

  return eastingValue;
}

/**
 * Given the second letter from a two-letter MGRS 100k zone, and given the
 * MGRS table set for the zone number, figure out the northing value that
 * should be added to the other, secondary northing value. You have to
 * remember that Northings are determined from the equator, and the vertical
 * cycle of letters mean a 2000000 additional northing meters. This happens
 * approx. every 18 degrees of latitude. This method does *NOT* count any
 * additional northings. You have to figure out how many 2000000 meters need
 * to be added for the zone letter of the MGRS coordinate.
 *
 * @private
 * @param {char} n Second letter of the MGRS 100k zone
 * @param {number} set The MGRS table set number, which is dependent on the
 *     UTM zone number.
 * @return {number} The northing value for the given letter and set.
 */
function getNorthingFromChar(n, set) {

  if (n > 'V') {
    throw ("MGRSPoint given invalid Northing " + n);
  }

  // rowOrigin is the letter at the origin of the set for the
  // column
  var curRow = SET_ORIGIN_ROW_LETTERS.charCodeAt(set - 1);
  var northingValue = 0.0;
  var rewindMarker = false;

  while (curRow !== n.charCodeAt(0)) {
    curRow++;
    if (curRow === I) {
      curRow++;
    }
    if (curRow === O) {
      curRow++;
    }
    // fixing a bug making whole application hang in this loop
    // when 'n' is a wrong character
    if (curRow > V) {
      if (rewindMarker) { // making sure that this loop ends
        throw ("Bad character: " + n);
      }
      curRow = A;
      rewindMarker = true;
    }
    northingValue += 100000.0;
  }

  return northingValue;
}

/**
 * The function getMinNorthing returns the minimum northing value of a MGRS
 * zone.
 *
 * Ported from Geotrans' c Lattitude_Band_Value structure table.
 *
 * @private
 * @param {char} zoneLetter The MGRS zone to get the min northing for.
 * @return {number}
 */
function getMinNorthing(zoneLetter) {
  var northing;
  switch (zoneLetter) {
  case 'C':
    northing = 1100000.0;
    break;
  case 'D':
    northing = 2000000.0;
    break;
  case 'E':
    northing = 2800000.0;
    break;
  case 'F':
    northing = 3700000.0;
    break;
  case 'G':
    northing = 4600000.0;
    break;
  case 'H':
    northing = 5500000.0;
    break;
  case 'J':
    northing = 6400000.0;
    break;
  case 'K':
    northing = 7300000.0;
    break;
  case 'L':
    northing = 8200000.0;
    break;
  case 'M':
    northing = 9100000.0;
    break;
  case 'N':
    northing = 0.0;
    break;
  case 'P':
    northing = 800000.0;
    break;
  case 'Q':
    northing = 1700000.0;
    break;
  case 'R':
    northing = 2600000.0;
    break;
  case 'S':
    northing = 3500000.0;
    break;
  case 'T':
    northing = 4400000.0;
    break;
  case 'U':
    northing = 5300000.0;
    break;
  case 'V':
    northing = 6200000.0;
    break;
  case 'W':
    northing = 7000000.0;
    break;
  case 'X':
    northing = 7900000.0;
    break;
  default:
    northing = -1.0;
  }
  if (northing >= 0.0) {
    return northing;
  }
  else {
    throw ("Invalid zone letter: " + zoneLetter);
  }

}

},{}],42:[function(require,module,exports){
var common = require('./common');
var constants = require('./constants/index');
module.exports = function(defData) {
  var self = {};

  var paramObj = {};
  defData.split("+").map(function(v) {
    return v.trim();
  }).filter(function(a) {
    return a;
  }).forEach(function(a) {
    var split = a.split("=");
    split.push(true);
    paramObj[split[0].toLowerCase()] = split[1];
  });
  var paramName, paramVal, paramOutname;
  var params = {
    proj: 'projName',
    datum: 'datumCode',
    rf: function(v) {
      self.rf = parseFloat(v, 10);
    },
    lat_0: function(v) {
      self.lat0 = v * common.D2R;
    },
    lat_1: function(v) {
      self.lat1 = v * common.D2R;
    },
    lat_2: function(v) {
      self.lat2 = v * common.D2R;
    },
    lat_ts: function(v) {
      self.lat_ts = v * common.D2R;
    },
    lon_0: function(v) {
      self.long0 = v * common.D2R;
    },
    lon_1: function(v) {
      self.long1 = v * common.D2R;
    },
    lon_2: function(v) {
      self.long2 = v * common.D2R;
    },
    alpha: function(v) {
      self.alpha = parseFloat(v) * common.D2R;
    },
    lonc: function(v) {
      self.longc = v * common.D2R;
    },
    x_0: function(v) {
      self.x0 = parseFloat(v, 10);
    },
    y_0: function(v) {
      self.y0 = parseFloat(v, 10);
    },
    k_0: function(v) {
      self.k0 = parseFloat(v, 10);
    },
    k: function(v) {
      self.k0 = parseFloat(v, 10);
    },
    r_a: function() {
      self.R_A = true;
    },
    zone: function(v) {
      self.zone = parseInt(v, 10);
    },
    south: function() {
      self.utmSouth = true;
    },
    towgs84: function(v) {
      self.datum_params = v.split(",").map(function(a) {
        return parseFloat(a, 10);
      });
    },
    to_meter: function(v) {
      self.to_meter = parseFloat(v, 10);
    },
    from_greenwich: function(v) {
      self.from_greenwich = v * common.D2R;
    },
    pm: function(v) {
      self.from_greenwich = (constants.PrimeMeridian[v] ? constants.PrimeMeridian[v] : parseFloat(v, 10)) * common.D2R;
    },
    nadgrids: function(v) {
      if (v === '@null') {
        self.datumCode = 'none';
      }
      else {
        self.nadgrids = v;
      }
    },
    axis: function(v) {
      var legalAxis = "ewnsud";
      if (v.length === 3 && legalAxis.indexOf(v.substr(0, 1)) !== -1 && legalAxis.indexOf(v.substr(1, 1)) !== -1 && legalAxis.indexOf(v.substr(2, 1)) !== -1) {
        self.axis = v;
      }
    }
  };
  for (paramName in paramObj) {
    paramVal = paramObj[paramName];
    if (paramName in params) {
      paramOutname = params[paramName];
      if (typeof paramOutname === 'function') {
        paramOutname(paramVal);
      }
      else {
        self[paramOutname] = paramVal;
      }
    }
    else {
      self[paramName] = paramVal;
    }
  }
  return self;
};

},{"./common":28,"./constants/index":33}],43:[function(require,module,exports){
var common = require('../common');
exports.init = function() {

  if (Math.abs(this.lat1 + this.lat2) < common.EPSLN) {
    return;
  }
  this.temp = this.b / this.a;
  this.es = 1 - Math.pow(this.temp, 2);
  this.e3 = Math.sqrt(this.es);

  this.sin_po = Math.sin(this.lat1);
  this.cos_po = Math.cos(this.lat1);
  this.t1 = this.sin_po;
  this.con = this.sin_po;
  this.ms1 = common.msfnz(this.e3, this.sin_po, this.cos_po);
  this.qs1 = common.qsfnz(this.e3, this.sin_po, this.cos_po);

  this.sin_po = Math.sin(this.lat2);
  this.cos_po = Math.cos(this.lat2);
  this.t2 = this.sin_po;
  this.ms2 = common.msfnz(this.e3, this.sin_po, this.cos_po);
  this.qs2 = common.qsfnz(this.e3, this.sin_po, this.cos_po);

  this.sin_po = Math.sin(this.lat0);
  this.cos_po = Math.cos(this.lat0);
  this.t3 = this.sin_po;
  this.qs0 = common.qsfnz(this.e3, this.sin_po, this.cos_po);

  if (Math.abs(this.lat1 - this.lat2) > common.EPSLN) {
    this.ns0 = (this.ms1 * this.ms1 - this.ms2 * this.ms2) / (this.qs2 - this.qs1);
  }
  else {
    this.ns0 = this.con;
  }
  this.c = this.ms1 * this.ms1 + this.ns0 * this.qs1;
  this.rh = this.a * Math.sqrt(this.c - this.ns0 * this.qs0) / this.ns0;
};

/* Albers Conical Equal Area forward equations--mapping lat,long to x,y
  -------------------------------------------------------------------*/
exports.forward = function(p) {

  var lon = p.x;
  var lat = p.y;

  this.sin_phi = Math.sin(lat);
  this.cos_phi = Math.cos(lat);

  var qs = common.qsfnz(this.e3, this.sin_phi, this.cos_phi);
  var rh1 = this.a * Math.sqrt(this.c - this.ns0 * qs) / this.ns0;
  var theta = this.ns0 * common.adjust_lon(lon - this.long0);
  var x = rh1 * Math.sin(theta) + this.x0;
  var y = this.rh - rh1 * Math.cos(theta) + this.y0;

  p.x = x;
  p.y = y;
  return p;
};


exports.inverse = function(p) {
  var rh1, qs, con, theta, lon, lat;

  p.x -= this.x0;
  p.y = this.rh - p.y + this.y0;
  if (this.ns0 >= 0) {
    rh1 = Math.sqrt(p.x * p.x + p.y * p.y);
    con = 1;
  }
  else {
    rh1 = -Math.sqrt(p.x * p.x + p.y * p.y);
    con = -1;
  }
  theta = 0;
  if (rh1 !== 0) {
    theta = Math.atan2(con * p.x, con * p.y);
  }
  con = rh1 * this.ns0 / this.a;
  if (this.sphere) {
    lat = Math.asin((this.c - con * con) / (2 * this.ns0));
  }
  else {
    qs = (this.c - con * con) / this.ns0;
    lat = this.phi1z(this.e3, qs);
  }

  lon = common.adjust_lon(theta / this.ns0 + this.long0);
  p.x = lon;
  p.y = lat;
  return p;
};

/* Function to compute phi1, the latitude for the inverse of the
   Albers Conical Equal-Area projection.
-------------------------------------------*/
exports.phi1z = function(eccent, qs) {
  var sinphi, cosphi, con, com, dphi;
  var phi = common.asinz(0.5 * qs);
  if (eccent < common.EPSLN) {
    return phi;
  }

  var eccnts = eccent * eccent;
  for (var i = 1; i <= 25; i++) {
    sinphi = Math.sin(phi);
    cosphi = Math.cos(phi);
    con = eccent * sinphi;
    com = 1 - con * con;
    dphi = 0.5 * com * com / cosphi * (qs / (1 - eccnts) - sinphi / com + 0.5 / eccent * Math.log((1 - con) / (1 + con)));
    phi = phi + dphi;
    if (Math.abs(dphi) <= 1e-7) {
      return phi;
    }
  }
  return null;
};
exports.names = ["Albers_Conic_Equal_Area", "Albers", "aea"];

},{"../common":28}],44:[function(require,module,exports){
var common = require('../common');
exports.init = function() {
  this.sin_p12 = Math.sin(this.lat0);
  this.cos_p12 = Math.cos(this.lat0);
};

exports.forward = function(p) {
  var lon = p.x;
  var lat = p.y;
  var sinphi = Math.sin(p.y);
  var cosphi = Math.cos(p.y);
  var dlon = common.adjust_lon(lon - this.long0);
  var e0, e1, e2, e3, Mlp, Ml, tanphi, Nl1, Nl, psi, Az, G, H, GH, Hs, c, kp, cos_c, s, s2, s3, s4, s5;
  if (this.sphere) {
    if (Math.abs(this.sin_p12 - 1) <= common.EPSLN) {
      //North Pole case
      p.x = this.x0 + this.a * (common.HALF_PI - lat) * Math.sin(dlon);
      p.y = this.y0 - this.a * (common.HALF_PI - lat) * Math.cos(dlon);
      return p;
    }
    else if (Math.abs(this.sin_p12 + 1) <= common.EPSLN) {
      //South Pole case
      p.x = this.x0 + this.a * (common.HALF_PI + lat) * Math.sin(dlon);
      p.y = this.y0 + this.a * (common.HALF_PI + lat) * Math.cos(dlon);
      return p;
    }
    else {
      //default case
      cos_c = this.sin_p12 * sinphi + this.cos_p12 * cosphi * Math.cos(dlon);
      c = Math.acos(cos_c);
      kp = c / Math.sin(c);
      p.x = this.x0 + this.a * kp * cosphi * Math.sin(dlon);
      p.y = this.y0 + this.a * kp * (this.cos_p12 * sinphi - this.sin_p12 * cosphi * Math.cos(dlon));
      return p;
    }
  }
  else {
    e0 = common.e0fn(this.es);
    e1 = common.e1fn(this.es);
    e2 = common.e2fn(this.es);
    e3 = common.e3fn(this.es);
    if (Math.abs(this.sin_p12 - 1) <= common.EPSLN) {
      //North Pole case
      Mlp = this.a * common.mlfn(e0, e1, e2, e3, common.HALF_PI);
      Ml = this.a * common.mlfn(e0, e1, e2, e3, lat);
      p.x = this.x0 + (Mlp - Ml) * Math.sin(dlon);
      p.y = this.y0 - (Mlp - Ml) * Math.cos(dlon);
      return p;
    }
    else if (Math.abs(this.sin_p12 + 1) <= common.EPSLN) {
      //South Pole case
      Mlp = this.a * common.mlfn(e0, e1, e2, e3, common.HALF_PI);
      Ml = this.a * common.mlfn(e0, e1, e2, e3, lat);
      p.x = this.x0 + (Mlp + Ml) * Math.sin(dlon);
      p.y = this.y0 + (Mlp + Ml) * Math.cos(dlon);
      return p;
    }
    else {
      //Default case
      tanphi = sinphi / cosphi;
      Nl1 = common.gN(this.a, this.e, this.sin_p12);
      Nl = common.gN(this.a, this.e, sinphi);
      psi = Math.atan((1 - this.es) * tanphi + this.es * Nl1 * this.sin_p12 / (Nl * cosphi));
      Az = Math.atan2(Math.sin(dlon), this.cos_p12 * Math.tan(psi) - this.sin_p12 * Math.cos(dlon));
      if (Az === 0) {
        s = Math.asin(this.cos_p12 * Math.sin(psi) - this.sin_p12 * Math.cos(psi));
      }
      else if (Math.abs(Math.abs(Az) - common.PI) <= common.EPSLN) {
        s = -Math.asin(this.cos_p12 * Math.sin(psi) - this.sin_p12 * Math.cos(psi));
      }
      else {
        s = Math.asin(Math.sin(dlon) * Math.cos(psi) / Math.sin(Az));
      }
      G = this.e * this.sin_p12 / Math.sqrt(1 - this.es);
      H = this.e * this.cos_p12 * Math.cos(Az) / Math.sqrt(1 - this.es);
      GH = G * H;
      Hs = H * H;
      s2 = s * s;
      s3 = s2 * s;
      s4 = s3 * s;
      s5 = s4 * s;
      c = Nl1 * s * (1 - s2 * Hs * (1 - Hs) / 6 + s3 / 8 * GH * (1 - 2 * Hs) + s4 / 120 * (Hs * (4 - 7 * Hs) - 3 * G * G * (1 - 7 * Hs)) - s5 / 48 * GH);
      p.x = this.x0 + c * Math.sin(Az);
      p.y = this.y0 + c * Math.cos(Az);
      return p;
    }
  }


};

exports.inverse = function(p) {
  p.x -= this.x0;
  p.y -= this.y0;
  var rh, z, sinz, cosz, lon, lat, con, e0, e1, e2, e3, Mlp, M, N1, psi, Az, cosAz, tmp, A, B, D, Ee, F;
  if (this.sphere) {
    rh = Math.sqrt(p.x * p.x + p.y * p.y);
    if (rh > (2 * common.HALF_PI * this.a)) {
      return;
    }
    z = rh / this.a;

    sinz = Math.sin(z);
    cosz = Math.cos(z);

    lon = this.long0;
    if (Math.abs(rh) <= common.EPSLN) {
      lat = this.lat0;
    }
    else {
      lat = common.asinz(cosz * this.sin_p12 + (p.y * sinz * this.cos_p12) / rh);
      con = Math.abs(this.lat0) - common.HALF_PI;
      if (Math.abs(con) <= common.EPSLN) {
        if (this.lat0 >= 0) {
          lon = common.adjust_lon(this.long0 + Math.atan2(p.x, - p.y));
        }
        else {
          lon = common.adjust_lon(this.long0 - Math.atan2(-p.x, p.y));
        }
      }
      else {
        /*con = cosz - this.sin_p12 * Math.sin(lat);
        if ((Math.abs(con) < common.EPSLN) && (Math.abs(p.x) < common.EPSLN)) {
          //no-op, just keep the lon value as is
        } else {
          var temp = Math.atan2((p.x * sinz * this.cos_p12), (con * rh));
          lon = common.adjust_lon(this.long0 + Math.atan2((p.x * sinz * this.cos_p12), (con * rh)));
        }*/
        lon = common.adjust_lon(this.long0 + Math.atan2(p.x * sinz, rh * this.cos_p12 * cosz - p.y * this.sin_p12 * sinz));
      }
    }

    p.x = lon;
    p.y = lat;
    return p;
  }
  else {
    e0 = common.e0fn(this.es);
    e1 = common.e1fn(this.es);
    e2 = common.e2fn(this.es);
    e3 = common.e3fn(this.es);
    if (Math.abs(this.sin_p12 - 1) <= common.EPSLN) {
      //North pole case
      Mlp = this.a * common.mlfn(e0, e1, e2, e3, common.HALF_PI);
      rh = Math.sqrt(p.x * p.x + p.y * p.y);
      M = Mlp - rh;
      lat = common.imlfn(M / this.a, e0, e1, e2, e3);
      lon = common.adjust_lon(this.long0 + Math.atan2(p.x, - 1 * p.y));
      p.x = lon;
      p.y = lat;
      return p;
    }
    else if (Math.abs(this.sin_p12 + 1) <= common.EPSLN) {
      //South pole case
      Mlp = this.a * common.mlfn(e0, e1, e2, e3, common.HALF_PI);
      rh = Math.sqrt(p.x * p.x + p.y * p.y);
      M = rh - Mlp;

      lat = common.imlfn(M / this.a, e0, e1, e2, e3);
      lon = common.adjust_lon(this.long0 + Math.atan2(p.x, p.y));
      p.x = lon;
      p.y = lat;
      return p;
    }
    else {
      //default case
      rh = Math.sqrt(p.x * p.x + p.y * p.y);
      Az = Math.atan2(p.x, p.y);
      N1 = common.gN(this.a, this.e, this.sin_p12);
      cosAz = Math.cos(Az);
      tmp = this.e * this.cos_p12 * cosAz;
      A = -tmp * tmp / (1 - this.es);
      B = 3 * this.es * (1 - A) * this.sin_p12 * this.cos_p12 * cosAz / (1 - this.es);
      D = rh / N1;
      Ee = D - A * (1 + A) * Math.pow(D, 3) / 6 - B * (1 + 3 * A) * Math.pow(D, 4) / 24;
      F = 1 - A * Ee * Ee / 2 - D * Ee * Ee * Ee / 6;
      psi = Math.asin(this.sin_p12 * Math.cos(Ee) + this.cos_p12 * Math.sin(Ee) * cosAz);
      lon = common.adjust_lon(this.long0 + Math.asin(Math.sin(Az) * Math.sin(Ee) / Math.cos(psi)));
      lat = Math.atan((1 - this.es * F * this.sin_p12 / Math.sin(psi)) * Math.tan(psi) / (1 - this.es));
      p.x = lon;
      p.y = lat;
      return p;
    }
  }

};
exports.names = ["Azimuthal_Equidistant", "aeqd"];

},{"../common":28}],45:[function(require,module,exports){
var common = require('../common');
exports.init = function() {
  if (!this.sphere) {
    this.e0 = common.e0fn(this.es);
    this.e1 = common.e1fn(this.es);
    this.e2 = common.e2fn(this.es);
    this.e3 = common.e3fn(this.es);
    this.ml0 = this.a * common.mlfn(this.e0, this.e1, this.e2, this.e3, this.lat0);
  }
};



/* Cassini forward equations--mapping lat,long to x,y
  -----------------------------------------------------------------------*/
exports.forward = function(p) {

  /* Forward equations
      -----------------*/
  var x, y;
  var lam = p.x;
  var phi = p.y;
  lam = common.adjust_lon(lam - this.long0);

  if (this.sphere) {
    x = this.a * Math.asin(Math.cos(phi) * Math.sin(lam));
    y = this.a * (Math.atan2(Math.tan(phi), Math.cos(lam)) - this.lat0);
  }
  else {
    //ellipsoid
    var sinphi = Math.sin(phi);
    var cosphi = Math.cos(phi);
    var nl = common.gN(this.a, this.e, sinphi);
    var tl = Math.tan(phi) * Math.tan(phi);
    var al = lam * Math.cos(phi);
    var asq = al * al;
    var cl = this.es * cosphi * cosphi / (1 - this.es);
    var ml = this.a * common.mlfn(this.e0, this.e1, this.e2, this.e3, phi);

    x = nl * al * (1 - asq * tl * (1 / 6 - (8 - tl + 8 * cl) * asq / 120));
    y = ml - this.ml0 + nl * sinphi / cosphi * asq * (0.5 + (5 - tl + 6 * cl) * asq / 24);


  }

  p.x = x + this.x0;
  p.y = y + this.y0;
  return p;
};

/* Inverse equations
  -----------------*/
exports.inverse = function(p) {
  p.x -= this.x0;
  p.y -= this.y0;
  var x = p.x / this.a;
  var y = p.y / this.a;
  var phi, lam;

  if (this.sphere) {
    var dd = y + this.lat0;
    phi = Math.asin(Math.sin(dd) * Math.cos(x));
    lam = Math.atan2(Math.tan(x), Math.cos(dd));
  }
  else {
    /* ellipsoid */
    var ml1 = this.ml0 / this.a + y;
    var phi1 = common.imlfn(ml1, this.e0, this.e1, this.e2, this.e3);
    if (Math.abs(Math.abs(phi1) - common.HALF_PI) <= common.EPSLN) {
      p.x = this.long0;
      p.y = common.HALF_PI;
      if (y < 0) {
        p.y *= -1;
      }
      return p;
    }
    var nl1 = common.gN(this.a, this.e, Math.sin(phi1));

    var rl1 = nl1 * nl1 * nl1 / this.a / this.a * (1 - this.es);
    var tl1 = Math.pow(Math.tan(phi1), 2);
    var dl = x * this.a / nl1;
    var dsq = dl * dl;
    phi = phi1 - nl1 * Math.tan(phi1) / rl1 * dl * dl * (0.5 - (1 + 3 * tl1) * dl * dl / 24);
    lam = dl * (1 - dsq * (tl1 / 3 + (1 + 3 * tl1) * tl1 * dsq / 15)) / Math.cos(phi1);

  }

  p.x = common.adjust_lon(lam + this.long0);
  p.y = common.adjust_lat(phi);
  return p;

};
exports.names = ["Cassini", "Cassini_Soldner", "cass"];
},{"../common":28}],46:[function(require,module,exports){
var common = require('../common');
/*
  reference:  
    "Cartographic Projection Procedures for the UNIX Environment-
    A User's Manual" by Gerald I. Evenden,
    USGS Open File Report 90-284and Release 4 Interim Reports (2003)
*/
exports.init = function() {
  //no-op
  if (!this.sphere) {
    this.k0 = common.msfnz(this.e, Math.sin(this.lat_ts), Math.cos(this.lat_ts));
  }
};


/* Cylindrical Equal Area forward equations--mapping lat,long to x,y
    ------------------------------------------------------------*/
exports.forward = function(p) {
  var lon = p.x;
  var lat = p.y;
  var x, y;
  /* Forward equations
      -----------------*/
  var dlon = common.adjust_lon(lon - this.long0);
  if (this.sphere) {
    x = this.x0 + this.a * dlon * Math.cos(this.lat_ts);
    y = this.y0 + this.a * Math.sin(lat) / Math.cos(this.lat_ts);
  }
  else {
    var qs = common.qsfnz(this.e, Math.sin(lat));
    x = this.x0 + this.a * this.k0 * dlon;
    y = this.y0 + this.a * qs * 0.5 / this.k0;
  }

  p.x = x;
  p.y = y;
  return p;
};

/* Cylindrical Equal Area inverse equations--mapping x,y to lat/long
    ------------------------------------------------------------*/
exports.inverse = function(p) {
  p.x -= this.x0;
  p.y -= this.y0;
  var lon, lat;

  if (this.sphere) {
    lon = common.adjust_lon(this.long0 + (p.x / this.a) / Math.cos(this.lat_ts));
    lat = Math.asin((p.y / this.a) * Math.cos(this.lat_ts));
  }
  else {
    lat = common.iqsfnz(this.e, 2 * p.y * this.k0 / this.a);
    lon = common.adjust_lon(this.long0 + p.x / (this.a * this.k0));
  }

  p.x = lon;
  p.y = lat;
  return p;
};
exports.names = ["cea"];

},{"../common":28}],47:[function(require,module,exports){
var common = require('../common');
exports.init = function() {

  this.x0 = this.x0 || 0;
  this.y0 = this.y0 || 0;
  this.lat0 = this.lat0 || 0;
  this.long0 = this.long0 || 0;
  this.lat_ts = this.lat_t || 0;
  this.title = this.title || "Equidistant Cylindrical (Plate Carre)";

  this.rc = Math.cos(this.lat_ts);
};


// forward equations--mapping lat,long to x,y
// -----------------------------------------------------------------
exports.forward = function(p) {

  var lon = p.x;
  var lat = p.y;

  var dlon = common.adjust_lon(lon - this.long0);
  var dlat = common.adjust_lat(lat - this.lat0);
  p.x = this.x0 + (this.a * dlon * this.rc);
  p.y = this.y0 + (this.a * dlat);
  return p;
};

// inverse equations--mapping x,y to lat/long
// -----------------------------------------------------------------
exports.inverse = function(p) {

  var x = p.x;
  var y = p.y;

  p.x = common.adjust_lon(this.long0 + ((x - this.x0) / (this.a * this.rc)));
  p.y = common.adjust_lat(this.lat0 + ((y - this.y0) / (this.a)));
  return p;
};
exports.names = ["Equirectangular", "Equidistant_Cylindrical", "eqc"];

},{"../common":28}],48:[function(require,module,exports){
var common = require('../common');
exports.init = function() {

  /* Place parameters in static storage for common use
      -------------------------------------------------*/
  // Standard Parallels cannot be equal and on opposite sides of the equator
  if (Math.abs(this.lat1 + this.lat2) < common.EPSLN) {
    common.reportError("eqdc:init: Equal Latitudes");
    return;
  }
  this.lat2 = this.lat2 || this.lat1;
  this.temp = this.b / this.a;
  this.es = 1 - Math.pow(this.temp, 2);
  this.e = Math.sqrt(this.es);
  this.e0 = common.e0fn(this.es);
  this.e1 = common.e1fn(this.es);
  this.e2 = common.e2fn(this.es);
  this.e3 = common.e3fn(this.es);

  this.sinphi = Math.sin(this.lat1);
  this.cosphi = Math.cos(this.lat1);

  this.ms1 = common.msfnz(this.e, this.sinphi, this.cosphi);
  this.ml1 = common.mlfn(this.e0, this.e1, this.e2, this.e3, this.lat1);

  if (Math.abs(this.lat1 - this.lat2) < common.EPSLN) {
    this.ns = this.sinphi;
  }
  else {
    this.sinphi = Math.sin(this.lat2);
    this.cosphi = Math.cos(this.lat2);
    this.ms2 = common.msfnz(this.e, this.sinphi, this.cosphi);
    this.ml2 = common.mlfn(this.e0, this.e1, this.e2, this.e3, this.lat2);
    this.ns = (this.ms1 - this.ms2) / (this.ml2 - this.ml1);
  }
  this.g = this.ml1 + this.ms1 / this.ns;
  this.ml0 = common.mlfn(this.e0, this.e1, this.e2, this.e3, this.lat0);
  this.rh = this.a * (this.g - this.ml0);
};


/* Equidistant Conic forward equations--mapping lat,long to x,y
  -----------------------------------------------------------*/
exports.forward = function(p) {
  var lon = p.x;
  var lat = p.y;
  var rh1;

  /* Forward equations
      -----------------*/
  if (this.sphere) {
    rh1 = this.a * (this.g - lat);
  }
  else {
    var ml = common.mlfn(this.e0, this.e1, this.e2, this.e3, lat);
    rh1 = this.a * (this.g - ml);
  }
  var theta = this.ns * common.adjust_lon(lon - this.long0);
  var x = this.x0 + rh1 * Math.sin(theta);
  var y = this.y0 + this.rh - rh1 * Math.cos(theta);
  p.x = x;
  p.y = y;
  return p;
};

/* Inverse equations
  -----------------*/
exports.inverse = function(p) {
  p.x -= this.x0;
  p.y = this.rh - p.y + this.y0;
  var con, rh1, lat, lon;
  if (this.ns >= 0) {
    rh1 = Math.sqrt(p.x * p.x + p.y * p.y);
    con = 1;
  }
  else {
    rh1 = -Math.sqrt(p.x * p.x + p.y * p.y);
    con = -1;
  }
  var theta = 0;
  if (rh1 !== 0) {
    theta = Math.atan2(con * p.x, con * p.y);
  }

  if (this.sphere) {
    lon = common.adjust_lon(this.long0 + theta / this.ns);
    lat = common.adjust_lat(this.g - rh1 / this.a);
    p.x = lon;
    p.y = lat;
    return p;
  }
  else {
    var ml = this.g - rh1 / this.a;
    lat = common.imlfn(ml, this.e0, this.e1, this.e2, this.e3);
    lon = common.adjust_lon(this.long0 + theta / this.ns);
    p.x = lon;
    p.y = lat;
    return p;
  }

};
exports.names = ["Equidistant_Conic", "eqdc"];

},{"../common":28}],49:[function(require,module,exports){
var common = require('../common');
exports.init = function() {
  var sphi = Math.sin(this.lat0);
  var cphi = Math.cos(this.lat0);
  cphi *= cphi;
  this.rc = Math.sqrt(1 - this.es) / (1 - this.es * sphi * sphi);
  this.C = Math.sqrt(1 + this.es * cphi * cphi / (1 - this.es));
  this.phic0 = Math.asin(sphi / this.C);
  this.ratexp = 0.5 * this.C * this.e;
  this.K = Math.tan(0.5 * this.phic0 + common.FORTPI) / (Math.pow(Math.tan(0.5 * this.lat0 + common.FORTPI), this.C) * common.srat(this.e * sphi, this.ratexp));
};

exports.forward = function(p) {
  var lon = p.x;
  var lat = p.y;

  p.y = 2 * Math.atan(this.K * Math.pow(Math.tan(0.5 * lat + common.FORTPI), this.C) * common.srat(this.e * Math.sin(lat), this.ratexp)) - common.HALF_PI;
  p.x = this.C * lon;
  return p;
};

exports.inverse = function(p) {
  var DEL_TOL = 1e-14;
  var lon = p.x / this.C;
  var lat = p.y;
  var num = Math.pow(Math.tan(0.5 * lat + common.FORTPI) / this.K, 1 / this.C);
  for (var i = common.MAX_ITER; i > 0; --i) {
    lat = 2 * Math.atan(num * common.srat(this.e * Math.sin(p.y), - 0.5 * this.e)) - common.HALF_PI;
    if (Math.abs(lat - p.y) < DEL_TOL) {
      break;
    }
    p.y = lat;
  }
  /* convergence failed */
  if (!i) {
    return null;
  }
  p.x = lon;
  p.y = lat;
  return p;
};
exports.names = ["gauss"];

},{"../common":28}],50:[function(require,module,exports){
var common = require('../common');
/*
  reference:
    Wolfram Mathworld "Gnomonic Projection"
    http://mathworld.wolfram.com/GnomonicProjection.html
    Accessed: 12th November 2009
  */
exports.init = function() {

  /* Place parameters in static storage for common use
      -------------------------------------------------*/
  this.sin_p14 = Math.sin(this.lat0);
  this.cos_p14 = Math.cos(this.lat0);
  // Approximation for projecting points to the horizon (infinity)
  this.infinity_dist = 1000 * this.a;
  this.rc = 1;
};


/* Gnomonic forward equations--mapping lat,long to x,y
    ---------------------------------------------------*/
exports.forward = function(p) {
  var sinphi, cosphi; /* sin and cos value        */
  var dlon; /* delta longitude value      */
  var coslon; /* cos of longitude        */
  var ksp; /* scale factor          */
  var g;
  var x, y;
  var lon = p.x;
  var lat = p.y;
  /* Forward equations
      -----------------*/
  dlon = common.adjust_lon(lon - this.long0);

  sinphi = Math.sin(lat);
  cosphi = Math.cos(lat);

  coslon = Math.cos(dlon);
  g = this.sin_p14 * sinphi + this.cos_p14 * cosphi * coslon;
  ksp = 1;
  if ((g > 0) || (Math.abs(g) <= common.EPSLN)) {
    x = this.x0 + this.a * ksp * cosphi * Math.sin(dlon) / g;
    y = this.y0 + this.a * ksp * (this.cos_p14 * sinphi - this.sin_p14 * cosphi * coslon) / g;
  }
  else {

    // Point is in the opposing hemisphere and is unprojectable
    // We still need to return a reasonable point, so we project 
    // to infinity, on a bearing 
    // equivalent to the northern hemisphere equivalent
    // This is a reasonable approximation for short shapes and lines that 
    // straddle the horizon.

    x = this.x0 + this.infinity_dist * cosphi * Math.sin(dlon);
    y = this.y0 + this.infinity_dist * (this.cos_p14 * sinphi - this.sin_p14 * cosphi * coslon);

  }
  p.x = x;
  p.y = y;
  return p;
};


exports.inverse = function(p) {
  var rh; /* Rho */
  var sinc, cosc;
  var c;
  var lon, lat;

  /* Inverse equations
      -----------------*/
  p.x = (p.x - this.x0) / this.a;
  p.y = (p.y - this.y0) / this.a;

  p.x /= this.k0;
  p.y /= this.k0;

  if ((rh = Math.sqrt(p.x * p.x + p.y * p.y))) {
    c = Math.atan2(rh, this.rc);
    sinc = Math.sin(c);
    cosc = Math.cos(c);

    lat = common.asinz(cosc * this.sin_p14 + (p.y * sinc * this.cos_p14) / rh);
    lon = Math.atan2(p.x * sinc, rh * this.cos_p14 * cosc - p.y * this.sin_p14 * sinc);
    lon = common.adjust_lon(this.long0 + lon);
  }
  else {
    lat = this.phic0;
    lon = 0;
  }

  p.x = lon;
  p.y = lat;
  return p;
};
exports.names = ["gnom"];

},{"../common":28}],51:[function(require,module,exports){
var projs = [
  require('./tmerc'),
  require('./utm'),
  require('./sterea'),
  require('./stere'),
  require('./somerc'),
  require('./omerc'),
  require('./lcc'),
  require('./krovak'),
  require('./cass'),
  require('./laea'),
  require('./merc'),
  require('./aea'),
  require('./gnom'),
  require('./cea'),
  require('./eqc'),
  require('./poly'),
  require('./nzmg'),
  require('./mill'),
  require('./sinu'),
  require('./moll'),
  require('./eqdc'),
  require('./vandg'),
  require('./aeqd'),
  require('./longlat')
];
var names = {};
var projStore = [];

function add(proj, i) {
  var len = projStore.length;
  if (!proj.names) {
    console.log(i);
    return true;
  }
  projStore[len] = proj;
  proj.names.forEach(function(n) {
    names[n.toLowerCase()] = len;
  });
  return this;
}

exports.add = add;

exports.get = function(name) {
  if (!name) {
    return false;
  }
  var n = name.toLowerCase();
  if (typeof names[n] !== 'undefined' && projStore[names[n]]) {
    return projStore[names[n]];
  }
};
exports.start = function() {
  projs.forEach(add);
};

},{"./aea":43,"./aeqd":44,"./cass":45,"./cea":46,"./eqc":47,"./eqdc":48,"./gnom":50,"./krovak":52,"./laea":53,"./lcc":54,"./longlat":55,"./merc":56,"./mill":57,"./moll":58,"./nzmg":59,"./omerc":60,"./poly":61,"./sinu":62,"./somerc":63,"./stere":64,"./sterea":65,"./tmerc":66,"./utm":67,"./vandg":68}],52:[function(require,module,exports){
var common = require('../common');
exports.init = function() {
  this.a = 6377397.155;
  this.es = 0.006674372230614;
  this.e = Math.sqrt(this.es);
  if (!this.lat0) {
    this.lat0 = 0.863937979737193;
  }
  if (!this.long0) {
    this.long0 = 0.7417649320975901 - 0.308341501185665;
  }
  /* if scale not set default to 0.9999 */
  if (!this.k0) {
    this.k0 = 0.9999;
  }
  this.s45 = 0.785398163397448; /* 45 */
  this.s90 = 2 * this.s45;
  this.fi0 = this.lat0;
  this.e2 = this.es;
  this.e = Math.sqrt(this.e2);
  this.alfa = Math.sqrt(1 + (this.e2 * Math.pow(Math.cos(this.fi0), 4)) / (1 - this.e2));
  this.uq = 1.04216856380474;
  this.u0 = Math.asin(Math.sin(this.fi0) / this.alfa);
  this.g = Math.pow((1 + this.e * Math.sin(this.fi0)) / (1 - this.e * Math.sin(this.fi0)), this.alfa * this.e / 2);
  this.k = Math.tan(this.u0 / 2 + this.s45) / Math.pow(Math.tan(this.fi0 / 2 + this.s45), this.alfa) * this.g;
  this.k1 = this.k0;
  this.n0 = this.a * Math.sqrt(1 - this.e2) / (1 - this.e2 * Math.pow(Math.sin(this.fi0), 2));
  this.s0 = 1.37008346281555;
  this.n = Math.sin(this.s0);
  this.ro0 = this.k1 * this.n0 / Math.tan(this.s0);
  this.ad = this.s90 - this.uq;
};

/* ellipsoid */
/* calculate xy from lat/lon */
/* Constants, identical to inverse transform function */
exports.forward = function(p) {
  var gfi, u, deltav, s, d, eps, ro;
  var lon = p.x;
  var lat = p.y;
  var delta_lon = common.adjust_lon(lon - this.long0);
  /* Transformation */
  gfi = Math.pow(((1 + this.e * Math.sin(lat)) / (1 - this.e * Math.sin(lat))), (this.alfa * this.e / 2));
  u = 2 * (Math.atan(this.k * Math.pow(Math.tan(lat / 2 + this.s45), this.alfa) / gfi) - this.s45);
  deltav = -delta_lon * this.alfa;
  s = Math.asin(Math.cos(this.ad) * Math.sin(u) + Math.sin(this.ad) * Math.cos(u) * Math.cos(deltav));
  d = Math.asin(Math.cos(u) * Math.sin(deltav) / Math.cos(s));
  eps = this.n * d;
  ro = this.ro0 * Math.pow(Math.tan(this.s0 / 2 + this.s45), this.n) / Math.pow(Math.tan(s / 2 + this.s45), this.n);
  p.y = ro * Math.cos(eps) / 1;
  p.x = ro * Math.sin(eps) / 1;

  if (!this.czech) {
    p.y *= -1;
    p.x *= -1;
  }
  return (p);
};

/* calculate lat/lon from xy */
exports.inverse = function(p) {
  var u, deltav, s, d, eps, ro, fi1;
  var ok;

  /* Transformation */
  /* revert y, x*/
  var tmp = p.x;
  p.x = p.y;
  p.y = tmp;
  if (!this.czech) {
    p.y *= -1;
    p.x *= -1;
  }
  ro = Math.sqrt(p.x * p.x + p.y * p.y);
  eps = Math.atan2(p.y, p.x);
  d = eps / Math.sin(this.s0);
  s = 2 * (Math.atan(Math.pow(this.ro0 / ro, 1 / this.n) * Math.tan(this.s0 / 2 + this.s45)) - this.s45);
  u = Math.asin(Math.cos(this.ad) * Math.sin(s) - Math.sin(this.ad) * Math.cos(s) * Math.cos(d));
  deltav = Math.asin(Math.cos(s) * Math.sin(d) / Math.cos(u));
  p.x = this.long0 - deltav / this.alfa;
  fi1 = u;
  ok = 0;
  var iter = 0;
  do {
    p.y = 2 * (Math.atan(Math.pow(this.k, - 1 / this.alfa) * Math.pow(Math.tan(u / 2 + this.s45), 1 / this.alfa) * Math.pow((1 + this.e * Math.sin(fi1)) / (1 - this.e * Math.sin(fi1)), this.e / 2)) - this.s45);
    if (Math.abs(fi1 - p.y) < 0.0000000001) {
      ok = 1;
    }
    fi1 = p.y;
    iter += 1;
  } while (ok === 0 && iter < 15);
  if (iter >= 15) {
    return null;
  }

  return (p);
};
exports.names = ["Krovak", "krovak"];

},{"../common":28}],53:[function(require,module,exports){
var common = require('../common');
/*
  reference
    "New Equal-Area Map Projections for Noncircular Regions", John P. Snyder,
    The American Cartographer, Vol 15, No. 4, October 1988, pp. 341-355.
  */

exports.S_POLE = 1;
exports.N_POLE = 2;
exports.EQUIT = 3;
exports.OBLIQ = 4;


/* Initialize the Lambert Azimuthal Equal Area projection
  ------------------------------------------------------*/
exports.init = function() {
  var t = Math.abs(this.lat0);
  if (Math.abs(t - common.HALF_PI) < common.EPSLN) {
    this.mode = this.lat0 < 0 ? this.S_POLE : this.N_POLE;
  }
  else if (Math.abs(t) < common.EPSLN) {
    this.mode = this.EQUIT;
  }
  else {
    this.mode = this.OBLIQ;
  }
  if (this.es > 0) {
    var sinphi;

    this.qp = common.qsfnz(this.e, 1);
    this.mmf = 0.5 / (1 - this.es);
    this.apa = this.authset(this.es);
    switch (this.mode) {
    case this.N_POLE:
      this.dd = 1;
      break;
    case this.S_POLE:
      this.dd = 1;
      break;
    case this.EQUIT:
      this.rq = Math.sqrt(0.5 * this.qp);
      this.dd = 1 / this.rq;
      this.xmf = 1;
      this.ymf = 0.5 * this.qp;
      break;
    case this.OBLIQ:
      this.rq = Math.sqrt(0.5 * this.qp);
      sinphi = Math.sin(this.lat0);
      this.sinb1 = common.qsfnz(this.e, sinphi) / this.qp;
      this.cosb1 = Math.sqrt(1 - this.sinb1 * this.sinb1);
      this.dd = Math.cos(this.lat0) / (Math.sqrt(1 - this.es * sinphi * sinphi) * this.rq * this.cosb1);
      this.ymf = (this.xmf = this.rq) / this.dd;
      this.xmf *= this.dd;
      break;
    }
  }
  else {
    if (this.mode === this.OBLIQ) {
      this.sinph0 = Math.sin(this.lat0);
      this.cosph0 = Math.cos(this.lat0);
    }
  }
};

/* Lambert Azimuthal Equal Area forward equations--mapping lat,long to x,y
  -----------------------------------------------------------------------*/
exports.forward = function(p) {

  /* Forward equations
      -----------------*/
  var x, y, coslam, sinlam, sinphi, q, sinb, cosb, b, cosphi;
  var lam = p.x;
  var phi = p.y;

  lam = common.adjust_lon(lam - this.long0);

  if (this.sphere) {
    sinphi = Math.sin(phi);
    cosphi = Math.cos(phi);
    coslam = Math.cos(lam);
    if (this.mode === this.OBLIQ || this.mode === this.EQUIT) {
      y = (this.mode === this.EQUIT) ? 1 + cosphi * coslam : 1 + this.sinph0 * sinphi + this.cosph0 * cosphi * coslam;
      if (y <= common.EPSLN) {
        return null;
      }
      y = Math.sqrt(2 / y);
      x = y * cosphi * Math.sin(lam);
      y *= (this.mode === this.EQUIT) ? sinphi : this.cosph0 * sinphi - this.sinph0 * cosphi * coslam;
    }
    else if (this.mode === this.N_POLE || this.mode === this.S_POLE) {
      if (this.mode === this.N_POLE) {
        coslam = -coslam;
      }
      if (Math.abs(phi + this.phi0) < common.EPSLN) {
        return null;
      }
      y = common.FORTPI - phi * 0.5;
      y = 2 * ((this.mode === this.S_POLE) ? Math.cos(y) : Math.sin(y));
      x = y * Math.sin(lam);
      y *= coslam;
    }
  }
  else {
    sinb = 0;
    cosb = 0;
    b = 0;
    coslam = Math.cos(lam);
    sinlam = Math.sin(lam);
    sinphi = Math.sin(phi);
    q = common.qsfnz(this.e, sinphi);
    if (this.mode === this.OBLIQ || this.mode === this.EQUIT) {
      sinb = q / this.qp;
      cosb = Math.sqrt(1 - sinb * sinb);
    }
    switch (this.mode) {
    case this.OBLIQ:
      b = 1 + this.sinb1 * sinb + this.cosb1 * cosb * coslam;
      break;
    case this.EQUIT:
      b = 1 + cosb * coslam;
      break;
    case this.N_POLE:
      b = common.HALF_PI + phi;
      q = this.qp - q;
      break;
    case this.S_POLE:
      b = phi - common.HALF_PI;
      q = this.qp + q;
      break;
    }
    if (Math.abs(b) < common.EPSLN) {
      return null;
    }
    switch (this.mode) {
    case this.OBLIQ:
    case this.EQUIT:
      b = Math.sqrt(2 / b);
      if (this.mode === this.OBLIQ) {
        y = this.ymf * b * (this.cosb1 * sinb - this.sinb1 * cosb * coslam);
      }
      else {
        y = (b = Math.sqrt(2 / (1 + cosb * coslam))) * sinb * this.ymf;
      }
      x = this.xmf * b * cosb * sinlam;
      break;
    case this.N_POLE:
    case this.S_POLE:
      if (q >= 0) {
        x = (b = Math.sqrt(q)) * sinlam;
        y = coslam * ((this.mode === this.S_POLE) ? b : -b);
      }
      else {
        x = y = 0;
      }
      break;
    }
  }

  p.x = this.a * x + this.x0;
  p.y = this.a * y + this.y0;
  return p;
};

/* Inverse equations
  -----------------*/
exports.inverse = function(p) {
  p.x -= this.x0;
  p.y -= this.y0;
  var x = p.x / this.a;
  var y = p.y / this.a;
  var lam, phi, cCe, sCe, q, rho, ab;

  if (this.sphere) {
    var cosz = 0,
      rh, sinz = 0;

    rh = Math.sqrt(x * x + y * y);
    phi = rh * 0.5;
    if (phi > 1) {
      return null;
    }
    phi = 2 * Math.asin(phi);
    if (this.mode === this.OBLIQ || this.mode === this.EQUIT) {
      sinz = Math.sin(phi);
      cosz = Math.cos(phi);
    }
    switch (this.mode) {
    case this.EQUIT:
      phi = (Math.abs(rh) <= common.EPSLN) ? 0 : Math.asin(y * sinz / rh);
      x *= sinz;
      y = cosz * rh;
      break;
    case this.OBLIQ:
      phi = (Math.abs(rh) <= common.EPSLN) ? this.phi0 : Math.asin(cosz * this.sinph0 + y * sinz * this.cosph0 / rh);
      x *= sinz * this.cosph0;
      y = (cosz - Math.sin(phi) * this.sinph0) * rh;
      break;
    case this.N_POLE:
      y = -y;
      phi = common.HALF_PI - phi;
      break;
    case this.S_POLE:
      phi -= common.HALF_PI;
      break;
    }
    lam = (y === 0 && (this.mode === this.EQUIT || this.mode === this.OBLIQ)) ? 0 : Math.atan2(x, y);
  }
  else {
    ab = 0;
    if (this.mode === this.OBLIQ || this.mode === this.EQUIT) {
      x /= this.dd;
      y *= this.dd;
      rho = Math.sqrt(x * x + y * y);
      if (rho < common.EPSLN) {
        p.x = 0;
        p.y = this.phi0;
        return p;
      }
      sCe = 2 * Math.asin(0.5 * rho / this.rq);
      cCe = Math.cos(sCe);
      x *= (sCe = Math.sin(sCe));
      if (this.mode === this.OBLIQ) {
        ab = cCe * this.sinb1 + y * sCe * this.cosb1 / rho;
        q = this.qp * ab;
        y = rho * this.cosb1 * cCe - y * this.sinb1 * sCe;
      }
      else {
        ab = y * sCe / rho;
        q = this.qp * ab;
        y = rho * cCe;
      }
    }
    else if (this.mode === this.N_POLE || this.mode === this.S_POLE) {
      if (this.mode === this.N_POLE) {
        y = -y;
      }
      q = (x * x + y * y);
      if (!q) {
        p.x = 0;
        p.y = this.phi0;
        return p;
      }
      ab = 1 - q / this.qp;
      if (this.mode === this.S_POLE) {
        ab = -ab;
      }
    }
    lam = Math.atan2(x, y);
    phi = this.authlat(Math.asin(ab), this.apa);
  }


  p.x = common.adjust_lon(this.long0 + lam);
  p.y = phi;
  return p;
};

/* determine latitude from authalic latitude */
exports.P00 = 0.33333333333333333333;
exports.P01 = 0.17222222222222222222;
exports.P02 = 0.10257936507936507936;
exports.P10 = 0.06388888888888888888;
exports.P11 = 0.06640211640211640211;
exports.P20 = 0.01641501294219154443;

exports.authset = function(es) {
  var t;
  var APA = [];
  APA[0] = es * this.P00;
  t = es * es;
  APA[0] += t * this.P01;
  APA[1] = t * this.P10;
  t *= es;
  APA[0] += t * this.P02;
  APA[1] += t * this.P11;
  APA[2] = t * this.P20;
  return APA;
};

exports.authlat = function(beta, APA) {
  var t = beta + beta;
  return (beta + APA[0] * Math.sin(t) + APA[1] * Math.sin(t + t) + APA[2] * Math.sin(t + t + t));
};
exports.names = ["Lambert Azimuthal Equal Area", "Lambert_Azimuthal_Equal_Area", "laea"];

},{"../common":28}],54:[function(require,module,exports){
var common = require('../common');
exports.init = function() {

  // array of:  r_maj,r_min,lat1,lat2,c_lon,c_lat,false_east,false_north
  //double c_lat;                   /* center latitude                      */
  //double c_lon;                   /* center longitude                     */
  //double lat1;                    /* first standard parallel              */
  //double lat2;                    /* second standard parallel             */
  //double r_maj;                   /* major axis                           */
  //double r_min;                   /* minor axis                           */
  //double false_east;              /* x offset in meters                   */
  //double false_north;             /* y offset in meters                   */

  if (!this.lat2) {
    this.lat2 = this.lat1;
  } //if lat2 is not defined
  if (!this.k0) {
    this.k0 = 1;
  }

  // Standard Parallels cannot be equal and on opposite sides of the equator
  if (Math.abs(this.lat1 + this.lat2) < common.EPSLN) {
    return;
  }

  var temp = this.b / this.a;
  this.e = Math.sqrt(1 - temp * temp);

  var sin1 = Math.sin(this.lat1);
  var cos1 = Math.cos(this.lat1);
  var ms1 = common.msfnz(this.e, sin1, cos1);
  var ts1 = common.tsfnz(this.e, this.lat1, sin1);

  var sin2 = Math.sin(this.lat2);
  var cos2 = Math.cos(this.lat2);
  var ms2 = common.msfnz(this.e, sin2, cos2);
  var ts2 = common.tsfnz(this.e, this.lat2, sin2);

  var ts0 = common.tsfnz(this.e, this.lat0, Math.sin(this.lat0));

  if (Math.abs(this.lat1 - this.lat2) > common.EPSLN) {
    this.ns = Math.log(ms1 / ms2) / Math.log(ts1 / ts2);
  }
  else {
    this.ns = sin1;
  }
  if (isNaN(this.ns)) {
    this.ns = sin1;
  }
  this.f0 = ms1 / (this.ns * Math.pow(ts1, this.ns));
  this.rh = this.a * this.f0 * Math.pow(ts0, this.ns);
  if (!this.title) {
    this.title = "Lambert Conformal Conic";
  }
};


// Lambert Conformal conic forward equations--mapping lat,long to x,y
// -----------------------------------------------------------------
exports.forward = function(p) {

  var lon = p.x;
  var lat = p.y;

  // singular cases :
  if (Math.abs(2 * Math.abs(lat) - common.PI) <= common.EPSLN) {
    lat = common.sign(lat) * (common.HALF_PI - 2 * common.EPSLN);
  }

  var con = Math.abs(Math.abs(lat) - common.HALF_PI);
  var ts, rh1;
  if (con > common.EPSLN) {
    ts = common.tsfnz(this.e, lat, Math.sin(lat));
    rh1 = this.a * this.f0 * Math.pow(ts, this.ns);
  }
  else {
    con = lat * this.ns;
    if (con <= 0) {
      return null;
    }
    rh1 = 0;
  }
  var theta = this.ns * common.adjust_lon(lon - this.long0);
  p.x = this.k0 * (rh1 * Math.sin(theta)) + this.x0;
  p.y = this.k0 * (this.rh - rh1 * Math.cos(theta)) + this.y0;

  return p;
};

// Lambert Conformal Conic inverse equations--mapping x,y to lat/long
// -----------------------------------------------------------------
exports.inverse = function(p) {

  var rh1, con, ts;
  var lat, lon;
  var x = (p.x - this.x0) / this.k0;
  var y = (this.rh - (p.y - this.y0) / this.k0);
  if (this.ns > 0) {
    rh1 = Math.sqrt(x * x + y * y);
    con = 1;
  }
  else {
    rh1 = -Math.sqrt(x * x + y * y);
    con = -1;
  }
  var theta = 0;
  if (rh1 !== 0) {
    theta = Math.atan2((con * x), (con * y));
  }
  if ((rh1 !== 0) || (this.ns > 0)) {
    con = 1 / this.ns;
    ts = Math.pow((rh1 / (this.a * this.f0)), con);
    lat = common.phi2z(this.e, ts);
    if (lat === -9999) {
      return null;
    }
  }
  else {
    lat = -common.HALF_PI;
  }
  lon = common.adjust_lon(theta / this.ns + this.long0);

  p.x = lon;
  p.y = lat;
  return p;
};

exports.names = ["Lambert Tangential Conformal Conic Projection", "Lambert_Conformal_Conic", "Lambert_Conformal_Conic_2SP", "lcc"];

},{"../common":28}],55:[function(require,module,exports){
exports.init = function() {
  //no-op for longlat
};

function identity(pt) {
  return pt;
}
exports.forward = identity;
exports.inverse = identity;
exports.names = ["longlat", "identity"];

},{}],56:[function(require,module,exports){
var common = require('../common');
exports.init = function() {
  var con = this.b / this.a;
  this.es = 1 - con * con;
  this.e = Math.sqrt(this.es);
  if (this.lat_ts) {
    if (this.sphere) {
      this.k0 = Math.cos(this.lat_ts);
    }
    else {
      this.k0 = common.msfnz(this.e, Math.sin(this.lat_ts), Math.cos(this.lat_ts));
    }
  }
  else {
    if (!this.k0) {
      if (this.k) {
        this.k0 = this.k;
      }
      else {
        this.k0 = 1;
      }
    }
  }
};

/* Mercator forward equations--mapping lat,long to x,y
  --------------------------------------------------*/

exports.forward = function(p) {
  var lon = p.x;
  var lat = p.y;
  // convert to radians
  if (lat * common.R2D > 90 && lat * common.R2D < -90 && lon * common.R2D > 180 && lon * common.R2D < -180) {
    return null;
  }

  var x, y;
  if (Math.abs(Math.abs(lat) - common.HALF_PI) <= common.EPSLN) {
    return null;
  }
  else {
    if (this.sphere) {
      x = this.x0 + this.a * this.k0 * common.adjust_lon(lon - this.long0);
      y = this.y0 + this.a * this.k0 * Math.log(Math.tan(common.FORTPI + 0.5 * lat));
    }
    else {
      var sinphi = Math.sin(lat);
      var ts = common.tsfnz(this.e, lat, sinphi);
      x = this.x0 + this.a * this.k0 * common.adjust_lon(lon - this.long0);
      y = this.y0 - this.a * this.k0 * Math.log(ts);
    }
    p.x = x;
    p.y = y;
    return p;
  }
};


/* Mercator inverse equations--mapping x,y to lat/long
  --------------------------------------------------*/
exports.inverse = function(p) {

  var x = p.x - this.x0;
  var y = p.y - this.y0;
  var lon, lat;

  if (this.sphere) {
    lat = common.HALF_PI - 2 * Math.atan(Math.exp(-y / (this.a * this.k0)));
  }
  else {
    var ts = Math.exp(-y / (this.a * this.k0));
    lat = common.phi2z(this.e, ts);
    if (lat === -9999) {
      return null;
    }
  }
  lon = common.adjust_lon(this.long0 + x / (this.a * this.k0));

  p.x = lon;
  p.y = lat;
  return p;
};

exports.names = ["Mercator", "Popular Visualisation Pseudo Mercator", "Mercator_1SP", "Mercator_Auxiliary_Sphere", "merc"];

},{"../common":28}],57:[function(require,module,exports){
var common = require('../common');
/*
  reference
    "New Equal-Area Map Projections for Noncircular Regions", John P. Snyder,
    The American Cartographer, Vol 15, No. 4, October 1988, pp. 341-355.
  */


/* Initialize the Miller Cylindrical projection
  -------------------------------------------*/
exports.init = function() {
  //no-op
};


/* Miller Cylindrical forward equations--mapping lat,long to x,y
    ------------------------------------------------------------*/
exports.forward = function(p) {
  var lon = p.x;
  var lat = p.y;
  /* Forward equations
      -----------------*/
  var dlon = common.adjust_lon(lon - this.long0);
  var x = this.x0 + this.a * dlon;
  var y = this.y0 + this.a * Math.log(Math.tan((common.PI / 4) + (lat / 2.5))) * 1.25;

  p.x = x;
  p.y = y;
  return p;
};

/* Miller Cylindrical inverse equations--mapping x,y to lat/long
    ------------------------------------------------------------*/
exports.inverse = function(p) {
  p.x -= this.x0;
  p.y -= this.y0;

  var lon = common.adjust_lon(this.long0 + p.x / this.a);
  var lat = 2.5 * (Math.atan(Math.exp(0.8 * p.y / this.a)) - common.PI / 4);

  p.x = lon;
  p.y = lat;
  return p;
};
exports.names = ["Miller_Cylindrical", "mill"];

},{"../common":28}],58:[function(require,module,exports){
var common = require('../common');
exports.init = function() {};

/* Mollweide forward equations--mapping lat,long to x,y
    ----------------------------------------------------*/
exports.forward = function(p) {

  /* Forward equations
      -----------------*/
  var lon = p.x;
  var lat = p.y;

  var delta_lon = common.adjust_lon(lon - this.long0);
  var theta = lat;
  var con = common.PI * Math.sin(lat);

  /* Iterate using the Newton-Raphson method to find theta
      -----------------------------------------------------*/
  for (var i = 0; true; i++) {
    var delta_theta = -(theta + Math.sin(theta) - con) / (1 + Math.cos(theta));
    theta += delta_theta;
    if (Math.abs(delta_theta) < common.EPSLN) {
      break;
    }
  }
  theta /= 2;

  /* If the latitude is 90 deg, force the x coordinate to be "0 + false easting"
       this is done here because of precision problems with "cos(theta)"
       --------------------------------------------------------------------------*/
  if (common.PI / 2 - Math.abs(lat) < common.EPSLN) {
    delta_lon = 0;
  }
  var x = 0.900316316158 * this.a * delta_lon * Math.cos(theta) + this.x0;
  var y = 1.4142135623731 * this.a * Math.sin(theta) + this.y0;

  p.x = x;
  p.y = y;
  return p;
};

exports.inverse = function(p) {
  var theta;
  var arg;

  /* Inverse equations
      -----------------*/
  p.x -= this.x0;
  p.y -= this.y0;
  arg = p.y / (1.4142135623731 * this.a);

  /* Because of division by zero problems, 'arg' can not be 1.  Therefore
       a number very close to one is used instead.
       -------------------------------------------------------------------*/
  if (Math.abs(arg) > 0.999999999999) {
    arg = 0.999999999999;
  }
  theta = Math.asin(arg);
  var lon = common.adjust_lon(this.long0 + (p.x / (0.900316316158 * this.a * Math.cos(theta))));
  if (lon < (-common.PI)) {
    lon = -common.PI;
  }
  if (lon > common.PI) {
    lon = common.PI;
  }
  arg = (2 * theta + Math.sin(2 * theta)) / common.PI;
  if (Math.abs(arg) > 1) {
    arg = 1;
  }
  var lat = Math.asin(arg);

  p.x = lon;
  p.y = lat;
  return p;
};
exports.names = ["Mollweide", "moll"];

},{"../common":28}],59:[function(require,module,exports){
var common = require('../common');
/*
  reference
    Department of Land and Survey Technical Circular 1973/32
      http://www.linz.govt.nz/docs/miscellaneous/nz-map-definition.pdf
    OSG Technical Report 4.1
      http://www.linz.govt.nz/docs/miscellaneous/nzmg.pdf
  */

/**
 * iterations: Number of iterations to refine inverse transform.
 *     0 -> km accuracy
 *     1 -> m accuracy -- suitable for most mapping applications
 *     2 -> mm accuracy
 */
exports.iterations = 1;

exports.init = function() {
  this.A = [];
  this.A[1] = 0.6399175073;
  this.A[2] = -0.1358797613;
  this.A[3] = 0.063294409;
  this.A[4] = -0.02526853;
  this.A[5] = 0.0117879;
  this.A[6] = -0.0055161;
  this.A[7] = 0.0026906;
  this.A[8] = -0.001333;
  this.A[9] = 0.00067;
  this.A[10] = -0.00034;

  this.B_re = [];
  this.B_im = [];
  this.B_re[1] = 0.7557853228;
  this.B_im[1] = 0;
  this.B_re[2] = 0.249204646;
  this.B_im[2] = 0.003371507;
  this.B_re[3] = -0.001541739;
  this.B_im[3] = 0.041058560;
  this.B_re[4] = -0.10162907;
  this.B_im[4] = 0.01727609;
  this.B_re[5] = -0.26623489;
  this.B_im[5] = -0.36249218;
  this.B_re[6] = -0.6870983;
  this.B_im[6] = -1.1651967;

  this.C_re = [];
  this.C_im = [];
  this.C_re[1] = 1.3231270439;
  this.C_im[1] = 0;
  this.C_re[2] = -0.577245789;
  this.C_im[2] = -0.007809598;
  this.C_re[3] = 0.508307513;
  this.C_im[3] = -0.112208952;
  this.C_re[4] = -0.15094762;
  this.C_im[4] = 0.18200602;
  this.C_re[5] = 1.01418179;
  this.C_im[5] = 1.64497696;
  this.C_re[6] = 1.9660549;
  this.C_im[6] = 2.5127645;

  this.D = [];
  this.D[1] = 1.5627014243;
  this.D[2] = 0.5185406398;
  this.D[3] = -0.03333098;
  this.D[4] = -0.1052906;
  this.D[5] = -0.0368594;
  this.D[6] = 0.007317;
  this.D[7] = 0.01220;
  this.D[8] = 0.00394;
  this.D[9] = -0.0013;
};

/**
    New Zealand Map Grid Forward  - long/lat to x/y
    long/lat in radians
  */
exports.forward = function(p) {
  var n;
  var lon = p.x;
  var lat = p.y;

  var delta_lat = lat - this.lat0;
  var delta_lon = lon - this.long0;

  // 1. Calculate d_phi and d_psi    ...                          // and d_lambda
  // For this algorithm, delta_latitude is in seconds of arc x 10-5, so we need to scale to those units. Longitude is radians.
  var d_phi = delta_lat / common.SEC_TO_RAD * 1E-5;
  var d_lambda = delta_lon;
  var d_phi_n = 1; // d_phi^0

  var d_psi = 0;
  for (n = 1; n <= 10; n++) {
    d_phi_n = d_phi_n * d_phi;
    d_psi = d_psi + this.A[n] * d_phi_n;
  }

  // 2. Calculate theta
  var th_re = d_psi;
  var th_im = d_lambda;

  // 3. Calculate z
  var th_n_re = 1;
  var th_n_im = 0; // theta^0
  var th_n_re1;
  var th_n_im1;

  var z_re = 0;
  var z_im = 0;
  for (n = 1; n <= 6; n++) {
    th_n_re1 = th_n_re * th_re - th_n_im * th_im;
    th_n_im1 = th_n_im * th_re + th_n_re * th_im;
    th_n_re = th_n_re1;
    th_n_im = th_n_im1;
    z_re = z_re + this.B_re[n] * th_n_re - this.B_im[n] * th_n_im;
    z_im = z_im + this.B_im[n] * th_n_re + this.B_re[n] * th_n_im;
  }

  // 4. Calculate easting and northing
  p.x = (z_im * this.a) + this.x0;
  p.y = (z_re * this.a) + this.y0;

  return p;
};


/**
    New Zealand Map Grid Inverse  -  x/y to long/lat
  */
exports.inverse = function(p) {
  var n;
  var x = p.x;
  var y = p.y;

  var delta_x = x - this.x0;
  var delta_y = y - this.y0;

  // 1. Calculate z
  var z_re = delta_y / this.a;
  var z_im = delta_x / this.a;

  // 2a. Calculate theta - first approximation gives km accuracy
  var z_n_re = 1;
  var z_n_im = 0; // z^0
  var z_n_re1;
  var z_n_im1;

  var th_re = 0;
  var th_im = 0;
  for (n = 1; n <= 6; n++) {
    z_n_re1 = z_n_re * z_re - z_n_im * z_im;
    z_n_im1 = z_n_im * z_re + z_n_re * z_im;
    z_n_re = z_n_re1;
    z_n_im = z_n_im1;
    th_re = th_re + this.C_re[n] * z_n_re - this.C_im[n] * z_n_im;
    th_im = th_im + this.C_im[n] * z_n_re + this.C_re[n] * z_n_im;
  }

  // 2b. Iterate to refine the accuracy of the calculation
  //        0 iterations gives km accuracy
  //        1 iteration gives m accuracy -- good enough for most mapping applications
  //        2 iterations bives mm accuracy
  for (var i = 0; i < this.iterations; i++) {
    var th_n_re = th_re;
    var th_n_im = th_im;
    var th_n_re1;
    var th_n_im1;

    var num_re = z_re;
    var num_im = z_im;
    for (n = 2; n <= 6; n++) {
      th_n_re1 = th_n_re * th_re - th_n_im * th_im;
      th_n_im1 = th_n_im * th_re + th_n_re * th_im;
      th_n_re = th_n_re1;
      th_n_im = th_n_im1;
      num_re = num_re + (n - 1) * (this.B_re[n] * th_n_re - this.B_im[n] * th_n_im);
      num_im = num_im + (n - 1) * (this.B_im[n] * th_n_re + this.B_re[n] * th_n_im);
    }

    th_n_re = 1;
    th_n_im = 0;
    var den_re = this.B_re[1];
    var den_im = this.B_im[1];
    for (n = 2; n <= 6; n++) {
      th_n_re1 = th_n_re * th_re - th_n_im * th_im;
      th_n_im1 = th_n_im * th_re + th_n_re * th_im;
      th_n_re = th_n_re1;
      th_n_im = th_n_im1;
      den_re = den_re + n * (this.B_re[n] * th_n_re - this.B_im[n] * th_n_im);
      den_im = den_im + n * (this.B_im[n] * th_n_re + this.B_re[n] * th_n_im);
    }

    // Complex division
    var den2 = den_re * den_re + den_im * den_im;
    th_re = (num_re * den_re + num_im * den_im) / den2;
    th_im = (num_im * den_re - num_re * den_im) / den2;
  }

  // 3. Calculate d_phi              ...                                    // and d_lambda
  var d_psi = th_re;
  var d_lambda = th_im;
  var d_psi_n = 1; // d_psi^0

  var d_phi = 0;
  for (n = 1; n <= 9; n++) {
    d_psi_n = d_psi_n * d_psi;
    d_phi = d_phi + this.D[n] * d_psi_n;
  }

  // 4. Calculate latitude and longitude
  // d_phi is calcuated in second of arc * 10^-5, so we need to scale back to radians. d_lambda is in radians.
  var lat = this.lat0 + (d_phi * common.SEC_TO_RAD * 1E5);
  var lon = this.long0 + d_lambda;

  p.x = lon;
  p.y = lat;

  return p;
};
exports.names = ["New_Zealand_Map_Grid", "nzmg"];
},{"../common":28}],60:[function(require,module,exports){
var common = require('../common');


/* Initialize the Oblique Mercator  projection
    ------------------------------------------*/
exports.init = function() {
  this.no_off = this.no_off || false;
  this.no_rot = this.no_rot || false;

  if (isNaN(this.k0)) {
    this.k0 = 1;
  }
  var sinlat = Math.sin(this.lat0);
  var coslat = Math.cos(this.lat0);
  var con = this.e * sinlat;

  this.bl = Math.sqrt(1 + this.es / (1 - this.es) * Math.pow(coslat, 4));
  this.al = this.a * this.bl * this.k0 * Math.sqrt(1 - this.es) / (1 - con * con);
  var t0 = common.tsfnz(this.e, this.lat0, sinlat);
  var dl = this.bl / coslat * Math.sqrt((1 - this.es) / (1 - con * con));
  if (dl * dl < 1) {
    dl = 1;
  }
  var fl;
  var gl;
  if (!isNaN(this.longc)) {
    //Central point and azimuth method

    if (this.lat0 >= 0) {
      fl = dl + Math.sqrt(dl * dl - 1);
    }
    else {
      fl = dl - Math.sqrt(dl * dl - 1);
    }
    this.el = fl * Math.pow(t0, this.bl);
    gl = 0.5 * (fl - 1 / fl);
    this.gamma0 = Math.asin(Math.sin(this.alpha) / dl);
    this.long0 = this.longc - Math.asin(gl * Math.tan(this.gamma0)) / this.bl;

  }
  else {
    //2 points method
    var t1 = common.tsfnz(this.e, this.lat1, Math.sin(this.lat1));
    var t2 = common.tsfnz(this.e, this.lat2, Math.sin(this.lat2));
    if (this.lat0 >= 0) {
      this.el = (dl + Math.sqrt(dl * dl - 1)) * Math.pow(t0, this.bl);
    }
    else {
      this.el = (dl - Math.sqrt(dl * dl - 1)) * Math.pow(t0, this.bl);
    }
    var hl = Math.pow(t1, this.bl);
    var ll = Math.pow(t2, this.bl);
    fl = this.el / hl;
    gl = 0.5 * (fl - 1 / fl);
    var jl = (this.el * this.el - ll * hl) / (this.el * this.el + ll * hl);
    var pl = (ll - hl) / (ll + hl);
    var dlon12 = common.adjust_lon(this.long1 - this.long2);
    this.long0 = 0.5 * (this.long1 + this.long2) - Math.atan(jl * Math.tan(0.5 * this.bl * (dlon12)) / pl) / this.bl;
    this.long0 = common.adjust_lon(this.long0);
    var dlon10 = common.adjust_lon(this.long1 - this.long0);
    this.gamma0 = Math.atan(Math.sin(this.bl * (dlon10)) / gl);
    this.alpha = Math.asin(dl * Math.sin(this.gamma0));
  }

  if (this.no_off) {
    this.uc = 0;
  }
  else {
    if (this.lat0 >= 0) {
      this.uc = this.al / this.bl * Math.atan2(Math.sqrt(dl * dl - 1), Math.cos(this.alpha));
    }
    else {
      this.uc = -1 * this.al / this.bl * Math.atan2(Math.sqrt(dl * dl - 1), Math.cos(this.alpha));
    }
  }

};


/* Oblique Mercator forward equations--mapping lat,long to x,y
    ----------------------------------------------------------*/
exports.forward = function(p) {
  var lon = p.x;
  var lat = p.y;
  var dlon = common.adjust_lon(lon - this.long0);
  var us, vs;
  var con;
  if (Math.abs(Math.abs(lat) - common.HALF_PI) <= common.EPSLN) {
    if (lat > 0) {
      con = -1;
    }
    else {
      con = 1;
    }
    vs = this.al / this.bl * Math.log(Math.tan(common.FORTPI + con * this.gamma0 * 0.5));
    us = -1 * con * common.HALF_PI * this.al / this.bl;
  }
  else {
    var t = common.tsfnz(this.e, lat, Math.sin(lat));
    var ql = this.el / Math.pow(t, this.bl);
    var sl = 0.5 * (ql - 1 / ql);
    var tl = 0.5 * (ql + 1 / ql);
    var vl = Math.sin(this.bl * (dlon));
    var ul = (sl * Math.sin(this.gamma0) - vl * Math.cos(this.gamma0)) / tl;
    if (Math.abs(Math.abs(ul) - 1) <= common.EPSLN) {
      vs = Number.POSITIVE_INFINITY;
    }
    else {
      vs = 0.5 * this.al * Math.log((1 - ul) / (1 + ul)) / this.bl;
    }
    if (Math.abs(Math.cos(this.bl * (dlon))) <= common.EPSLN) {
      us = this.al * this.bl * (dlon);
    }
    else {
      us = this.al * Math.atan2(sl * Math.cos(this.gamma0) + vl * Math.sin(this.gamma0), Math.cos(this.bl * dlon)) / this.bl;
    }
  }

  if (this.no_rot) {
    p.x = this.x0 + us;
    p.y = this.y0 + vs;
  }
  else {

    us -= this.uc;
    p.x = this.x0 + vs * Math.cos(this.alpha) + us * Math.sin(this.alpha);
    p.y = this.y0 + us * Math.cos(this.alpha) - vs * Math.sin(this.alpha);
  }
  return p;
};

exports.inverse = function(p) {
  var us, vs;
  if (this.no_rot) {
    vs = p.y - this.y0;
    us = p.x - this.x0;
  }
  else {
    vs = (p.x - this.x0) * Math.cos(this.alpha) - (p.y - this.y0) * Math.sin(this.alpha);
    us = (p.y - this.y0) * Math.cos(this.alpha) + (p.x - this.x0) * Math.sin(this.alpha);
    us += this.uc;
  }
  var qp = Math.exp(-1 * this.bl * vs / this.al);
  var sp = 0.5 * (qp - 1 / qp);
  var tp = 0.5 * (qp + 1 / qp);
  var vp = Math.sin(this.bl * us / this.al);
  var up = (vp * Math.cos(this.gamma0) + sp * Math.sin(this.gamma0)) / tp;
  var ts = Math.pow(this.el / Math.sqrt((1 + up) / (1 - up)), 1 / this.bl);
  if (Math.abs(up - 1) < common.EPSLN) {
    p.x = this.long0;
    p.y = common.HALF_PI;
  }
  else if (Math.abs(up + 1) < common.EPSLN) {
    p.x = this.long0;
    p.y = -1 * common.HALF_PI;
  }
  else {
    p.y = common.phi2z(this.e, ts);
    p.x = common.adjust_lon(this.long0 - Math.atan2(sp * Math.cos(this.gamma0) - vp * Math.sin(this.gamma0), Math.cos(this.bl * us / this.al)) / this.bl);
  }
  return p;
};

exports.names = ["Hotine_Oblique_Mercator", "Hotine Oblique Mercator", "Hotine_Oblique_Mercator_Azimuth_Natural_Origin", "Hotine_Oblique_Mercator_Azimuth_Center", "omerc"];
},{"../common":28}],61:[function(require,module,exports){
var common = require('../common');
exports.init = function() {
  /* Place parameters in static storage for common use
      -------------------------------------------------*/
  this.temp = this.b / this.a;
  this.es = 1 - Math.pow(this.temp, 2); // devait etre dans tmerc.js mais n y est pas donc je commente sinon retour de valeurs nulles
  this.e = Math.sqrt(this.es);
  this.e0 = common.e0fn(this.es);
  this.e1 = common.e1fn(this.es);
  this.e2 = common.e2fn(this.es);
  this.e3 = common.e3fn(this.es);
  this.ml0 = this.a * common.mlfn(this.e0, this.e1, this.e2, this.e3, this.lat0); //si que des zeros le calcul ne se fait pas
};


/* Polyconic forward equations--mapping lat,long to x,y
    ---------------------------------------------------*/
exports.forward = function(p) {
  var lon = p.x;
  var lat = p.y;
  var x, y, el;
  var dlon = common.adjust_lon(lon - this.long0);
  el = dlon * Math.sin(lat);
  if (this.sphere) {
    if (Math.abs(lat) <= common.EPSLN) {
      x = this.a * dlon;
      y = -1 * this.a * this.lat0;
    }
    else {
      x = this.a * Math.sin(el) / Math.tan(lat);
      y = this.a * (common.adjust_lat(lat - this.lat0) + (1 - Math.cos(el)) / Math.tan(lat));
    }
  }
  else {
    if (Math.abs(lat) <= common.EPSLN) {
      x = this.a * dlon;
      y = -1 * this.ml0;
    }
    else {
      var nl = common.gN(this.a, this.e, Math.sin(lat)) / Math.tan(lat);
      x = nl * Math.sin(el);
      y = this.a * common.mlfn(this.e0, this.e1, this.e2, this.e3, lat) - this.ml0 + nl * (1 - Math.cos(el));
    }

  }
  p.x = x + this.x0;
  p.y = y + this.y0;
  return p;
};


/* Inverse equations
  -----------------*/
exports.inverse = function(p) {
  var lon, lat, x, y, i;
  var al, bl;
  var phi, dphi;
  x = p.x - this.x0;
  y = p.y - this.y0;

  if (this.sphere) {
    if (Math.abs(y + this.a * this.lat0) <= common.EPSLN) {
      lon = common.adjust_lon(x / this.a + this.long0);
      lat = 0;
    }
    else {
      al = this.lat0 + y / this.a;
      bl = x * x / this.a / this.a + al * al;
      phi = al;
      var tanphi;
      for (i = common.MAX_ITER; i; --i) {
        tanphi = Math.tan(phi);
        dphi = -1 * (al * (phi * tanphi + 1) - phi - 0.5 * (phi * phi + bl) * tanphi) / ((phi - al) / tanphi - 1);
        phi += dphi;
        if (Math.abs(dphi) <= common.EPSLN) {
          lat = phi;
          break;
        }
      }
      lon = common.adjust_lon(this.long0 + (Math.asin(x * Math.tan(phi) / this.a)) / Math.sin(lat));
    }
  }
  else {
    if (Math.abs(y + this.ml0) <= common.EPSLN) {
      lat = 0;
      lon = common.adjust_lon(this.long0 + x / this.a);
    }
    else {

      al = (this.ml0 + y) / this.a;
      bl = x * x / this.a / this.a + al * al;
      phi = al;
      var cl, mln, mlnp, ma;
      var con;
      for (i = common.MAX_ITER; i; --i) {
        con = this.e * Math.sin(phi);
        cl = Math.sqrt(1 - con * con) * Math.tan(phi);
        mln = this.a * common.mlfn(this.e0, this.e1, this.e2, this.e3, phi);
        mlnp = this.e0 - 2 * this.e1 * Math.cos(2 * phi) + 4 * this.e2 * Math.cos(4 * phi) - 6 * this.e3 * Math.cos(6 * phi);
        ma = mln / this.a;
        dphi = (al * (cl * ma + 1) - ma - 0.5 * cl * (ma * ma + bl)) / (this.es * Math.sin(2 * phi) * (ma * ma + bl - 2 * al * ma) / (4 * cl) + (al - ma) * (cl * mlnp - 2 / Math.sin(2 * phi)) - mlnp);
        phi -= dphi;
        if (Math.abs(dphi) <= common.EPSLN) {
          lat = phi;
          break;
        }
      }

      //lat=phi4z(this.e,this.e0,this.e1,this.e2,this.e3,al,bl,0,0);
      cl = Math.sqrt(1 - this.es * Math.pow(Math.sin(lat), 2)) * Math.tan(lat);
      lon = common.adjust_lon(this.long0 + Math.asin(x * cl / this.a) / Math.sin(lat));
    }
  }

  p.x = lon;
  p.y = lat;
  return p;
};
exports.names = ["Polyconic", "poly"];
},{"../common":28}],62:[function(require,module,exports){
var common = require('../common');
exports.init = function() {
  /* Place parameters in static storage for common use
    -------------------------------------------------*/


  if (!this.sphere) {
    this.en = common.pj_enfn(this.es);
  }
  else {
    this.n = 1;
    this.m = 0;
    this.es = 0;
    this.C_y = Math.sqrt((this.m + 1) / this.n);
    this.C_x = this.C_y / (this.m + 1);
  }

};

/* Sinusoidal forward equations--mapping lat,long to x,y
  -----------------------------------------------------*/
exports.forward = function(p) {
  var x, y;
  var lon = p.x;
  var lat = p.y;
  /* Forward equations
    -----------------*/
  lon = common.adjust_lon(lon - this.long0);

  if (this.sphere) {
    if (!this.m) {
      lat = this.n !== 1 ? Math.asin(this.n * Math.sin(lat)) : lat;
    }
    else {
      var k = this.n * Math.sin(lat);
      for (var i = common.MAX_ITER; i; --i) {
        var V = (this.m * lat + Math.sin(lat) - k) / (this.m + Math.cos(lat));
        lat -= V;
        if (Math.abs(V) < common.EPSLN) {
          break;
        }
      }
    }
    x = this.a * this.C_x * lon * (this.m + Math.cos(lat));
    y = this.a * this.C_y * lat;

  }
  else {

    var s = Math.sin(lat);
    var c = Math.cos(lat);
    y = this.a * common.pj_mlfn(lat, s, c, this.en);
    x = this.a * lon * c / Math.sqrt(1 - this.es * s * s);
  }

  p.x = x;
  p.y = y;
  return p;
};

exports.inverse = function(p) {
  var lat, temp, lon, s;

  p.x -= this.x0;
  lon = p.x / this.a;
  p.y -= this.y0;
  lat = p.y / this.a;

  if (this.sphere) {
    lat /= this.C_y;
    lon = lon / (this.C_x * (this.m + Math.cos(lat)));
    if (this.m) {
      lat = common.asinz((this.m * lat + Math.sin(lat)) / this.n);
    }
    else if (this.n !== 1) {
      lat = common.asinz(Math.sin(lat) / this.n);
    }
    lon = common.adjust_lon(lon + this.long0);
    lat = common.adjust_lat(lat);
  }
  else {
    lat = common.pj_inv_mlfn(p.y / this.a, this.es, this.en);
    s = Math.abs(lat);
    if (s < common.HALF_PI) {
      s = Math.sin(lat);
      temp = this.long0 + p.x * Math.sqrt(1 - this.es * s * s) / (this.a * Math.cos(lat));
      //temp = this.long0 + p.x / (this.a * Math.cos(lat));
      lon = common.adjust_lon(temp);
    }
    else if ((s - common.EPSLN) < common.HALF_PI) {
      lon = this.long0;
    }
  }
  p.x = lon;
  p.y = lat;
  return p;
};
exports.names = ["Sinusoidal", "sinu"];
},{"../common":28}],63:[function(require,module,exports){
/*
  references:
    Formules et constantes pour le Calcul pour la
    projection cylindrique conforme à axe oblique et pour la transformation entre
    des systèmes de référence.
    http://www.swisstopo.admin.ch/internet/swisstopo/fr/home/topics/survey/sys/refsys/switzerland.parsysrelated1.31216.downloadList.77004.DownloadFile.tmp/swissprojectionfr.pdf
  */
exports.init = function() {
  var phy0 = this.lat0;
  this.lambda0 = this.long0;
  var sinPhy0 = Math.sin(phy0);
  var semiMajorAxis = this.a;
  var invF = this.rf;
  var flattening = 1 / invF;
  var e2 = 2 * flattening - Math.pow(flattening, 2);
  var e = this.e = Math.sqrt(e2);
  this.R = this.k0 * semiMajorAxis * Math.sqrt(1 - e2) / (1 - e2 * Math.pow(sinPhy0, 2));
  this.alpha = Math.sqrt(1 + e2 / (1 - e2) * Math.pow(Math.cos(phy0), 4));
  this.b0 = Math.asin(sinPhy0 / this.alpha);
  var k1 = Math.log(Math.tan(Math.PI / 4 + this.b0 / 2));
  var k2 = Math.log(Math.tan(Math.PI / 4 + phy0 / 2));
  var k3 = Math.log((1 + e * sinPhy0) / (1 - e * sinPhy0));
  this.K = k1 - this.alpha * k2 + this.alpha * e / 2 * k3;
};


exports.forward = function(p) {
  var Sa1 = Math.log(Math.tan(Math.PI / 4 - p.y / 2));
  var Sa2 = this.e / 2 * Math.log((1 + this.e * Math.sin(p.y)) / (1 - this.e * Math.sin(p.y)));
  var S = -this.alpha * (Sa1 + Sa2) + this.K;

  // spheric latitude
  var b = 2 * (Math.atan(Math.exp(S)) - Math.PI / 4);

  // spheric longitude
  var I = this.alpha * (p.x - this.lambda0);

  // psoeudo equatorial rotation
  var rotI = Math.atan(Math.sin(I) / (Math.sin(this.b0) * Math.tan(b) + Math.cos(this.b0) * Math.cos(I)));

  var rotB = Math.asin(Math.cos(this.b0) * Math.sin(b) - Math.sin(this.b0) * Math.cos(b) * Math.cos(I));

  p.y = this.R / 2 * Math.log((1 + Math.sin(rotB)) / (1 - Math.sin(rotB))) + this.y0;
  p.x = this.R * rotI + this.x0;
  return p;
};

exports.inverse = function(p) {
  var Y = p.x - this.x0;
  var X = p.y - this.y0;

  var rotI = Y / this.R;
  var rotB = 2 * (Math.atan(Math.exp(X / this.R)) - Math.PI / 4);

  var b = Math.asin(Math.cos(this.b0) * Math.sin(rotB) + Math.sin(this.b0) * Math.cos(rotB) * Math.cos(rotI));
  var I = Math.atan(Math.sin(rotI) / (Math.cos(this.b0) * Math.cos(rotI) - Math.sin(this.b0) * Math.tan(rotB)));

  var lambda = this.lambda0 + I / this.alpha;

  var S = 0;
  var phy = b;
  var prevPhy = -1000;
  var iteration = 0;
  while (Math.abs(phy - prevPhy) > 0.0000001) {
    if (++iteration > 20) {
      //...reportError("omercFwdInfinity");
      return;
    }
    //S = Math.log(Math.tan(Math.PI / 4 + phy / 2));
    S = 1 / this.alpha * (Math.log(Math.tan(Math.PI / 4 + b / 2)) - this.K) + this.e * Math.log(Math.tan(Math.PI / 4 + Math.asin(this.e * Math.sin(phy)) / 2));
    prevPhy = phy;
    phy = 2 * Math.atan(Math.exp(S)) - Math.PI / 2;
  }

  p.x = lambda;
  p.y = phy;
  return p;
};

exports.names = ["somerc"];

},{}],64:[function(require,module,exports){
var common = require('../common');
exports.ssfn_ = function(phit, sinphi, eccen) {
  sinphi *= eccen;
  return (Math.tan(0.5 * (common.HALF_PI + phit)) * Math.pow((1 - sinphi) / (1 + sinphi), 0.5 * eccen));
};

exports.init = function() {
  this.coslat0 = Math.cos(this.lat0);
  this.sinlat0 = Math.sin(this.lat0);
  if (this.sphere) {
    if (this.k0 === 1 && !isNaN(this.lat_ts) && Math.abs(this.coslat0) <= common.EPSLN) {
      this.k0 = 0.5 * (1 + common.sign(this.lat0) * Math.sin(this.lat_ts));
    }
  }
  else {
    if (Math.abs(this.coslat0) <= common.EPSLN) {
      if (this.lat0 > 0) {
        //North pole
        //trace('stere:north pole');
        this.con = 1;
      }
      else {
        //South pole
        //trace('stere:south pole');
        this.con = -1;
      }
    }
    this.cons = Math.sqrt(Math.pow(1 + this.e, 1 + this.e) * Math.pow(1 - this.e, 1 - this.e));
    if (this.k0 === 1 && !isNaN(this.lat_ts) && Math.abs(this.coslat0) <= common.EPSLN) {
      this.k0 = 0.5 * this.cons * common.msfnz(this.e, Math.sin(this.lat_ts), Math.cos(this.lat_ts)) / common.tsfnz(this.e, this.con * this.lat_ts, this.con * Math.sin(this.lat_ts));
    }
    this.ms1 = common.msfnz(this.e, this.sinlat0, this.coslat0);
    this.X0 = 2 * Math.atan(this.ssfn_(this.lat0, this.sinlat0, this.e)) - common.HALF_PI;
    this.cosX0 = Math.cos(this.X0);
    this.sinX0 = Math.sin(this.X0);
  }
};

// Stereographic forward equations--mapping lat,long to x,y
exports.forward = function(p) {
  var lon = p.x;
  var lat = p.y;
  var sinlat = Math.sin(lat);
  var coslat = Math.cos(lat);
  var A, X, sinX, cosX, ts, rh;
  var dlon = common.adjust_lon(lon - this.long0);

  if (Math.abs(Math.abs(lon - this.long0) - common.PI) <= common.EPSLN && Math.abs(lat + this.lat0) <= common.EPSLN) {
    //case of the origine point
    //trace('stere:this is the origin point');
    p.x = NaN;
    p.y = NaN;
    return p;
  }
  if (this.sphere) {
    //trace('stere:sphere case');
    A = 2 * this.k0 / (1 + this.sinlat0 * sinlat + this.coslat0 * coslat * Math.cos(dlon));
    p.x = this.a * A * coslat * Math.sin(dlon) + this.x0;
    p.y = this.a * A * (this.coslat0 * sinlat - this.sinlat0 * coslat * Math.cos(dlon)) + this.y0;
    return p;
  }
  else {
    X = 2 * Math.atan(this.ssfn_(lat, sinlat, this.e)) - common.HALF_PI;
    cosX = Math.cos(X);
    sinX = Math.sin(X);
    if (Math.abs(this.coslat0) <= common.EPSLN) {
      ts = common.tsfnz(this.e, lat * this.con, this.con * sinlat);
      rh = 2 * this.a * this.k0 * ts / this.cons;
      p.x = this.x0 + rh * Math.sin(lon - this.long0);
      p.y = this.y0 - this.con * rh * Math.cos(lon - this.long0);
      //trace(p.toString());
      return p;
    }
    else if (Math.abs(this.sinlat0) < common.EPSLN) {
      //Eq
      //trace('stere:equateur');
      A = 2 * this.a * this.k0 / (1 + cosX * Math.cos(dlon));
      p.y = A * sinX;
    }
    else {
      //other case
      //trace('stere:normal case');
      A = 2 * this.a * this.k0 * this.ms1 / (this.cosX0 * (1 + this.sinX0 * sinX + this.cosX0 * cosX * Math.cos(dlon)));
      p.y = A * (this.cosX0 * sinX - this.sinX0 * cosX * Math.cos(dlon)) + this.y0;
    }
    p.x = A * cosX * Math.sin(dlon) + this.x0;
  }
  //trace(p.toString());
  return p;
};


//* Stereographic inverse equations--mapping x,y to lat/long
exports.inverse = function(p) {
  p.x -= this.x0;
  p.y -= this.y0;
  var lon, lat, ts, ce, Chi;
  var rh = Math.sqrt(p.x * p.x + p.y * p.y);
  if (this.sphere) {
    var c = 2 * Math.atan(rh / (0.5 * this.a * this.k0));
    lon = this.long0;
    lat = this.lat0;
    if (rh <= common.EPSLN) {
      p.x = lon;
      p.y = lat;
      return p;
    }
    lat = Math.asin(Math.cos(c) * this.sinlat0 + p.y * Math.sin(c) * this.coslat0 / rh);
    if (Math.abs(this.coslat0) < common.EPSLN) {
      if (this.lat0 > 0) {
        lon = common.adjust_lon(this.long0 + Math.atan2(p.x, - 1 * p.y));
      }
      else {
        lon = common.adjust_lon(this.long0 + Math.atan2(p.x, p.y));
      }
    }
    else {
      lon = common.adjust_lon(this.long0 + Math.atan2(p.x * Math.sin(c), rh * this.coslat0 * Math.cos(c) - p.y * this.sinlat0 * Math.sin(c)));
    }
    p.x = lon;
    p.y = lat;
    return p;
  }
  else {
    if (Math.abs(this.coslat0) <= common.EPSLN) {
      if (rh <= common.EPSLN) {
        lat = this.lat0;
        lon = this.long0;
        p.x = lon;
        p.y = lat;
        //trace(p.toString());
        return p;
      }
      p.x *= this.con;
      p.y *= this.con;
      ts = rh * this.cons / (2 * this.a * this.k0);
      lat = this.con * common.phi2z(this.e, ts);
      lon = this.con * common.adjust_lon(this.con * this.long0 + Math.atan2(p.x, - 1 * p.y));
    }
    else {
      ce = 2 * Math.atan(rh * this.cosX0 / (2 * this.a * this.k0 * this.ms1));
      lon = this.long0;
      if (rh <= common.EPSLN) {
        Chi = this.X0;
      }
      else {
        Chi = Math.asin(Math.cos(ce) * this.sinX0 + p.y * Math.sin(ce) * this.cosX0 / rh);
        lon = common.adjust_lon(this.long0 + Math.atan2(p.x * Math.sin(ce), rh * this.cosX0 * Math.cos(ce) - p.y * this.sinX0 * Math.sin(ce)));
      }
      lat = -1 * common.phi2z(this.e, Math.tan(0.5 * (common.HALF_PI + Chi)));
    }
  }
  p.x = lon;
  p.y = lat;

  //trace(p.toString());
  return p;

};
exports.names = ["stere"];
},{"../common":28}],65:[function(require,module,exports){
var common = require('../common');
var gauss = require('./gauss');
exports.init = function() {
  gauss.init.apply(this);
  if (!this.rc) {
    return;
  }
  this.sinc0 = Math.sin(this.phic0);
  this.cosc0 = Math.cos(this.phic0);
  this.R2 = 2 * this.rc;
  if (!this.title) {
    this.title = "Oblique Stereographic Alternative";
  }
};

exports.forward = function(p) {
  var sinc, cosc, cosl, k;
  p.x = common.adjust_lon(p.x - this.long0);
  gauss.forward.apply(this, [p]);
  sinc = Math.sin(p.y);
  cosc = Math.cos(p.y);
  cosl = Math.cos(p.x);
  k = this.k0 * this.R2 / (1 + this.sinc0 * sinc + this.cosc0 * cosc * cosl);
  p.x = k * cosc * Math.sin(p.x);
  p.y = k * (this.cosc0 * sinc - this.sinc0 * cosc * cosl);
  p.x = this.a * p.x + this.x0;
  p.y = this.a * p.y + this.y0;
  return p;
};

exports.inverse = function(p) {
  var sinc, cosc, lon, lat, rho;
  p.x = (p.x - this.x0) / this.a;
  p.y = (p.y - this.y0) / this.a;

  p.x /= this.k0;
  p.y /= this.k0;
  if ((rho = Math.sqrt(p.x * p.x + p.y * p.y))) {
    var c = 2 * Math.atan2(rho, this.R2);
    sinc = Math.sin(c);
    cosc = Math.cos(c);
    lat = Math.asin(cosc * this.sinc0 + p.y * sinc * this.cosc0 / rho);
    lon = Math.atan2(p.x * sinc, rho * this.cosc0 * cosc - p.y * this.sinc0 * sinc);
  }
  else {
    lat = this.phic0;
    lon = 0;
  }

  p.x = lon;
  p.y = lat;
  gauss.inverse.apply(this, [p]);
  p.x = common.adjust_lon(p.x + this.long0);
  return p;
};

exports.names = ["Stereographic_North_Pole", "Oblique_Stereographic", "Polar_Stereographic", "sterea","Oblique Stereographic Alternative"];

},{"../common":28,"./gauss":49}],66:[function(require,module,exports){
var common = require('../common');
exports.init = function() {
  this.e0 = common.e0fn(this.es);
  this.e1 = common.e1fn(this.es);
  this.e2 = common.e2fn(this.es);
  this.e3 = common.e3fn(this.es);
  this.ml0 = this.a * common.mlfn(this.e0, this.e1, this.e2, this.e3, this.lat0);
};

/**
    Transverse Mercator Forward  - long/lat to x/y
    long/lat in radians
  */
exports.forward = function(p) {
  var lon = p.x;
  var lat = p.y;

  var delta_lon = common.adjust_lon(lon - this.long0);
  var con;
  var x, y;
  var sin_phi = Math.sin(lat);
  var cos_phi = Math.cos(lat);

  if (this.sphere) {
    var b = cos_phi * Math.sin(delta_lon);
    if ((Math.abs(Math.abs(b) - 1)) < 0.0000000001) {
      return (93);
    }
    else {
      x = 0.5 * this.a * this.k0 * Math.log((1 + b) / (1 - b));
      con = Math.acos(cos_phi * Math.cos(delta_lon) / Math.sqrt(1 - b * b));
      if (lat < 0) {
        con = -con;
      }
      y = this.a * this.k0 * (con - this.lat0);
    }
  }
  else {
    var al = cos_phi * delta_lon;
    var als = Math.pow(al, 2);
    var c = this.ep2 * Math.pow(cos_phi, 2);
    var tq = Math.tan(lat);
    var t = Math.pow(tq, 2);
    con = 1 - this.es * Math.pow(sin_phi, 2);
    var n = this.a / Math.sqrt(con);
    var ml = this.a * common.mlfn(this.e0, this.e1, this.e2, this.e3, lat);

    x = this.k0 * n * al * (1 + als / 6 * (1 - t + c + als / 20 * (5 - 18 * t + Math.pow(t, 2) + 72 * c - 58 * this.ep2))) + this.x0;
    y = this.k0 * (ml - this.ml0 + n * tq * (als * (0.5 + als / 24 * (5 - t + 9 * c + 4 * Math.pow(c, 2) + als / 30 * (61 - 58 * t + Math.pow(t, 2) + 600 * c - 330 * this.ep2))))) + this.y0;

  }
  p.x = x;
  p.y = y;
  return p;
};

/**
    Transverse Mercator Inverse  -  x/y to long/lat
  */
exports.inverse = function(p) {
  var con, phi;
  var delta_phi;
  var i;
  var max_iter = 6;
  var lat, lon;

  if (this.sphere) {
    var f = Math.exp(p.x / (this.a * this.k0));
    var g = 0.5 * (f - 1 / f);
    var temp = this.lat0 + p.y / (this.a * this.k0);
    var h = Math.cos(temp);
    con = Math.sqrt((1 - h * h) / (1 + g * g));
    lat = common.asinz(con);
    if (temp < 0) {
      lat = -lat;
    }
    if ((g === 0) && (h === 0)) {
      lon = this.long0;
    }
    else {
      lon = common.adjust_lon(Math.atan2(g, h) + this.long0);
    }
  }
  else { // ellipsoidal form
    var x = p.x - this.x0;
    var y = p.y - this.y0;

    con = (this.ml0 + y / this.k0) / this.a;
    phi = con;
    for (i = 0; true; i++) {
      delta_phi = ((con + this.e1 * Math.sin(2 * phi) - this.e2 * Math.sin(4 * phi) + this.e3 * Math.sin(6 * phi)) / this.e0) - phi;
      phi += delta_phi;
      if (Math.abs(delta_phi) <= common.EPSLN) {
        break;
      }
      if (i >= max_iter) {
        return (95);
      }
    } // for()
    if (Math.abs(phi) < common.HALF_PI) {
      var sin_phi = Math.sin(phi);
      var cos_phi = Math.cos(phi);
      var tan_phi = Math.tan(phi);
      var c = this.ep2 * Math.pow(cos_phi, 2);
      var cs = Math.pow(c, 2);
      var t = Math.pow(tan_phi, 2);
      var ts = Math.pow(t, 2);
      con = 1 - this.es * Math.pow(sin_phi, 2);
      var n = this.a / Math.sqrt(con);
      var r = n * (1 - this.es) / con;
      var d = x / (n * this.k0);
      var ds = Math.pow(d, 2);
      lat = phi - (n * tan_phi * ds / r) * (0.5 - ds / 24 * (5 + 3 * t + 10 * c - 4 * cs - 9 * this.ep2 - ds / 30 * (61 + 90 * t + 298 * c + 45 * ts - 252 * this.ep2 - 3 * cs)));
      lon = common.adjust_lon(this.long0 + (d * (1 - ds / 6 * (1 + 2 * t + c - ds / 20 * (5 - 2 * c + 28 * t - 3 * cs + 8 * this.ep2 + 24 * ts))) / cos_phi));
    }
    else {
      lat = common.HALF_PI * common.sign(y);
      lon = this.long0;
    }
  }
  p.x = lon;
  p.y = lat;
  return p;
};
exports.names = ["Transverse_Mercator", "Transverse Mercator", "tmerc"];

},{"../common":28}],67:[function(require,module,exports){
var common = require('../common');
var tmerc = require('./tmerc');
exports.dependsOn = 'tmerc';
exports.init = function() {
  if (!this.zone) {
    return;
  }
  this.lat0 = 0;
  this.long0 = ((6 * Math.abs(this.zone)) - 183) * common.D2R;
  this.x0 = 500000;
  this.y0 = this.utmSouth ? 10000000 : 0;
  this.k0 = 0.9996;

  tmerc.init.apply(this);
  this.forward = tmerc.forward;
  this.inverse = tmerc.inverse;
};
exports.names = ["Universal Transverse Mercator System", "utm"];

},{"../common":28,"./tmerc":66}],68:[function(require,module,exports){
var common = require('../common');

/* Initialize the Van Der Grinten projection
  ----------------------------------------*/
exports.init = function() {
  //this.R = 6370997; //Radius of earth
  this.R = this.a;
};

exports.forward = function(p) {

  var lon = p.x;
  var lat = p.y;

  /* Forward equations
    -----------------*/
  var dlon = common.adjust_lon(lon - this.long0);
  var x, y;

  if (Math.abs(lat) <= common.EPSLN) {
    x = this.x0 + this.R * dlon;
    y = this.y0;
  }
  var theta = common.asinz(2 * Math.abs(lat / common.PI));
  if ((Math.abs(dlon) <= common.EPSLN) || (Math.abs(Math.abs(lat) - common.HALF_PI) <= common.EPSLN)) {
    x = this.x0;
    if (lat >= 0) {
      y = this.y0 + common.PI * this.R * Math.tan(0.5 * theta);
    }
    else {
      y = this.y0 + common.PI * this.R * -Math.tan(0.5 * theta);
    }
    //  return(OK);
  }
  var al = 0.5 * Math.abs((common.PI / dlon) - (dlon / common.PI));
  var asq = al * al;
  var sinth = Math.sin(theta);
  var costh = Math.cos(theta);

  var g = costh / (sinth + costh - 1);
  var gsq = g * g;
  var m = g * (2 / sinth - 1);
  var msq = m * m;
  var con = common.PI * this.R * (al * (g - msq) + Math.sqrt(asq * (g - msq) * (g - msq) - (msq + asq) * (gsq - msq))) / (msq + asq);
  if (dlon < 0) {
    con = -con;
  }
  x = this.x0 + con;
  //con = Math.abs(con / (common.PI * this.R));
  var q = asq + g;
  con = common.PI * this.R * (m * q - al * Math.sqrt((msq + asq) * (asq + 1) - q * q)) / (msq + asq);
  if (lat >= 0) {
    //y = this.y0 + common.PI * this.R * Math.sqrt(1 - con * con - 2 * al * con);
    y = this.y0 + con;
  }
  else {
    //y = this.y0 - common.PI * this.R * Math.sqrt(1 - con * con - 2 * al * con);
    y = this.y0 - con;
  }
  p.x = x;
  p.y = y;
  return p;
};

/* Van Der Grinten inverse equations--mapping x,y to lat/long
  ---------------------------------------------------------*/
exports.inverse = function(p) {
  var lon, lat;
  var xx, yy, xys, c1, c2, c3;
  var a1;
  var m1;
  var con;
  var th1;
  var d;

  /* inverse equations
    -----------------*/
  p.x -= this.x0;
  p.y -= this.y0;
  con = common.PI * this.R;
  xx = p.x / con;
  yy = p.y / con;
  xys = xx * xx + yy * yy;
  c1 = -Math.abs(yy) * (1 + xys);
  c2 = c1 - 2 * yy * yy + xx * xx;
  c3 = -2 * c1 + 1 + 2 * yy * yy + xys * xys;
  d = yy * yy / c3 + (2 * c2 * c2 * c2 / c3 / c3 / c3 - 9 * c1 * c2 / c3 / c3) / 27;
  a1 = (c1 - c2 * c2 / 3 / c3) / c3;
  m1 = 2 * Math.sqrt(-a1 / 3);
  con = ((3 * d) / a1) / m1;
  if (Math.abs(con) > 1) {
    if (con >= 0) {
      con = 1;
    }
    else {
      con = -1;
    }
  }
  th1 = Math.acos(con) / 3;
  if (p.y >= 0) {
    lat = (-m1 * Math.cos(th1 + common.PI / 3) - c2 / 3 / c3) * common.PI;
  }
  else {
    lat = -(-m1 * Math.cos(th1 + common.PI / 3) - c2 / 3 / c3) * common.PI;
  }

  if (Math.abs(xx) < common.EPSLN) {
    lon = this.long0;
  }
  else {
    lon = common.adjust_lon(this.long0 + common.PI * (xys - 1 + Math.sqrt(1 + 2 * (xx * xx - yy * yy) + xys * xys)) / 2 / xx);
  }

  p.x = lon;
  p.y = lat;
  return p;
};
exports.names = ["Van_der_Grinten_I", "VanDerGrinten", "vandg"];
},{"../common":28}],69:[function(require,module,exports){
var common = require('./common');
var datum_transform = require('./datum_transform');
var adjust_axis = require('./adjust_axis');
var proj = require('./Proj');
module.exports = function transform(source, dest, point) {
  var wgs84;

  function checkNotWGS(source, dest) {
    return ((source.datum.datum_type === common.PJD_3PARAM || source.datum.datum_type === common.PJD_7PARAM) && dest.datumCode !== "WGS84");
  }

  // Workaround for datum shifts towgs84, if either source or destination projection is not wgs84
  if (source.datum && dest.datum && (checkNotWGS(source, dest) || checkNotWGS(dest, source))) {
    wgs84 = new proj('WGS84');
    transform(source, wgs84, point);
    source = wgs84;
  }
  // DGR, 2010/11/12
  if (source.axis !== "enu") {
    adjust_axis(source, false, point);
  }
  // Transform source points to long/lat, if they aren't already.
  if (source.projName === "longlat") {
    point.x *= common.D2R; // convert degrees to radians
    point.y *= common.D2R;
  }
  else {
    if (source.to_meter) {
      point.x *= source.to_meter;
      point.y *= source.to_meter;
    }
    source.inverse(point); // Convert Cartesian to longlat
  }
  // Adjust for the prime meridian if necessary
  if (source.from_greenwich) {
    point.x += source.from_greenwich;
  }

  // Convert datums if needed, and if possible.
  point = datum_transform(source.datum, dest.datum, point);

  // Adjust for the prime meridian if necessary
  if (dest.from_greenwich) {
    point.x -= dest.from_greenwich;
  }

  if (dest.projName === "longlat") {
    // convert radians to decimal degrees
    point.x *= common.R2D;
    point.y *= common.R2D;
  }
  else { // else project
    dest.forward(point);
    if (dest.to_meter) {
      point.x /= dest.to_meter;
      point.y /= dest.to_meter;
    }
  }

  // DGR, 2010/11/12
  if (dest.axis !== "enu") {
    adjust_axis(dest, true, point);
  }

  return point;
};
},{"./Proj":26,"./adjust_axis":27,"./common":28,"./datum_transform":36}],70:[function(require,module,exports){
module.exports = '1.5.0-dev.3';
},{}],71:[function(require,module,exports){
var common = require('./common');
var extend = require('./extend');

function mapit(obj, key, v) {
  obj[key] = v.map(function(aa) {
    var o = {};
    sExpr(aa, o);
    return o;
  }).reduce(function(a, b) {
    return extend(a, b);
  }, {});
}

function sExpr(v, obj) {
  var key;
  if (!Array.isArray(v)) {
    obj[v] = true;
    return;
  }
  else {
    key = v.shift();
    if (key === 'PARAMETER') {
      key = v.shift();
    }
    if (v.length === 1) {
      if (Array.isArray(v[0])) {
        obj[key] = {};
        sExpr(v[0], obj[key]);
      }
      else {
        obj[key] = v[0];
      }
    }
    else if (!v.length) {
      obj[key] = true;
    }
    else if (key === 'TOWGS84') {
      obj[key] = v;
    }
    else {
      obj[key] = {};
      if (['UNIT', 'PRIMEM', 'VERT_DATUM'].indexOf(key) > -1) {
        obj[key] = {
          name: v[0].toLowerCase(),
          convert: v[1]
        };
        if (v.length === 3) {
          obj[key].auth = v[2];
        }
      }
      else if (key === 'SPHEROID') {
        obj[key] = {
          name: v[0],
          a: v[1],
          rf: v[2]
        };
        if (v.length === 4) {
          obj[key].auth = v[3];
        }
      }
      else if (['GEOGCS', 'GEOCCS', 'DATUM', 'VERT_CS', 'COMPD_CS', 'LOCAL_CS', 'FITTED_CS', 'LOCAL_DATUM'].indexOf(key) > -1) {
        v[0] = ['name', v[0]];
        mapit(obj, key, v);
      }
      else if (v.every(function(aa) {
        return Array.isArray(aa);
      })) {
        mapit(obj, key, v);
      }
      else {
        sExpr(v, obj[key]);
      }
    }
  }
}

function rename(obj, params) {
  var outName = params[0];
  var inName = params[1];
  if (!(outName in obj) && (inName in obj)) {
    obj[outName] = obj[inName];
    if (params.length === 3) {
      obj[outName] = params[2](obj[outName]);
    }
  }
}

function d2r(input) {
  return input * common.D2R;
}

function cleanWKT(wkt) {
  if (wkt.type === 'GEOGCS') {
    wkt.projName = 'longlat';
  }
  else if (wkt.type === 'LOCAL_CS') {
    wkt.projName = 'identity';
    wkt.local = true;
  }
  else {
    if (typeof wkt.PROJECTION === "object") {
      wkt.projName = Object.keys(wkt.PROJECTION)[0];
    }
    else {
      wkt.projName = wkt.PROJECTION;
    }
  }
  if (wkt.UNIT) {
    wkt.units = wkt.UNIT.name.toLowerCase();
    if (wkt.units === 'metre') {
      wkt.units = 'meter';
    }
    if (wkt.UNIT.convert) {
      wkt.to_meter = parseFloat(wkt.UNIT.convert, 10);
    }
  }

  if (wkt.GEOGCS) {
    //if(wkt.GEOGCS.PRIMEM&&wkt.GEOGCS.PRIMEM.convert){
    //  wkt.from_greenwich=wkt.GEOGCS.PRIMEM.convert*common.D2R;
    //}
    if (wkt.GEOGCS.DATUM) {
      wkt.datumCode = wkt.GEOGCS.DATUM.name.toLowerCase();
    }
    else {
      wkt.datumCode = wkt.GEOGCS.name.toLowerCase();
    }
    if (wkt.datumCode.slice(0, 2) === 'd_') {
      wkt.datumCode = wkt.datumCode.slice(2);
    }
    if (wkt.datumCode === 'new_zealand_geodetic_datum_1949' || wkt.datumCode === 'new_zealand_1949') {
      wkt.datumCode = 'nzgd49';
    }
    if (wkt.datumCode === "wgs_1984") {
      if (wkt.PROJECTION === 'Mercator_Auxiliary_Sphere') {
        wkt.sphere = true;
      }
      wkt.datumCode = 'wgs84';
    }
    if (wkt.datumCode.slice(-6) === '_ferro') {
      wkt.datumCode = wkt.datumCode.slice(0, - 6);
    }
    if (wkt.datumCode.slice(-8) === '_jakarta') {
      wkt.datumCode = wkt.datumCode.slice(0, - 8);
    }
    if (wkt.GEOGCS.DATUM && wkt.GEOGCS.DATUM.SPHEROID) {
      wkt.ellps = wkt.GEOGCS.DATUM.SPHEROID.name.replace('_19', '').replace(/[Cc]larke\_18/, 'clrk');
      if (wkt.ellps.toLowerCase().slice(0, 13) === "international") {
        wkt.ellps = 'intl';
      }

      wkt.a = wkt.GEOGCS.DATUM.SPHEROID.a;
      wkt.rf = parseFloat(wkt.GEOGCS.DATUM.SPHEROID.rf, 10);
    }
  }
  if (wkt.b && !isFinite(wkt.b)) {
    wkt.b = wkt.a;
  }

  function toMeter(input) {
    var ratio = wkt.to_meter || 1;
    return parseFloat(input, 10) * ratio;
  }
  var renamer = function(a) {
    return rename(wkt, a);
  };
  var list = [
    ['standard_parallel_1', 'Standard_Parallel_1'],
    ['standard_parallel_2', 'Standard_Parallel_2'],
    ['false_easting', 'False_Easting'],
    ['false_northing', 'False_Northing'],
    ['central_meridian', 'Central_Meridian'],
    ['latitude_of_origin', 'Latitude_Of_Origin'],
    ['scale_factor', 'Scale_Factor'],
    ['k0', 'scale_factor'],
    ['latitude_of_center', 'Latitude_of_center'],
    ['lat0', 'latitude_of_center', d2r],
    ['longitude_of_center', 'Longitude_Of_Center'],
    ['longc', 'longitude_of_center', d2r],
    ['x0', 'false_easting', toMeter],
    ['y0', 'false_northing', toMeter],
    ['long0', 'central_meridian', d2r],
    ['lat0', 'latitude_of_origin', d2r],
    ['lat0', 'standard_parallel_1', d2r],
    ['lat1', 'standard_parallel_1', d2r],
    ['lat2', 'standard_parallel_2', d2r],
    ['alpha', 'azimuth', d2r],
    ['srsCode', 'name']
  ];
  list.forEach(renamer);
  if (!wkt.long0 && wkt.longc && (wkt.PROJECTION === 'Albers_Conic_Equal_Area' || wkt.PROJECTION === "Lambert_Azimuthal_Equal_Area")) {
    wkt.long0 = wkt.longc;
  }
}
module.exports = function(wkt, self) {
  var lisp = JSON.parse(("," + wkt).replace(/\s*\,\s*([A-Z_0-9]+?)(\[)/g, ',["$1",').slice(1).replace(/\s*\,\s*([A-Z_0-9]+?)\]/g, ',"$1"]'));
  var type = lisp.shift();
  var name = lisp.shift();
  lisp.unshift(['name', name]);
  lisp.unshift(['type', type]);
  lisp.unshift('output');
  var obj = {};
  sExpr(lisp, obj);
  cleanWKT(obj.output);
  return extend(self, obj.output);
};

},{"./common":28,"./extend":38}]},{},[6])
(6)
});
;