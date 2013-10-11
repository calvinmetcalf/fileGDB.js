function Data(buffer,offset){
	this.data = new DataView(buffer);
	this.offset = offset;
	this.getUint8 = function(){
		return this.data.getUint8(this.offset++);
	};
	//these two functions are ported fairly directly from
	//http://trac.osgeo.org/gdal/attachment/wiki/FGDBSpecification/dump_gdbtable.py#L60
	this.varuint = function (){
		var ret = 0;
		var shift = -7;
		var b = 128;
		while(b & 128){
			shift += 7;
			b = this.getUint8();
			ret |= ((b & 127) << shift);
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
			ret |= ((b & 127) << shift);
		}
		return ret*shift;
	};
	this.getUint16 = function(){
		var out = this.data.getUint16(this.offset,true);
		this.offset += 2;
		return out;
	};
	this.getUint32 = function(){
		var out = this.data.getUint16(this.offset,true);
		this.offset += 2;
		return out;
	};
	this.getFloat32 = function(){
		var out = this.data.getFloat32(this.offset,true);
		this.offset += 2;
		return out;
	};
	this.getFloat64 = function(){
		var out = this.data.getFloat64(this.offset,true);
		this.offset += 4;
		return out;
	};
}
module.exports = Data;