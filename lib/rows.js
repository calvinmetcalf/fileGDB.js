'use strict';
var convertDate = require('./date');
var parseGeometry = require('./geometry');
var Data = require('./dataType');
var parseFields = require('./fields');
var tablex = require('./tablex');
function parseUUID(data){
    //uuid
    var out = '';
    var x = 16;
    while(x--){
      out += data.getUint8().toString(16);
    }
    return out;
  }
function parseText(data){
    //xml or string
    var str = '';
    var i = 0;
    var len = data.varuint();
    //console.log('len',len);
    while(i < len){
      str += String.fromCharCode.call(false, data.getUint8());
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
  function(){
    //oid
    return;
  },
  parseGeometry,
  function(data){
    //binary
    var out = [];
    var i = 0;
    var len = data.varuint();
    while(i < len){
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

module.exports = function(buffer, bufferx){
  var fieldInfo = parseFields(buffer);
  var rowOffsets = tablex(bufferx);
  var out = rowOffsets.map(function(offset){
      //console.log('row',i);
      if(!offset){
        return null;
      }
      var len = (new DataView(buffer, offset, 4)).getUint32(0, true);
      offset += 4;
      var data = new Data(buffer, offset, len);
      var flags = [];
      var nf = fieldInfo.nullableFields;
      var nullPlace = 0;
      var nullableThings = false;
      if(nf){
        nullableThings = true;
        while(nf > 0){
          flags.push(data.getUint8());
          nf -= 8;
        }
      }
      //console.log('flags',flags);
      var nullGeometry = false;
      var out = {};
      if(fieldInfo.geometry){
        out.type = 'Feature';
        out.properties = {};
      }
      fieldInfo.fields.forEach(function(field){
        //console.log('title',field.title);
        var test;
        if(nullableThings){
          if(field.nullable){
            //console.log('nullPlace',nullPlace);
            test = (flags[nullPlace >> 3] & (1 << (nullPlace % 8)));
            nullPlace++;
            if(test !== 0){
              return;
            }
          }
        }
        var row = dataTypes[field.type](data, field);
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
              nullGeometry = true;
              return;
            }
          }else{
            out.properties[field.title] = row;
          }
        }else{
          out[field.title] = row;
        }
      });
      if(nullGeometry){
        return false;
      }else{
        return out;
      }

    }).filter(function(row){
      return row;
    });
  if(fieldInfo.geometry){
    return {
      type: 'FeatureCollection',
      features: out,
      bbox: fieldInfo.bbox
    };
  }else{
    return out;
  }
};
