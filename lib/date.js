'use strict';
module.exports = function(days){
  //convert excel days since 12/30/1899 to JavaScript ms since 1/1/1970
  var unixDays = days - 25569;//days between two dates
  var ms = unixDays * 864e5;//milliseconds per day
  return new Date(ms);
};
