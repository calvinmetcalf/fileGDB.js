'use strict';
var rows = require('./rows');
var util = require('./util');
module.exports = function(table, tablex){
  if(!process.browser){
    table = util.toArrayBuffer(table);
    tablex = util.toArrayBuffer(tablex);
  }
  return rows(table, tablex);
};
