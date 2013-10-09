module.exports = function(buffer,headers,rowOffsets){
	return {
		type:'FeatureCollection',
		features:rowOffsets.map(function(offset,i){
			if(!offset){
				return null;
			}
			var len = (new DataView(buffer,offset,4)).getUint32(0,true);
			offset += 4;
			var data = new DataView(buffer,offset,len);
			var flags=[];
			if(headers.nullableFields){
				while(headers.nullableFields--){
					flags.push(data.getUint8(offset++,true));
				}
			}
		})
	};
};