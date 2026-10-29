import {readFileSync,writeFileSync} from 'node:fs';
const stems=['quartieri','rioni','suburbi','zone'];
const features=[];
for(const stem of stems){
  const data=JSON.parse(readFileSync(new URL(`./${stem}-source.geojson`,import.meta.url)));
  for(const feature of data.features){
    const id=features.length;
    feature.id=`district-${id}`;
    feature.properties={...feature.properties,roma_id:id};
    features.push(feature);
  }
}
writeFileSync(new URL('./js/districts.geojson',import.meta.url),JSON.stringify({type:'FeatureCollection',features}));
console.log('Wrote',features.length,'districts');
