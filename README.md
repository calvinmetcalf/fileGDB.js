fileGDB.js
==========
Implementing [this amazing reverse engineering](https://github.com/rouault/dump_gdbtable/wiki/FGDB-Spec) by [rouault](https://github.com/rouault) in JavaScript

Produces valid geojson with coordinates converted to wgs84.

Ccurrently only works in node
though that's just because I haven’t ran it through browserify.  main function takes two buffers
one for the .table the other for the corresponding  .tablx. 
