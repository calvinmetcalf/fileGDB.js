fileGDB.js
==========
Implementing [this amazing reverse engineering](https://github.com/rouault/dump_gdbtable/wiki/FGDB-Spec) by [rouault](https://github.com/rouault) in JavaScript

Produces valid geojson with coordinates converted to wgs84.

build with `grunt`, build the site with `grunt site`

pass it either 2 buffers one for the .table and the other for the .tablx files OR
in node pass it the path to a file gdb and it will return a promise for an object whose keys are names and the values are geojson ie

```javascript
var fgdb = require('fgdb');
fgdb('path/to/something.gdb').then(function(objectOfGeojson){
	//do something
},function(error){
	//do something else
});
```

in the broser you can do something similar but with the results for a FileList, 
ie with this HTML

```html
<input id="upload" class="upStuff" type='file' webkitdirectory directory multiple></input>
```

then you can have this javascript

```javascript
document.getElementById("upload").addEventListener("change", function() {
	fgdb(fileInput.files).then(function(objectOfGeojson){
		//do something
	},function(error){
		//do something else
	});
});
```

todo:
- ~~Figure out how feature names are stored in the database~~
- zipped files
- Faster
- put it in a web worker or maybe in multiple web workers
- ~~Promises, promises can fit in here somehow~~

not a high priority:
- Anything projections beyond wgs84 all of the things.
- M coordinates
- MultiPatch, curves or type of feature that doesn't translate to GeoJSON
- Support for browsers that aren’t the two more recent versions
