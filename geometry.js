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
		base: "polyone",
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
		return (v+this.origin[i]*this.scale[i])/this.scale[i];
	}
	function reduceit(v,i){
		if(i>=this.rmin){
			return;
		}
		this.accumulater[i]+=v;
		return this.accumulater[i]/this.scale[i];
	}
	this.convert = function(point){
		this.tmin = Math.min(point.length,this.min);
		return  point.map(addit,this);
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
		if(shape.z){
			raw.push(data.varuint());
		}
		if(shape.m){
			raw.push(data.varuint());
		}
		return raw;
	}
	function getI(shape){
		var raw = [];
		raw.push(data.varint());//x
		raw.push(data.varint());//y
		if(shape.z){
			raw.push(data.varint());
		}
		if(shape.m){
			raw.push(data.varint());
		}
		return raw;
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
		return makePoint.convert(getU(shape));
	};
	typeFuncs.mpoint = function(shape){
		var len = data.varuint();
		if(len === 1){
			return typeFuncs.point(shape);
		}
		var i = 1;
		makePoint.reduceBegin(typeFuncs.point(shape));
		while(i++<len){
			makePoint.reduce(getI(shape));
		}
		return makePoint.line.slice();//this might not be needed
	};
	typeFuncs.complex = function(shape){
		var points = data.varuint();
		var tPoints = points;
		var parts = data.varuint();
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
		var part = -1;
		var point = 1;
		makePoint.reduceBegin(typeFuncs.point(shape));
		while(++part<parts){
			while(point++<lens[part]){
				makePoint.reduce(getI(shape));
			}
			lines.push(makePoint.line.slice());
			makePoint.line = [];
			point = 0;
		}
		return lines;
	};
	var len = data.varuint();//len
	if(!len){
		throw 'no length';
	}
	var type = data.getUint8();
	if(!type || !types[type]){
		throw type+' is not a real type';
	}
	var shape = types[type];
	var geometry = typeFuncs(shape);
	switch(shape.base){
		case 'point':
			return {
				type:"Point",
				coordinates:geometry
			};
		case 'mpoint':
			if(geometry.length === 1){
				return {
					type:"Point",
					coordinates:geometry[0]
				};
			}else{
				return {
					type:"MultiPoint",
					coordinates:geometry
				};
			}
			break;
		case 'line':
			if(geometry.length === 1){
				return {
					type:"LineString",
					coordinates:geometry[0]
				};
			}else{
				return {
					type:"MultiLineString",
					coordinates:geometry
				};
			}
			break;
		case 'polygon':
			if(geometry.length === 1){
				return {
					type:"Polygon",
					coordinates:geometry[0]
				};
			}else{
				return {
					type:"MultiPolygon",
					coordinates:geometry
				};
			}
	}
};