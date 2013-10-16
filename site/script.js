var L = require('leaflet');
var m = require('./mapSetup')(L);
var fgdb = require('../lib/index');
var colorbrewer = require('./colorbrewer');
var files = {};
var num = 0;
var fileInput = document.getElementById("upload");
fileInput.addEventListener("change", function() {
	var rawFiles = fileInput.files;
	var len = rawFiles.length;
	var i = 0;
	while (i < len) {
		if ((fileInput.files[i].name.slice(-9) === ".gdbtable" || fileInput.files[i].name.slice(-9) === ".gdbtablx") && parseInt(fileInput.files[i].name.slice(1, - 9), 16) > 8) {
			handleFile(fileInput.files[i]);
			num++;
		}
		i++;
	}
}, false);

function handleFile(file) {
	var reader = new FileReader();
	reader.onload = function() {
		files[file.name] = reader.result;
		num--;
		if (!num) {
			done();
		}

	};
	reader.readAsArrayBuffer(file);
}
function color(s){
	return colorbrewer.Spectral[11][Math.abs(JSON.stringify(s).split("").reduce(function(a,b){a=((a<<5)-a)+b.charCodeAt(0);return a&a},0)) % 11];
}
var option = {
			onEachFeature: function(feature, layer) {
				if (feature.properties) {
					layer.bindPopup(Object.keys(feature.properties).map(function(k) {
						return k + ": " + feature.properties[k];
					}).join("<br />"), {
						maxHeight: 200
					});
				}
			},
			style:function(f){
				return  {
                opacity: 1,
                fillOpacity: 0.7,
                radius: 6,
                color: color(f)
            };
			}, pointToLayer: function(feature, latlng) {
            return L.circleMarker(latlng, {
                opacity: 1,
                fillOpacity: 0.7,
                color: color(feature)
            });
        }
		};
function done() {
	for (var key in files) {
		if (key.slice(-1) === 'x') {
			continue;
		}
		L.geoJson(fgdb(files[key], files[key.slice(0, - 1) + 'x']), option).addTo(m);
	}
}

function addFunction() {
	var div = L.DomUtil.create('form', 'bgroup');
	div.id = "dropzone";
	var doneButton = L.DomUtil.create('button', "btn  btn-primary span2", div);
	doneButton.type = "button";
	doneButton.innerHTML = "select a .GDB folder";
	L.DomEvent.addListener(doneButton, "click", function() {
		fileInput.click();
	});
	return div;
}
var NewButton = L.Control.extend({ //creating the buttons
	options: {
		position: 'topleft'
	},
	onAdd: addFunction
});
//add them to the map
m.addControl(new NewButton());