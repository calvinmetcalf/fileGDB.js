var L = require('leaflet');
var m = require('./mapSetup')(L);
var fgdb = require('../lib/index');
var colorbrewer = require('./colorbrewer');
var fileInput = document.getElementById("upload");
var dirInput = document.getElementById("uploadDir");
fileInput.addEventListener("change", function() {
	var file = fileInput.files[0];
	var reader = new FileReader();
		reader.onload = function() {


	  fgdb(reader.result).then(function(layers){
			for(var key in layers){
				lc.addOverlay(L.geoJson(layers[key], option).addTo(m),key);
			}
		});
		};
		reader.readAsArrayBuffer(file);
});
dirInput.addEventListener("change", function() {
        fgdb(dirInput.files).then(function(layers){
                for(var key in layers){
                        lc.addOverlay(L.geoJson(layers[key], option).addTo(m),key);
                }
        });
});
var lc = L.control.layers({},{},{collapsed:false}).addTo(m);
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


function addFunction() {
	var div = L.DomUtil.create('form', 'bgroup');
	div.id = "dropzone";
	var bgroup = L.DomUtil.create('div','btn-group',div);
	var doneButton = L.DomUtil.create('button', "btn  btn-primary span3", bgroup);
	doneButton.type = "button";
	doneButton.innerHTML = "select a zipped .GDB";
	L.DomEvent.addListener(doneButton, "click", function() {
		fileInput.click();
	});
	var dirButton = L.DomUtil.create('button', "btn  btn-primary span3", bgroup);
	dirButton.type = "button";
	dirButton.innerHTML = "upload the files in a .GDB folder";
	L.DomEvent.addListener(dirButton, "click", function() {
		dirInput.click();
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
