fileGDB.js
==========
Implementing [this amazing reverse engineering](https://github.com/rouault/dump_gdbtable/wiki/FGDB-Spec) by [rouault](https://github.com/rouault) in JavaScript

Produces valid geojson with coordinates converted to wgs84.

build with `grunt`, build the site with `grunt site`

all ways of calling it return the same thing, an object with keys being feature class names and values being geojson.

either give it a path, in node to a .gdb folder or in the browser to a zipped .gdb file.

```javascript
var fgdb = require('fgdb');
fgdb('path/to/something.gdb(.zip)').then(function(objectOfGeojson){
	//do something
},function(error){
	//do something else
});
```

in the browser you can also just pass a fileList aka from something like this:

```html
<input id="upload" class="upStuff" type='file' webkitdirectory directory multiple></input>
```

which in chrome they can select a folder, or in other browsers they can select all the files inside the folder.

```javascript
document.getElementById("upload").addEventListener("change", function() {
	fgdb(fileInput.files).then(function(objectOfGeojson){
		//do something
	},function(error){
		//do something else
	});
});
```

Both the browser and node will accept a buffer (node Buffer or ArrayBuffer) for a zipped .gdb, that simply returns the object.

todo:
- ~~Figure out how feature names are stored in the database~~
- ~~zipped files~~
- Faster
- put it in a web worker or maybe in multiple web workers
- ~~Promises, promises can fit in here somehow~~

not a high priority:
- Anything projections beyond wgs84 all of the things.
- M coordinates
- MultiPatch, curves or type of feature that doesn't translate to GeoJSON
- Support for browsers that aren’t the two more recent versions
