'use strict';
var Promise = require('lie');
function binaryAjax(url) {
  return new Promise(function(resolve, reject) {
    var ajax = new XMLHttpRequest();
    ajax.open('GET', url, true);
    ajax.responseType = 'arraybuffer';
    ajax.addEventListener('load', function() {
      if (ajax.status > 399) {
        return reject(ajax.status);
      }
      resolve(ajax.response);
    }, false);
    ajax.send();
  });
}
module.exports = binaryAjax;
