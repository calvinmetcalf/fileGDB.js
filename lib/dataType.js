'use strict';
var Long = require('long');
var l127 = Long.fromNumber(127, true);

function makeLong(n) {
  return Long.fromNumber(n, true);
}

function Data(buffer, offset) {
  this.data = new DataView(buffer);
  this.offset = offset;
}

Data.prototype.getUint8 = function() {
  return this.data.getUint8(this.offset++);
};
//these two functions are ported somewhat directly from
//http://trac.osgeo.org/gdal/attachment/wiki/FGDBSpecification/dump_gdbtable.py#L60
Data.prototype.varuint = function() {
  //console.log('offset',this.offset);
  var ret = 0;
  var shift = -7;
  var b = 128;
  while (b & 128) {
    shift += 7;
    //console.log('shift',shift);
    b = this.getUint8();
    //.log('b',b);
    ret = l127.and(makeLong(b)).shiftLeft(shift).or(makeLong(ret)).toNumber();
    //console.log('ret',ret);
  }
  return ret;
};
Data.prototype.varint = function() {
  var b = this.getUint8();
  var ret = (b & 63);
  var sign = 1;
  if (b & 64) {
    sign = -1;
  }
  if (!(b & 128)) {
    return ret * sign;
  }
  var shift = -1;
  while (b & 128) {
    shift += 7;
    b = this.getUint8();
    ret = l127.and(makeLong(b)).shiftLeft(shift).or(makeLong(ret)).toNumber();
  }
  return ret * sign;
};
Data.prototype.getUint16 = function() {
  var out = this.data.getUint16(this.offset, true);
  this.offset += 2;
  return out;
};
Data.prototype.getInt16 = function() {
  var out = this.data.getInt16(this.offset, true);
  this.offset += 2;
  return out;
};
Data.prototype.getUint32 = function() {
  var out = this.data.getUint32(this.offset, true);
  this.offset += 4;
  return out;
};
Data.prototype.getInt32 = function() {
  var out = this.data.getInt32(this.offset, true);
  this.offset += 4;
  return out;
};
Data.prototype.getFloat32 = function() {
  var out = this.data.getFloat32(this.offset, true);
  this.offset += 4;
  return out;
};
Data.prototype.getFloat64 = function() {
  var out = this.data.getFloat64(this.offset, true);
  this.offset += 8;
  return out;
};
module.exports = Data;
