fileGDB.js
==========
Implementing [this amazing reverse engineering](https://github.com/rouault/dump_gdbtable/wiki/FGDB-Spec) by [rouault](https://github.com/rouault) in JavaScript

Produces valid geojson with coordinates converted to wgs84.

if you have browserify installed build with `browserify -o bundle.js -s fgdb -e lib/index.js`

todo:
- Figure out how feature names are stored in the database
- zipped files
- Faster
- put it in a web worker or maybe in multiple web workers
- Promises, promises can fit in here somehow

not a high priority:
- Anything projections beyond wgs84 all of the things.
- M coordinates
- MultiPatch, curves or type of feature that doesn't translate to GeoJSON
- Support for browsers that aren’t the two more recent versions
