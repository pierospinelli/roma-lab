/* Public Roma Capitale GeoServer WFS: DIPAU:nuova_geografia_urbana_localita.
 * Preserve QUARTIERE, RIONE, ZONA FUNZIONALE as equally selectable areas.
 * The October 2026 resolution specifies 334 quartieri, while WFS has 332.
 */
import {readFileSync,writeFileSync} from 'node:fs';
const original=JSON.parse(readFileSync(new URL('./new-geography-source.geojson',import.meta.url),'utf8'));
const all=original.features.filter(f=>['QUARTIERE','RIONE','ZONA FUNZIONALE'].includes(f.properties.tipo_localita));
all.sort((a,b)=>a.properties.cod_localita.localeCompare(b.properties.cod_localita,'it'));
const famous=['EUR','OSTIA','TRASTEVERE','TESTACCIO','PRATI','PARIOLI','FLAMINIO','NOMENTANO','TRIESTE','SAN LORENZO','TUSCOLANO','GARBATELLA','OSTIENSE','SAN PAOLO','MONTEVERDE','MONTE SACRO','CENTOCELLE','PIGNETO','TORPIGNATTARA','PRIMAVALLE','BALDUINA','TALENTI','TOR BELLA MONACA','TIBURTINO','TORRINO','MOSTACCIANO','SPINACETO','CASAL PALOCCO','ACILIA','AXA','INFERNETTO','VITINIA','CASAL BERTONE','TRIONFALE','ESQUILINO','MONTI','CAMPO MARZIO','BORGO','PONTE','PIGNA','COLONNA','PARIONE','REGOLA','CELIO','SAN SABA'];
const features=[],districts=[];
for(const f of all){
  const p=f.properties,id=districts.length,name=p.nome_localita==='EUR'?'EUR':p.nome_localita.toLocaleLowerCase('it').replace(/(^|\s)\S/g,m=>m.toLocaleUpperCase('it'));
  const isRione=p.tipo_localita==='RIONE',isFunctional=p.tipo_localita==='ZONA FUNZIONALE';
  const tier=isFunctional?3:isRione||famous.includes(p.nome_localita)?1:p.area_mq<1000000?2:3;
  const geometry={...f.geometry};
  // GeoServer EPSG:4326 output includes an optional Z which Cesium accepts,
  // and the original MultiPolygon topology is preserved.
  features.push({type:'Feature',id:`district-${id}`,geometry,properties:{roma_id:id,codice:p.cod_localita,nome:p.nome_localita,tipo:p.tipo_localita}});
  districts.push({id,name,code:p.cod_localita,type:isRione?'rione':isFunctional?'zona funzionale':'quartiere',tier,area:p.area_mq,municipio:p.cod_municipio,pointsOfInterest:[]});
}
writeFileSync(new URL('./js/districts.geojson',import.meta.url),JSON.stringify({type:'FeatureCollection',features}));
writeFileSync(new URL('./js/data.js',import.meta.url),'window.ROMA_DATA='+JSON.stringify({districts,source:'Roma Capitale GeoServer DIPAU:nuova_geografia_urbana_localita',actualCount:districts.length,approvedQuartieri:334})+';\n');
const counts=[1,2,3].map(t=>districts.filter(d=>d.tier<=t).length);
console.log('New areas:',districts.length,'functional zones:',districts.filter(d=>d.type==='zona funzionale').length,'cumulative tiers:',counts);
