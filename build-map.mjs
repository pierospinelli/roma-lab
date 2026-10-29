/* Build-time only: convert local ArcGIS GeoJSON to embedded offline SVG geometry. */
import {readFileSync,writeFileSync} from 'node:fs';
const input=JSON.parse(readFileSync(new URL('./quartieri-source.geojson',import.meta.url),'utf8'));
const rioni=JSON.parse(readFileSync(new URL('./rioni-source.geojson',import.meta.url),'utf8'));
const suburbi=JSON.parse(readFileSync(new URL('./suburbi-source.geojson',import.meta.url),'utf8'));
const zone=JSON.parse(readFileSync(new URL('./zone-source.geojson',import.meta.url),'utf8'));
const features=[...input.features,...rioni.features,...suburbi.features,...zone.features];
const common=new Set(['Flaminio','Parioli','Trieste','Nomentano','Tiburtino','Pinciano','Salario','Ostiense','Portuense','Aurelio','Trionfale','Della Vittoria','Appio Latino','Tuscolano','Gianicolense','Monte Sacro','Europa','Monte Sacro Alto','Primavalle','Collatino','Pietralata','Testaccio','Trastevere','Prati','Monti','Esquilino','Borgo','Trevi','Campo Marzio','Celio','San Saba','Castro Pretorio','Ripa','Ponte','Parione','Regola','Colonna','Pigna','Campitelli','San Lorenzo']);
const merc=([lon,lat])=>[lon*111320*Math.cos(41.88*Math.PI/180),lat*111320];
const rings=features.flatMap(f=>f.geometry.coordinates).map(r=>r.map(merc));
const bounds=[Infinity,Infinity,-Infinity,-Infinity];
for(const ring of rings)for(const [x,y] of ring){bounds[0]=Math.min(bounds[0],x);bounds[1]=Math.min(bounds[1],y);bounds[2]=Math.max(bounds[2],x);bounds[3]=Math.max(bounds[3],y);}
const width=1020,height=740,margin=25,scale=Math.min((width-2*margin)/(bounds[2]-bounds[0]),(height-2*margin)/(bounds[3]-bounds[1]));
const dx=(width-(bounds[2]-bounds[0])*scale)/2,dy=(height-(bounds[3]-bounds[1])*scale)/2;
const project=p=>[+(dx+(p[0]-bounds[0])*scale).toFixed(2),+(height-dy-(p[1]-bounds[1])*scale).toFixed(2)];
/* Approximate Tevere centreline anchor points, WGS84, north to the Tyrrhenian coast.
   Illustrative only: replace with an authoritative river geometry when available. */
