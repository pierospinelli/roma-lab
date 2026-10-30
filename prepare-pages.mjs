import {cp,mkdir,rm,writeFile,stat} from 'node:fs/promises';
import {join,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=dirname(fileURLToPath(import.meta.url));
const dest=join(root,'public');
await rm(dest,{recursive:true,force:true});
await mkdir(dest,{recursive:true});
const assets=['index.html','css','js/cesium-app.js','js/data.js','js/roads.js','js/road-index.js','js/transit.js','js/names.js','js/health.js','js/municipi.js','js/parks.js','js/monuments.js','js/places.js','assets/monuments','js/districts.geojson','vendor/cesium'];
for(const item of assets){await mkdir(dirname(join(dest,item)),{recursive:true});await cp(join(root,item),join(dest,item),{recursive:true});}
await writeFile(join(dest,'.nojekyll'),'');
const required=['index.html','js/cesium-app.js','js/districts.geojson','vendor/cesium/Cesium.js','vendor/cesium/Workers','vendor/cesium/Assets','vendor/cesium/ThirdParty','vendor/cesium/Widgets/widgets.css'];
for(const file of required){const st=await stat(join(dest,file));if(!st.size&&!st.isDirectory())throw Error('Risorsa vuota: '+file);}
console.log('Roma Lab v0.25 pronta in public/');
