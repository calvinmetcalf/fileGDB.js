'use strict';
var JSZip = require('jszip');
var toArray = require('./util').toArray;
var read = require('./read');
var Promise = require('lie');
module.exports = function(buffer) {
  return new Promise(function(yes) {
    var zip = new JSZip(buffer);
    var unzippedFiles = zip.file(/a0{1,7}(?:[^2-8]|[190a-z]|(?:[1-9a-z]+[0-9a-z]+))\.(?:gdbtable|gdbtablx)/);
    var tableA = {};
    var tablxA = {};
    unzippedFiles.forEach(function(file) {
      if (file.name.slice(-9) === '.gdbtable' && (parseInt(file.name.slice(-17, -9), 16) === 1 || parseInt(file.name.slice(-17, -9), 16) > 8)) {
        tableA[parseInt(file.name.slice(-17, -9), 16)] = file;
      } else if (file.name.slice(-9) === '.gdbtablx' && (parseInt(file.name.slice(-17, -9), 16) === 1 || parseInt(file.name.slice(-17, -9), 16) > 8)) {
        tablxA[parseInt(file.name.slice(-17, -9), 16)] = file;
      }
    });
    var table = toArray(tableA);
    var tablx = toArray(tablxA);
    function readFile(num) {
      if(process.browser){
        return read(table[num].asArrayBuffer(), tablx[num].asArrayBuffer());
      }else{
        return read(table[num].asNodeBuffer(), tablx[num].asNodeBuffer());
      }
    }
    var files = readFile(0);
    var names = {};
    var i = 1;
    files.forEach(function(name) {
      if (name.Name.slice(0, 4) !== 'GDB_') {
        names[name.Name] = i++;
      }
    });
    var out = {};
    Object.keys(names).forEach(function(key) {
      out[key] = readFile(names[key]);
    });

    yes(out);

  });
};
