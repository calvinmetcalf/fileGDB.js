'use strict';
module.exports = function (buffer, bufferx){
  var tbl_num_rows = (new DataView(buffer)).getUint32(4,true);
  var data = new DataView(bufferx);
  var rows = [];
  var offset = 16;
  var i = 0;
  while(i<tbl_num_rows){
    var val = data.getUint32(offset,true);
    if(val==0){offset += 5;continue;}
    rows[i++] = val;
    offset += 5;//yes 5
  }
  return rows;
};
