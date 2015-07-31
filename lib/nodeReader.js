'use strict';
var fs = require('fs');
var path = require('path');
var Promise = require('lie');
function readFile(path) {
  return new Promise(function (yes, no) {
    fs.readFile(path, function (err, resp) {
      if (err) {
        no(err);
      } else {
        yes(resp);
      }
    });
  });
}
function readDir(path) {
  return new Promise(function (yes, no) {
    fs.readdir(path, function (err, resp) {
      if (err) {
        no(err);
      } else {
        yes(resp);
      }
    });
  });
}
var read = require('./read');
function getNames(pathString){
  return readDir(pathString).then(function(rawPaths){
    var paths = rawPaths.filter(function(a){
      return a.slice(-9) === '.gdbtable' && parseInt(a.slice(1, -9), 16) > 8;
    });
    paths.sort(function(a, b){
      return parseInt(a.slice(1, -9), 16) - parseInt(b.slice(1, -9), 16);
    });
    return readFiles(path.join(pathString, 'a00000001.gdbtable')).then(function(files){
      var out = {};
      var i = 0;
      files.filter(function(name){
          var fileName;
          if(name.Name.slice(0, 4) !== 'GDB_'){
            fileName = paths[i++];
            out[name.Name] = fileName;
          }
        });
      return out;
    });
  });
}
function readFiles(file){
  return new Promise(function(yes){
    yes(Promise.all([readFile(file), readFile(file.slice(0, -1) + 'x')]).then(function(buffers){
      return read(buffers[0], buffers[1]);
    }));
  });
}
module.exports = function(pathString){
  return getNames(pathString).then(function(names){
    var out = {};
    return Promise.all(Object.keys(names).map(function(key){
      return readFiles(path.join(pathString, names[key])).then(function(v){
          out[key] = v;
        });
    })).then(function(){
      return out;
    });
  });
};
