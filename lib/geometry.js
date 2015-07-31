'use strict';
var Long = require('long');

function checkIt(check, num) {
  return !Long.fromNumber(num, true).and(check);
}
var zCheck = Long.fromNumber(0x80000000, true);
var mCheck = Long.fromNumber(0x40000000, true);
var cCheck = Long.fromNumber(0x20000000, true);

function isClockWise(array) {
  var sum = 0;
  var i = 1;
  var len = array.length;
  var prev, cur;
  while (i < len) {
    prev = cur || array[0];
    cur = array[i];
    sum += ((cur[0] - prev[0]) * (cur[1] + prev[1]));
    i++;
  }
  return sum > 0;
}

function polyReduce(a, b) {
  if (isClockWise(b) || !a.length) {
    a.push([b]);
  } else {
    a[a.length - 1].push(b);
  }
  return a;
}
var types = {
  11: {
    base: 'point',
    m: true,
    z: true
  },
  10: {
    base: 'line',
    m: false,
    z: true
  },
  13: {
    base: 'line',
    m: true,
    z: true
  },
  15: {
    base: 'polygon',
    m: true,
    z: true
  },
  21: {
    base: 'point',
    m: true,
    z: false
  },
  23: {
    base: 'line',
    m: true,
    z: false
  },
  19: {
    base: 'polygon',
    m: false,
    z: true
  },
  18: {
    base: 'mpoint',
    m: true,
    z: true
  },
  28: {
    base: 'mpoint',
    m: true,
    z: false
  },
  20: {
    base: 'mpoint',
    m: false,
    z: true
  },
  1: {
    base: 'point',
    m: false,
    z: false
  },
  3: {
    base: 'line',
    m: false,
    z: false
  },
  5: {
    base: 'polygon',
    m: false,
    z: false
  },
  25: {
    base: 'polygon',
    m: true,
    z: false
  },
  9: {
    base: 'point',
    m: false,
    z: true
  },
  8: {
    base: 'mpoint',
    m: false,
    z: false
  }
};

