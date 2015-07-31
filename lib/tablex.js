'use strict';
module.exports = function (buffer){
  var data = new DataView(buffer);
  var offset = 8;
  var rows = [];
  var len = data.getUint32(offset, true);
  offset += 8;//yes 8
  var i = 0;
  while(i < len){
    rows[i++] = data.getUint32(offset, true);
    offset += 5;//yes 5
  }
  return rows;
};