const tevereAnchors=[
  [12.507,42.065],[12.500,42.043],[12.500,42.020],[12.503,41.998],
  [12.500,41.981],[12.491,41.966],[12.482,41.953],[12.478,41.944],
  [12.471,41.938],[12.463,41.933],[12.461,41.925],[12.470,41.920],
  [12.474,41.911],[12.467,41.904],[12.468,41.895],[12.479,41.889],
  [12.482,41.879],[12.478,41.870],[12.472,41.861],[12.467,41.849],
  [12.463,41.839],[12.455,41.828],[12.451,41.815],[12.438,41.801],
  [12.421,41.790],[12.410,41.780],[12.385,41.776],[12.369,41.764],
  [12.348,41.754],[12.326,41.742],[12.304,41.732],[12.281,41.724],
  [12.257,41.722]
];
const tevere=tevereAnchors.map(p=>project(merc(p)));
const perpendicular=(p,a,b)=>{const vx=b[0]-a[0],vy=b[1]-a[1],den=vx*vx+vy*vy||1,t=Math.max(0,Math.min(1,((p[0]-a[0])*vx+(p[1]-a[1])*vy)/den));return Math.hypot(p[0]-a[0]-t*vx,p[1]-a[1]-t*vy);};
function simplify(points,eps=.5){if(points.length<4)return points;let max=0,index=0;for(let i=1;i<points.length-1;i++){const d=perpendicular(points[i],points[0],points.at(-1));if(d>max){max=d;index=i;}}if(max<=eps)return [points[0],points.at(-1)];return [...simplify(points.slice(0,index+1),eps).slice(0,-1),...simplify(points.slice(index),eps)];}
const inside=(pt,ring)=>{let inside=false;for(let i=0,j=ring.length-1;i<ring.length;j=i++){const a=ring[i],b=ring[j];if(((a[1]>pt[1])!==(b[1]>pt[1]))&&(pt[0]<(b[0]-a[0])*(pt[1]-a[1])/(b[1]-a[1])+a[0]))inside=!inside;}return inside;};
const districts=features.map((f,id)=>{const all=f.geometry.coordinates.map(r=>r.map(p=>project(merc(p))));const ring=all[0],xx=ring.map(p=>p[0]),yy=ring.map(p=>p[1]),bbox=[Math.min(...xx),Math.min(...yy),Math.max(...xx),Math.max(...yy)];let area=0,cx=0,cy=0;for(let i=0;i<ring.length-1;i++){const p=ring[i],q=ring[i+1],cross=p[0]*q[1]-q[0]*p[1];area+=cross;cx+=(p[0]+q[0])*cross;cy+=(p[1]+q[1])*cross;}let center=Math.abs(area)>1e-7?[cx/(3*area),cy/(3*area)]:[(bbox[0]+bbox[2])/2,(bbox[1]+bbox[3])/2];if(!inside(center,ring))center=[(bbox[0]+bbox[2])/2,(bbox[1]+bbox[3])/2];if(!inside(center,ring))center=ring[Math.floor(ring.length/3)];const paths=all.map(r=>{const s=simplify(r,.43);return 'M'+s.map(p=>p.join(',')).join('L')+'Z';}).join('');const type=id<input.features.length?'quartiere':id<input.features.length+rioni.features.length?'rione':id<input.features.length+rioni.features.length+suburbi.features.length?'suburbio':'zona';const key=type==='quartiere'?'NOME_QUART':type==='rione'?'NOME_RIONE':type==='suburbio'?'NOME_SUBUR':'NOME_ZONA',codekey=type==='quartiere'?'NUMERO_QUA':type==='rione'?'NUMERO_RIO':type==='suburbio'?'NUMERO_SUB':'NUMERO_ZON';const name=f.properties[key].toLocaleLowerCase('it').replace(/(^|\s)\S/g,m=>m.toLocaleUpperCase('it')).replace(/^S\. /,'San ');return {id,name,code:f.properties[codekey],type,tier:common.has(name)&&['rione','quartiere'].includes(type)?1:['rione','quartiere','suburbio'].includes(type)?2:3,cx:+center[0].toFixed(1),cy:+center[1].toFixed(1),bbox:bbox.map(v=>+v.toFixed(1)),path:paths};});
/* Each district links to its 2 closest districts; ensure entire graph is connected. These are didactic links, NOT road alignments. */
const distance=(a,b)=>Math.hypot(a.cx-b.cx,a.cy-b.cy),edges=new Map();const add=(a,b)=>{if(a===b)return;const key=[a,b].sort((x,y)=>x-y).join('-');edges.set(key,{a:Math.min(a,b),b:Math.max(a,b),name:'Collegamento '+districts[a].name+' – '+districts[b].name});};
districts.forEach(a=>districts.filter(b=>a!==b).sort((x,y)=>distance(a,x)-distance(a,y)).slice(0,2).forEach(b=>add(a.id,b.id)));
const parent=districts.map(d=>d.id),root=i=>parent[i]===i?i:(parent[i]=root(parent[i]));function merge(a,b){parent[root(a)]=root(b);}edges.forEach(e=>merge(e.a,e.b));while(new Set(parent.map((_,i)=>root(i))).size>1){let best=null;for(const a of districts)for(const b of districts){if(root(a.id)===root(b.id))continue;const dist=distance(a,b);if(!best||dist<best.dist)best={a:a.id,b:b.id,dist};}add(best.a,best.b);merge(best.a,best.b);}
const output='/* Generated from Roma Capitale ArcGIS layers; Tevere polyline illustrative and approximate. Offline. */\nwindow.ROMA_DATA='+JSON.stringify({districts,roads:[...edges.values()],tevere,source:'Perimetrazioni_Comune_di_Roma — ArcGIS FeatureServer/1,2,3,4'})+';\n';
writeFileSync(new URL('./js/data.js',import.meta.url),output);
console.log('Generated',districts.length,'toponymic areas,',edges.size,'didactic connections,',output.length,'bytes');