function MakePoint(meta) {
  this.origin = meta.origin;
  this.scale = meta.scale;
  this.min = Math.min(this.origin.length, this.scale.length);

  // function addit(v, i) {
  //   if (i >= this.tmin) {
  //     return;
  //   }
  //   return v / this.scale[i] + this.origin[i];
  // }

  function reduceit(v, i) {
    if (i >= this.rmin) {
      return undefined;
    }
    this.accumulater[i] += (v / this.scale[i]);
    return this.accumulater[i];
  }
  this.convert = function(point, origin) {
    origin = origin || this.origin;
    var scale = this.scale;
    var tmin = Math.min(point.length, this.min);
    return point.map(function(v, i) {
      if (i >= tmin) {
        return undefined;
      }
      return v / scale[i] + origin[i];
    }, this);
  };
  this.reduceBegin = function(point) {
    var npoint = this.convert(point);
    this.accumulater = npoint.slice();
    this.line = [npoint];
  };
  this.reduce = function(point) {
    this.rmin = Math.min(point.length, this.min, this.accumulater.length);
    this.line.push(point.map(reduceit, this));
  };
}
module.exports = function(data, row) {
  function getU(shape) {
    var raw = [];
    raw.push(data.varuint()); //x
    raw.push(data.varuint()); //y
    if (shape.base === 'point') {
      if (shape.z) {
        raw.push(data.varuint());
      }
      if (shape.m) {
        raw.push(data.varuint());
      }
    }
    return raw;
  }

  function getI(shape) {
    var raw = [];
    raw.push(data.varint()); //x
    raw.push(data.varint()); //y
    if (shape.base === 'point') {
      if (shape.z) {
        raw.push(data.varint());
      }
      if (shape.m) {
        raw.push(data.varint());
      }
    }
    return raw;
  }
  var converter;
  if (row.meta.proj) {
    converter = function(point) {
      return row.meta.proj.inverse(point);
    };
  } else {
    converter = function(point) {
      return point;
    };
  }

  var makePoint = new MakePoint(row.meta);

  function typeFuncs(shape) {
    if (shape.base === 'point' || shape.base === 'mpoint') {
      return typeFuncs[shape.base](shape);
    } else {
      return typeFuncs.complex(shape);
    }
  }
  typeFuncs.point = function(shape) {
    return {
      type: 'Point',
      coordinates: converter(makePoint.convert(getU(shape)))
    };
  };
  typeFuncs.mpoint = function(shape) {
    var len = data.varuint();
    //console.log('len', len);
    var mins = [data.varuint(), data.varuint()];
    var maxes = [data.varuint(), data.varuint()];
    var bbox = makePoint.convert(mins).concat(makePoint.convert(maxes, makePoint.convert(mins)));
    //console.log('mins', makePoint.convert(mins));
    //console.log('maxes', makePoint.convert(maxes, makePoint.convert(mins)));
    var i = 1;
    var point1 = getI(shape);
    var points = [];
    while (i++ < len) {
      points.push(getI(shape));
    }
    if (shape.z) {
      point1.push(data.varint());
      i = 1;
      while (i < len) {
        points[i - 1].push(data.varint());
        i++;
      }
    }
    makePoint.reduceBegin(point1);
    points.forEach(function(v) {
      makePoint.reduce(v);
    });
    var outPoints = makePoint.line.map(converter);
    if (outPoints.length === 1) {
      return {
        type: 'Point',
        coordinates: outPoints[0]
      };
    } else if (outPoints.length > 1) {
      return {
        bbox: bbox,
        type: 'MultiPoint',
        coordinates: outPoints
      };
    } else {
      return false;
    }
  };
  typeFuncs.complex = function(shape) {
    var points = data.varuint();
    var tPoints = points;
    var parts = data.varuint();
    var mins = [data.varuint(), data.varuint()];
    var maxes = [data.varuint(), data.varuint()];
    var bbox = makePoint.convert(mins).concat(makePoint.convert(maxes, makePoint.convert(mins)));
    var i = 1;
    var lens = [];
    var tlen;
    while (i++ < parts) {
      tlen = data.varuint();
      tPoints -= tlen;
      lens.push(tlen);
    }
    lens.push(tPoints);
    var lines = [];
    var rawLines = [];
    var part = -1;
    var point = 1;
    var point1 = getI(shape);
    while (++part < parts) {
      rawLines[part] = [];
      while (point++ < lens[part]) {
        rawLines[part].push(getI(shape));
      }
      point = 0;
    }
    if (shape.z) {
      point1.push(data.varint());
      point = 1;
      while (++part < parts) {
        while (point < lens[part]) {
          rawLines[part][point].push(data.varint());
          point++;
        }
        point = 0;
      }
    }
    makePoint.reduceBegin(point1);
    rawLines.forEach(function(rawPart) {
      rawPart.forEach(function(rawPoint) {
        makePoint.reduce(rawPoint);
      });
      if (shape.base === 'polygon') {
        makePoint.line.push(makePoint.line[0]);
      }
      lines.push(makePoint.line.map(converter));
      makePoint.line = [];
    });
    var out = {};
    if (shape.base === 'line') {
      if (lines.length === 1) {
        return {
          bbox: bbox,
          type: 'LineString',
          coordinates: lines[0]
        };
      } else if (lines.length > 1) {
        return {
          bbox: bbox,
          type: 'MultiLineString',
          coordinates: lines
        };
      } else {
        return false;
      }
    } else if (shape.base === 'polygon') {
      out.bbox = bbox;
      out.coordinates = lines.reduce(polyReduce, []);
      if (out.coordinates.length === 1) {
        out.type = 'Polygon';
        out.coordinates = out.coordinates[0];
        return out;
      } else {
        out.type = 'MultiPolygon';
        return out;
      }
    }
  };
  var len = data.varuint();
  //console.log('len', len);
  if (!len) {
    return null;
  }
  var expectedOffset = len + data.offset;
  var type = data.varuint();
  var shape;
  if (!type) {
    //console.log(type + ' is not a real type');
    data.offset = expectedOffset;
    return false;
  } else if (types[type]) {
    shape = types[type];
  } else if (!(type & 255)) {
    if (checkIt(cCheck, type)) {
      data.offset = expectedOffset;
      return false;
    }
    shape = {
      base: 'line',
      z: checkIt(zCheck, type),
      m: checkIt(mCheck, type)
    };
  } else {
    data.offset = expectedOffset;
    return false;
  }
  shape = types[type];
  var geometry = typeFuncs(shape);
  data.offset = expectedOffset;
  return geometry;
};
