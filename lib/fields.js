'use strict';
var proj4 = require('proj4');
var fileHeader = require('./table');
function get2(offset, data) {
  var out = {
    meta: {nullable: true}
  };
  out.meta.len = data.getUint8(offset++, true);
  out.meta.flag = data.getUint8(offset++, true);
  if((out.meta.flag & 1) === 0) {
    out.meta.nullable = false;
  }
  out.offset = offset;
  return out;
}
function get3(offset, data) {
  var out = {
    meta: {nullable: true}
  };
  out.meta.len = data.getUint8(offset++, true);
  out.meta.flag = data.getUint8(offset++, true);
  if((out.meta.flag & 1) === 0){
    out.meta.nullable = false;
  }
  out.offset = ++offset;
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
      meta: {nullable: true}
    };
    out.meta.len = data.getUint32(offset, true);
    offset += 4;
    out.meta.flag = data.getUint8(offset++, true);
    if((out.meta.flag & 1) === 0){
      out.meta.nullable = false;
    }
    out.offset = ++offset;
    return out;
  },
  get3,//datetime
  function(offset) {
    //oid
    var out = {
      meta: {}
    };
    offset++;
    offset++;
    out.meta.nullable = false;
    out.offset = offset;
    return out;
  },
  function(offset, data){
    //shape
    offset += 2;
    var out = {
      meta: {nullable: true}
    };
    var srsLen = data.getUint16(offset, true);
    offset += 2;
    var i = 0;
    out.meta.wkt = '';
    var char;
    while(i < srsLen){
      char = data.getUint8(offset++, true);
      if(char){
        out.meta.wkt += String.fromCharCode(char);
      }
      i++;
    }
    if(out.meta.wkt){
      out.meta.proj = proj4(out.meta.wkt);
    }
    var magic = data.getUint8(offset++, true);
    out.meta.origin = [];
    out.meta.origin.push(data.getFloat64(offset, true));
    offset += 8;
    out.meta.origin.push(data.getFloat64(offset, true));
    offset += 8;
    var xyScale = data.getFloat64(offset, true);
    offset += 8;
    out.meta.scale = [xyScale, xyScale];
    if(magic !== 1){
      out.meta.origin.push(data.getFloat64(offset, true));
      offset += 8;
      out.meta.scale.push(data.getFloat64(offset, true));
      offset += 8;
      if(magic !== 5){
        out.meta.origin.push(data.getFloat64(offset, true));
        offset += 8;
        out.meta.scale.push(data.getFloat64(offset, true));
        offset += 8;
      }
    }
    var xytolerance = data.getFloat64(offset, true);
    out.meta.tolerance = [xytolerance, xytolerance];
    offset += 8;
    if(magic !== 1){
      out.meta.tolerance.push(data.getFloat64(offset, true));
      offset += 8;
      if(magic !== 5){
        out.meta.tolerance.push(data.getFloat64(offset, true));
        offset += 8;
      }
      i = 4;
      out.meta.extent = [];
      while(i--){
        out.meta.extent.push(data.getFloat64(offset, true));
        offset += 8;
      }
    }
    //console.log('tolerance',out.meta.tolerance);
    //console.log('extent',out.meta.extent);
    function testMagic3(num){
      return num === 0;
    }
    var magic2, magic3;
    while(true){
      magic2 = data.getUint8(offset + 1, true);
      magic3 = [data.getUint8(offset, true), data.getUint8(offset + 2, true), data.getUint8(offset + 3, true), data.getUint8(offset + 4, true)];
      //console.log('magic2',magic2);
      if(magic2 < 5 && magic2 > 0 && magic3.every(testMagic3)){
        offset += 5;
        offset += (magic2 * 8);
        break;
      }else{
        offset += 8;
      }
    }
    out.offset = offset;
    return out;
  },
  function(offset, data) {
    //binary
    var out = {
      meta: {nullable: true}
    };
    offset++;
    out.meta.flag = data.getUint8(offset++, true);
    if((out.meta.flag & 1) === 0){
      out.meta.nullable = false;
    }
    out.offset = offset;
    return out;
  },
  null,
  get2,//UUID
  get2,//UUID
  get2//xml
];
function parseFields(buffer){
  var headers = fileHeader(buffer);
  var data = new DataView(buffer, headers.fdOffset);
  var out = {};
  out.size = data.getUint32(0 << 2, true);
  out.version = data.getUint32(1 << 2, true);
  out.geometry = data.getUint8(2 << 2, true);
  out.num = data.getUint16(3 << 2, true);
  out.fields = [];
  out.nullableFields = 0;
  var offset = 14;
  out.geometry = false;
  var i = 0;
  var cur;
  var j;
  var temp;
  while(i < out.num){
    cur = {};
    //console.log('offset',offset);
    cur.chars = data.getUint8(offset++, true);
    while(cur.chars === 0){
      cur.chars = data.getUint8(offset++, true);
    }
    cur.title = '';
    j = 0;
    while(j < cur.chars){
      cur.title += String.fromCharCode(data.getUint16(offset, true));
      j++;
      offset += 2;
    }
    //console.log('title',cur.title);
    cur.chars = data.getUint8(offset++, true);
    if(cur.chars > 0){
      cur.alias = '';
      j = 0;
      while(j < cur.chars){
        cur.alias += String.fromCharCode(data.getUint16(offset, true));
        j++;
        offset += 2;
      }
      //console.log('alias',cur.alias);
    }
    cur.type = data.getUint8(offset++, true);
    //console.log('type',cur.type);
    if(!dataHeaders[cur.type]){
      throw new Error('not a real type');
    }
    temp = dataHeaders[cur.type](offset, data);
    offset = temp.offset;
    cur.meta = temp.meta;
    if(cur.type === 7){
      out.geometry = true;
      out.bbox = cur.meta.extent;
    }
    if(cur.meta.nullable){
      out.nullableFields++;
      cur.nullable = true;
    }
    out.fields[i++] = cur;
  }
  out.offset = offset;
  return out;
}
module.exports = parseFields;
