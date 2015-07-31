'use strict';
module.exports = function(buffer){
  var data = new Uint32Array(buffer, 0, 40);
  return {
    rows: data[1],
    fileSize: data[6],
    fdOffset: data[8]
  };
};
