'use strict';
module.exports = function (buffer, bufferx){
  var tblNumRows = new DataView(buffer).getUint32(4, true);
  var data = new DataView(bufferx);
  var rows = [];
  var offset = 16;
  var i = 0;
  while(i<tblNumRows){
    var val = data.getUint32(offset,true);
    if(val!==0){rows[i++] = val;}
    offset += 5;//yes 5
  }
  return rows;
};
