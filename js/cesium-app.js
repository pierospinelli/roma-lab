(()=>{'use strict';
const C=Cesium,$=id=>document.getElementById(id),districts=ROMA_DATA.districts,roads=ROMA_ROADS;
const colors={base:'#b8d9d1',functional:'#d7c6e8',inactive:'#e4e9e9',yellow:'#f1d36b',green:'#70c99b',red:'#df8e8c'};
const modes={learnQuartieri:['Quartieri','Esplora i confini reali. Clicca su un quartiere per identificarlo.'],learnSpostamenti:['Learn spostamenti','Esplora le strade reali e i nomi delle arterie maggiori.'],testDove:['Test quartieri · dove','Clicca sul quartiere richiesto.'],testNomi:['Test quartieri · nomi','Identifica il quartiere evidenziato in giallo.'],testMovimenti:['Test movimenti','Raggiungi il quartiere di arrivo scegliendo i collegamenti stradali verificati.']};
let mode='learnQuartieri',level=1,target=null,start=null,end=null,selected=null,wrong=null,steps=[],chosenRoads=[],done=false,correct=0,attempts=0,bag=[],last=null,started=false,lastMoveCorrect=false;
const entities=new Map(),labels=new Map(),roadLabels=[];let roadPrimitives,routeEntities=[],popupId=null;
const roadById=new Map(roads.segments.map(s=>[s.id,s]));
const streetGroups=window.ROMA_ROAD_INDEX||[];
const groupBySegment=new Map(streetGroups.flatMap(g=>g.segments.map(id=>[id,g])));
let roadHighlight=[];
let healthPoints=null,healthLabels=null;const healthEntries=[];
let municipiPoints=null,municipiLabels=null;const municipiEntries=[];
// Optional map overlays are independent of the exercise mode.
const overlayState={roads:false,metro:false,metroStations:false,railStations:false,municipi:false,places:false,parks:false,health:false};
document.querySelector('[data-mode="testMovimenti"]')?.remove();
document.querySelector('[data-mode="learnSpostamenti"]')?.remove();
document.querySelector('[data-mode="learnQuartieri"]').textContent='01　Quartieri';
document.querySelector('[data-mode="testDove"]').textContent='02　Test quartieri · dove';
document.querySelector('[data-mode="testNomi"]').textContent='03　Test quartieri · nomi';
const layerPanel=document.createElement('section');layerPanel.className='layerPanel';layerPanel.hidden=true;
layerPanel.innerHTML='<h3>Layer della mappa</h3><p>Attiva le informazioni da sovrapporre ai quartieri.</p>';
const layerToggle=document.createElement('button');layerToggle.className='layerToggle';layerToggle.type='button';layerToggle.textContent='☷  Layer';layerToggle.setAttribute('aria-expanded','false');layerToggle.setAttribute('aria-label','Mostra o nascondi i layer opzionali');
const areaPicker=document.createElement('select');areaPicker.className='areaPicker';areaPicker.setAttribute('aria-label','Seleziona un quartiere o una zona');areaPicker.add(new Option('Vai a un quartiere o zona…',''));
const mapHeaderControls=document.createElement('div');mapHeaderControls.className='mapHeaderControls';mapHeaderControls.append(areaPicker,layerToggle);
function addOverlayOption(key,label,available){const row=document.createElement('label');row.className='layerOption';const input=document.createElement('input');input.type='checkbox';input.checked=overlayState[key];input.disabled=!available;input.onchange=()=>{overlayState[key]=input.checked;refresh();};const title=document.createElement('span');title.textContent=label;row.append(input,title);if(!available){const note=document.createElement('small');note.textContent='Dati in preparazione';row.append(note);}layerPanel.append(row);return input;}
const roadsCheckbox=addOverlayOption('roads','Strade principali',true);
addOverlayOption('metro','Tracciati Metro A, B/B1, C',true);
addOverlayOption('metroStations','Stazioni Metro',true);
addOverlayOption('railStations','Stazioni ferroviarie',true);
addOverlayOption('municipi','Sedi dei municipi',true);
addOverlayOption('places','Luoghi da visitare',false);
addOverlayOption('health','Ospedali, cliniche e centri di cura',true);
addOverlayOption('parks','Parchi e giardini',false);
layerToggle.onclick=()=>{layerPanel.hidden=!layerPanel.hidden;layerToggle.setAttribute('aria-expanded',String(!layerPanel.hidden));};
const mapPanel=document.querySelector('.mapPanel');mapPanel.style.position='relative';mapPanel.append(mapHeaderControls,layerPanel);
const viewer=new C.Viewer('map',{sceneMode:C.SceneMode.SCENE2D,baseLayer:false,terrainProvider:new C.EllipsoidTerrainProvider(),animation:false,timeline:false,geocoder:false,homeButton:false,baseLayerPicker:false,sceneModePicker:false,navigationHelpButton:false,fullscreenButton:false,selectionIndicator:false,infoBox:false,requestRenderMode:true,maximumRenderTimeChange:Infinity});
viewer.scene.backgroundColor=C.Color.fromCssColorString('#ecf4f5');viewer.scene.globe.baseColor=C.Color.fromCssColorString('#ecf4f5');
viewer.scene.screenSpaceCameraController.minimumZoomDistance=350;viewer.scene.screenSpaceCameraController.maximumZoomDistance=185000;viewer.scene.screenSpaceCameraController.enableTilt=false;
const region=C.Rectangle.fromDegrees(11.35,40.9,13.95,42.85),views={all:C.Rectangle.fromDegrees(12.18,41.62,12.87,42.12),city:C.Rectangle.fromDegrees(12.31,41.77,12.66,42.02),center:C.Rectangle.fromDegrees(12.43,41.86,12.53,41.93)};
const fly=r=>viewer.camera.flyTo({destination:r,duration:.6}),height=()=>viewer.camera.positionCartographic?.height||80000;
const active=()=>districts.filter(d=>d.tier<=level),eligible=id=>districts[id]?.tier<=level;
const nameInfo=d=>ROMA_NAMES?.[d.name]||{};
const commonName=d=>nameInfo(d).comune||d.name;
const officialName=d=>d.name;
const variants=d=>[...new Set([commonName(d),officialName(d),...(nameInfo(d).alias||[])])];
const randomName=d=>{const v=variants(d);return v[Math.floor(Math.random()*v.length)];};
const display=d=>commonName(d)===officialName(d)?commonName(d):`${commonName(d)} (${officialName(d)})`;
for(const d of [...districts].sort((a,b)=>commonName(a).localeCompare(commonName(b),'it'))){areaPicker.add(new Option(`${display(d)} · ${d.type}`,String(d.id)));}
const popupBox=document.createElement('section');popupBox.className='areaPopup';popupBox.hidden=true;popupBox.setAttribute('role','dialog');popupBox.setAttribute('aria-label','Informazioni sul territorio');$('map').append(popupBox);
let popupCoords=null;
const addLine=(container,label,value)=>{const row=document.createElement('div');row.className='popupRow';const k=document.createElement('span');k.textContent=label;const v=document.createElement('strong');v.textContent=value;row.append(k,v);container.append(row);};
function hidePopup(){popupId=null;popupCoords=null;popupBox.hidden=true;popupBox.replaceChildren();clearRoadHighlight();}
function clearRoadHighlight(){for(const entity of roadHighlight)viewer.entities.remove(entity);roadHighlight=[];viewer.scene.requestRender();}
function showPopup(id){
  const d=districts[id];if(!d?.geoCenter)return;popupId=id;popupCoords=d.geoCenter;popupBox.replaceChildren();popupBox.hidden=false;
  const top=document.createElement('div');top.className='popupHead';const title=document.createElement('h3');title.textContent=commonName(d);
  const close=document.createElement('button');close.type='button';close.className='popupClose';close.textContent='×';close.setAttribute('aria-label','Chiudi informazioni');close.onclick=hidePopup;top.append(title,close);popupBox.append(top);
  const type=document.createElement('div');type.className='popupType';type.textContent=d.type.toLocaleUpperCase('it');popupBox.append(type);
  addLine(popupBox,'Nome ufficiale',officialName(d));
  const aliases=variants(d).filter(n=>n!==commonName(d)&&n!==officialName(d));
  if(aliases.length)addLine(popupBox,'Altri nomi',aliases.join(' · '));
  addLine(popupBox,'Municipio',d.municipio?`Roma ${d.municipio}`:'Non specificato');
  addLine(popupBox,'Codice',d.code||'—');
  if(Number.isFinite(d.area))addLine(popupBox,'Superficie',`${(d.area/1000000).toLocaleString('it-IT',{maximumFractionDigits:2})} km²`);
  if(d.pointsOfInterest?.length){const places=document.createElement('div');places.className='popupPlaces';places.textContent=d.pointsOfInterest.map(p=>p.name).join(' · ');popupBox.append(places);}
  positionPopup();
}
function showRoadPopup(group,clickedPosition){
  hidePopup();
  popupCoords=clickedPosition;
  popupBox.replaceChildren();popupBox.hidden=false;
  const top=document.createElement('div');top.className='popupHead';
  const title=document.createElement('h3');title.textContent=group.name;
  const close=document.createElement('button');close.type='button';close.className='popupClose';close.textContent='×';close.setAttribute('aria-label','Chiudi scheda stradale');close.onclick=hidePopup;
  top.append(title,close);popupBox.append(top);
  const kind=document.createElement('div');kind.className='popupType';kind.textContent='STRADA · OPENSTREETMAP';popupBox.append(kind);
  addLine(popupBox,'Lunghezza rilevata',group.lengthKm.toLocaleString('it-IT',{maximumFractionDigits:2})+' km');
  addLine(popupBox,'Tratti OSM',String(group.segments.length));
  const heading=document.createElement('h4');heading.className='roadDistrictHeading';heading.textContent=`Territori attraversati (${group.districtIds.length})`;popupBox.append(heading);
  const list=document.createElement('div');list.className='roadDistrictList';
  for(const id of group.districtIds){const d=districts[id];if(!d)continue;const button=document.createElement('button');button.type='button';button.textContent=display(d);button.title='Centra la mappa su '+commonName(d);button.onclick=()=>{if(level<d.tier){level=d.tier;$('level').value=String(level);$('levelCount').textContent=`${active().length} aree nei test su ${districts.length}`;}change('learnQuartieri');selected=id;areaPicker.value=String(id);refresh();showPopup(id);zoomToDistrict(id);};list.append(button);}
  if(!list.childElementCount){const empty=document.createElement('p');empty.textContent='Nessuna intersezione significativa con i territori censiti.';list.append(empty);}
  popupBox.append(list);
  const foot=document.createElement('p');foot.className='roadPopupNote';foot.textContent='Lunghezza dei segmenti OSM disponibili, non necessariamente dell’intera arteria; carreggiate parallele possono essere conteggiate separatamente.';popupBox.append(foot);
  for(const sid of group.segments){const seg=roadById.get(sid);if(!seg)continue;for(const coords of seg.coords){if(coords.length<2)continue;roadHighlight.push(viewer.entities.add({polyline:{positions:C.Cartesian3.fromDegreesArray(coords.flat()),width:6,material:C.Color.fromCssColorString('#ef942c'),clampToGround:false}}));}}
  viewer.scene.requestRender();positionPopup();
}
function positionPopup(){
  if(!popupCoords||popupBox.hidden)return;
  const coords=popupCoords,p=C.SceneTransforms.worldToWindowCoordinates(viewer.scene,C.Cartesian3.fromDegrees(...coords));
  if(!p)return;
  const bounds=$('map').getBoundingClientRect(),width=popupBox.offsetWidth||260,height=popupBox.offsetHeight||220;
  let x=p.x+18,y=p.y-height/2;
  if(x+width>bounds.width-8)x=p.x-width-18;
  popupBox.style.left=`${Math.max(8,Math.min(bounds.width-width-8,x))}px`;
  popupBox.style.top=`${Math.max(8,Math.min(bounds.height-height-8,y))}px`;
}
viewer.scene.postRender.addEventListener(positionPopup);
function feedback(msg,ok){$('feedback').textContent=msg;$('feedback').className=ok===undefined?'':ok?'good':'bad';}
function score(ok){attempts++;if(ok)correct++;$('correct').textContent=correct;$('attempts').textContent=attempts;}
function prompt(title,hint){const e=document.createElement('div');e.className='prompt';e.textContent=title;const s=document.createElement('small');s.textContent=hint;e.append(s);$('question').append(e);}
function random(){if(!bag.length){bag=active().map(d=>d.id);for(let i=bag.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[bag[i],bag[j]]=[bag[j],bag[i]];}}if(bag.length>1&&bag.at(-1)===last)[bag[0],bag[bag.length-1]]=[bag.at(-1),bag[0]];return last=bag.pop();}
const links=()=>roads.links.filter(r=>eligible(r.a)&&eligible(r.b));
const neighbors=id=>links().filter(r=>r.a===id||r.b===id).map(r=>({id:r.a===id?r.b:r.a,road:r}));
function reachable(from){const found=new Map([[from,0]]),queue=[from];for(let i=0;i<queue.length;i++)for(const n of neighbors(queue[i]))if(!found.has(n.id)){found.set(n.id,found.get(queue[i])+1);queue.push(n.id);}return [...found].filter(([id])=>id!==from);}
function newQuestion(){if(!started)return;hidePopup();target=start=end=selected=wrong=null;steps=[];chosenRoads=[];done=false;feedback('');$('question').replaceChildren();$('next').hidden=mode.startsWith('learn');$('restart').hidden=mode!=='testMovimenti';
if(mode==='testDove'){target=random();prompt(`Dove si trova ${randomName(districts[target])}?`,'Clicca sul perimetro corretto.');}
if(mode==='testNomi'){target=random();prompt('Qual è il nome dell’area in giallo?','Seleziona il nome e verifica.');const select=document.createElement('select');select.id='answer';select.add(new Option('Seleziona un quartiere…',''));active().sort((a,b)=>commonName(a).localeCompare(commonName(b),'it')).forEach(d=>select.add(new Option(randomName(d),d.id)));$('question').append(select);const b=document.createElement('button');b.className='verify';b.textContent='Verifica risposta';b.onclick=()=>{if(select.value&&!done)answer(+select.value);};$('question').append(b);}
if(mode==='testMovimenti'){const candidates=active().map(d=>({id:d.id,r:reachable(d.id)})).filter(c=>c.r.length);if(!candidates.length)prompt('Collegamenti insufficienti','Non ci sono percorsi OSM verificati a questo livello.');else{const c=candidates[Math.floor(Math.random()*candidates.length)];start=c.id;const farther=c.r.filter(([,h])=>h>=2),pool=farther.length?farther:c.r;end=pool[Math.floor(Math.random()*pool.length)][0];steps=[start];prompt(`Da ${randomName(districts[start])} a ${randomName(districts[end])}`,'Scegli una strada OSM che attraversa entrambi i quartieri.');moves();}}
refresh();}
function answer(id){if(done)return;done=true;const ok=id===target;wrong=ok?null:id;selected=target;score(ok);feedback(ok?`Corretto: ${display(districts[target])}!`:`Errato: era ${display(districts[target])}.`,ok);if($('answer'))$('answer').disabled=true;refresh();showPopup(target);}
function moves(){const q=$('question');q.querySelectorAll('.trail,.moves').forEach(n=>n.remove());const t=document.createElement('div');t.className='trail';t.textContent='Percorso: '+steps.map(id=>display(districts[id])).join(' → ');q.append(t);const list=document.createElement('div');list.className='moves';if(steps.length>1){const back=document.createElement('button');back.className='move moveBack';back.textContent='← Torna al passo precedente';back.onclick=undoMove;list.append(back);}if(!done)for(const n of neighbors(steps.at(-1))){const b=document.createElement('button');b.className='move';b.textContent=`${n.road.name} → ${commonName(districts[n.id])}`;b.onclick=()=>move(n.id,n.road);list.append(b);}q.append(list);}
function undoMove(){if(steps.length<=1)return;const wasDone=done;steps.pop();chosenRoads.pop();done=false;if(wasDone){attempts=Math.max(0,attempts-1);$('attempts').textContent=attempts;if(lastMoveCorrect){correct=Math.max(0,correct-1);$('correct').textContent=correct;}}feedback(`Tornato a ${display(districts[steps.at(-1)])}.`);moves();refresh();}
function move(id,road){if(done)return;steps.push(id);chosenRoads.push(road);if(id===end){done=true;lastMoveCorrect=new Set(steps).size===steps.length;score(lastMoveCorrect);feedback(lastMoveCorrect?`Arrivato a ${display(districts[end])}! Percorso valido.`:`Arrivato a ${display(districts[end])}, ma hai ripassato un quartiere.`,lastMoveCorrect);}else if(steps.length>35){done=true;lastMoveCorrect=false;score(false);feedback('Troppi passaggi.',false);}else feedback(`Via ${road.name} → ${display(districts[id])}`);moves();refresh();}
function clicked(id){if(!eligible(id))return;if(mode==='testDove')answer(id);else if(mode.startsWith('learn')){selected=id;areaPicker.value=String(id);feedback(`${display(districts[id])} · ${districts[id].code}`);refresh();showPopup(id);}}
function zoomToDistrict(id){const polygons=entities.get(id);if(!polygons?.length)return;let west=Infinity,south=Infinity,east=-Infinity,north=-Infinity;for(const entity of polygons){const positions=entity.polygon.hierarchy.getValue(C.JulianDate.now()).positions;for(const p of positions){const coord=C.Cartographic.fromCartesian(p),lon=C.Math.toDegrees(coord.longitude),lat=C.Math.toDegrees(coord.latitude);west=Math.min(west,lon);east=Math.max(east,lon);south=Math.min(south,lat);north=Math.max(north,lat);}}if(!Number.isFinite(west))return;const dx=Math.max(.008,(east-west)*.20),dy=Math.max(.006,(north-south)*.20);fly(C.Rectangle.fromDegrees(west-dx,south-dy,east+dx,north+dy));}
areaPicker.onchange=()=>{if(!areaPicker.value||!started)return;const id=Number(areaPicker.value),d=districts[id];if(!d)return;if(level<d.tier){level=d.tier;$('level').value=String(level);$('levelCount').textContent=`${active().length} aree nei test su ${districts.length}`;}if(mode!=='learnQuartieri')change('learnQuartieri');selected=id;areaPicker.value=String(id);feedback(`${display(d)} · ${d.code}`);refresh();showPopup(id);zoomToDistrict(id);};
function change(next){mode=next;areaPicker.value='';document.querySelectorAll('[data-mode]').forEach(b=>b.classList.toggle('active',b.dataset.mode===mode));$('title').textContent=modes[mode][0];$('instructions').textContent=modes[mode][1];$('legend').textContent='Verde salvia: quartieri e rioni · Lilla: aree funzionali · Giallo: selezione · Azzurro: Tevere';newQuestion();}
function refresh(){const study=mode.startsWith('learn'),h=height();for(const [id,items] of entities){let color=eligible(id)?(districts[id].type==='zona funzionale'?colors.functional:colors.base):colors.inactive;if(mode==='testNomi'&&!done&&id===target||mode==='testMovimenti'&&(id===start||id===end)||study&&id===selected)color=colors.yellow;if(done&&id===target&&mode!=='testMovimenti')color=colors.green;if(id===wrong)color=colors.red;for(const e of items)e.polygon.material=C.Color.fromCssColorString(color).withAlpha(eligible(id)?.78:.43);}
refreshDistrictLabels(study,h);
const showRoads=overlayState.roads;if(roadPrimitives)roadPrimitives.show=showRoads;if(!showRoads&&!popupBox.hidden&&roadHighlight.length)hidePopup();refreshRoadLabels(showRoads,h);refreshTransit(h);refreshHealth(h);refreshMunicipi(h);
for(const entity of routeEntities)viewer.entities.remove(entity);routeEntities=[];
if(mode==='testMovimenti'&&chosenRoads.length){const routeColor=C.Color.fromCssColorString(done&&lastMoveCorrect?'#1ca46b':'#ee8b32');for(const link of chosenRoads){const segment=roadById.get(link.segment);if(!segment)continue;for(const coords of segment.coords){if(coords.length<2)continue;routeEntities.push(viewer.entities.add({polyline:{positions:C.Cartesian3.fromDegreesArray(coords.flat()),width:7,material:routeColor}}));}}}viewer.scene.requestRender();}
function wrapDistrictName(name){const words=name.trim().split(/\s+/);if(words.length<2)return name;let lines=[''];for(const word of words){const current=lines.at(-1);if(current&&(current.length+word.length+1>16)&&lines.length<3)lines.push(word);else lines[lines.length-1]=current?`${current} ${word}`:word;}return lines.join('\n');}
function polygonCentroid(positions){const points=positions.map(p=>C.Cartographic.fromCartesian(p)).map(p=>[C.Math.toDegrees(p.longitude),C.Math.toDegrees(p.latitude)]);let twiceArea=0,sx=0,sy=0;for(let i=0;i<points.length;i++){const [x1,y1]=points[i],[x2,y2]=points[(i+1)%points.length],cross=x1*y2-x2*y1;twiceArea+=cross;sx+=(x1+x2)*cross;sy+=(y1+y2)*cross;}if(Math.abs(twiceArea)<1e-9)return null;return {center:[sx/(3*twiceArea),sy/(3*twiceArea)],weight:Math.abs(twiceArea)};}
function recenterDistricts(){for(const [id,polygons] of entities){let lon=0,lat=0,weight=0;for(const entity of polygons){const hierarchy=entity.polygon.hierarchy.getValue(C.JulianDate.now()),result=polygonCentroid(hierarchy.positions);if(!result)continue;lon+=result.center[0]*result.weight;lat+=result.center[1]*result.weight;weight+=result.weight;}if(weight>0)districts[id].geoCenter=[lon/weight,lat/weight];}}
function makeLabels(){const lc=viewer.scene.primitives.add(new C.LabelCollection());for(const d of districts){if(!d.geoCenter)continue;labels.set(d.id,lc.add({position:C.Cartesian3.fromDegrees(...d.geoCenter),text:wrapDistrictName(commonName(d)),font:'700 13px Segoe UI, Arial',fillColor:C.Color.fromCssColorString('#284a57'),outlineColor:C.Color.WHITE,outlineWidth:3,style:C.LabelStyle.FILL_AND_OUTLINE,horizontalOrigin:C.HorizontalOrigin.CENTER,verticalOrigin:C.VerticalOrigin.CENTER,disableDepthTestDistance:Number.POSITIVE_INFINITY}));}}
// Keep every area selectable and avoid overlapping labels in the historic centre.
function refreshDistrictLabels(study,h){
  const occupied=[],canvas=viewer.canvas;
  const size=h<16000?10:h<35000?11:13;
  const candidates=[];
  for(const [id,label] of labels){label.show=false;label.font=`700 ${size}px Segoe UI, Arial`;if(eligible(id)&&(study||done&&id===target))candidates.push({label,priority:id===selected||id===target?0:1});}
  candidates.sort((a,b)=>a.priority-b.priority);
  const limit=h<12000?260:h<35000?170:105;
  for(const {label,priority} of candidates){
    if(occupied.length>=limit)break;
    const p=C.SceneTransforms.worldToWindowCoordinates(viewer.scene,label.position);
    if(!p||p.x<0||p.y<0||p.x>canvas.clientWidth||p.y>canvas.clientHeight)continue;
    const lines=label.text.split('\n');const halfWidth=Math.max(20,Math.min(120,Math.max(...lines.map(line=>line.length))*size*.28+7));
    const halfHeight=lines.length*size*.65+3;const box={left:p.x-halfWidth-3,right:p.x+halfWidth+3,top:p.y-halfHeight,bottom:p.y+halfHeight};
    if(occupied.some(o=>box.left<o.right&&box.right>o.left&&box.top<o.bottom&&box.bottom>o.top))continue;
    label.show=true;occupied.push(box);
  }
}
// Avoid overlapping labels in screen space. At the closest scale, hide road names entirely;
// at other scales, prioritize motorway/trunk/primary and enforce a generous exclusion box.
function refreshRoadLabels(enabled,h){
  for(const x of roadLabels)x.label.show=false;
  if(!enabled||h<4500||h>=65000)return;
  const maxPriority=h<16000?2:h<35000?2:1;
  const limit=h<16000?75:h<35000?55:28;
  const occupied=[];let count=0;
  for(const x of [...roadLabels].sort((a,b)=>a.priority-b.priority)){
    if(x.priority>maxPriority)continue;
    const p=C.SceneTransforms.worldToWindowCoordinates(viewer.scene,x.label.position);
    if(!p||p.x<0||p.y<0||p.x>viewer.canvas.clientWidth||p.y>viewer.canvas.clientHeight)continue;
    const halfWidth=Math.min(145,Math.max(35,x.label.text.length*3.5+15));
    const box={left:p.x-halfWidth,right:p.x+halfWidth,top:p.y-13,bottom:p.y+13};
    if(occupied.some(o=>box.left<o.right&&box.right>o.left&&box.top<o.bottom&&box.bottom>o.top))continue;
    x.label.show=true;occupied.push(box);if(++count>=limit)break;
  }
}
let metroTracks=null,metroPoints=null,railPoints=null,transitLabels=null;
const metroColors={'Metro A':'#e05252','Metro B':'#3775c7','Metro B1':'#3775c7','Metro C':'#35a96d'};
const stationItems=[];
function makeTransit(){
  const data=window.ROMA_TRANSIT;if(!data)return;
  metroTracks=viewer.scene.primitives.add(new C.PolylineCollection());
  metroPoints=viewer.scene.primitives.add(new C.PointPrimitiveCollection());
  railPoints=viewer.scene.primitives.add(new C.PointPrimitiveCollection());
  transitLabels=viewer.scene.primitives.add(new C.LabelCollection());
  for(const track of data.tracks){if(track.coords.length<2)continue;const color=C.Color.fromCssColorString(metroColors[track.name]||'#7c6790');metroTracks.add({positions:C.Cartesian3.fromDegreesArray(track.coords.flat()),width:4,material:C.Material.fromType('Color',{color})});}
  for(const station of data.stations){const position=C.Cartesian3.fromDegrees(...station.coords),isMetro=station.kind==='metro';const color=C.Color.fromCssColorString(isMetro?'#d6573f':'#384e75');
    const point=(isMetro?metroPoints:railPoints).add({position,color,pixelSize:isMetro?8:9,outlineColor:C.Color.WHITE,outlineWidth:2,id:{romaTransitStation:station}});
    const label=transitLabels.add({position,text:station.name,font:'600 11px Segoe UI, Arial',fillColor:color,outlineColor:C.Color.WHITE,outlineWidth:3,style:C.LabelStyle.FILL_AND_OUTLINE,pixelOffset:new C.Cartesian2(0,-14),show:false,disableDepthTestDistance:Number.POSITIVE_INFINITY});
    stationItems.push({station,point,label});
  }
}
function refreshTransit(h){
  if(metroTracks)metroTracks.show=overlayState.metro;
  if(metroPoints)metroPoints.show=overlayState.metroStations;
  if(railPoints)railPoints.show=overlayState.railStations;
  const occupied=[];let labeled=0;
  for(const item of stationItems){item.label.show=false;const enabled=item.station.kind==='metro'?overlayState.metroStations:overlayState.railStations;if(!enabled||h>25000||labeled>=90)continue;
    const p=C.SceneTransforms.worldToWindowCoordinates(viewer.scene,item.label.position);if(!p||p.x<0||p.y<0||p.x>viewer.canvas.clientWidth||p.y>viewer.canvas.clientHeight)continue;
    const half=Math.min(100,Math.max(27,item.station.name.length*3.2+8));const box={left:p.x-half,right:p.x+half,top:p.y-27,bottom:p.y-7};
    if(occupied.some(o=>box.left<o.right&&box.right>o.left&&box.top<o.bottom&&box.bottom>o.top))continue;
    item.label.show=true;occupied.push(box);labeled++;
  }
}
function showTransitPopup(station){hidePopup();popupCoords=station.coords;popupBox.hidden=false;const top=document.createElement('div');top.className='popupHead';const title=document.createElement('h3');title.textContent=station.name;const close=document.createElement('button');close.className='popupClose';close.textContent='×';close.setAttribute('aria-label','Chiudi informazioni');close.onclick=hidePopup;top.append(title,close);popupBox.append(top);addLine(popupBox,'Categoria',station.kind==='metro'?'Stazione Metro':'Stazione ferroviaria');if(station.line)addLine(popupBox,'Linea',station.line);addLine(popupBox,'Fonte','OpenStreetMap');positionPopup();}
function makeHealth(){
  const facilities=window.ROMA_HEALTH||[];
  healthPoints=viewer.scene.primitives.add(new C.PointPrimitiveCollection());
  healthLabels=viewer.scene.primitives.add(new C.LabelCollection());
  for(const item of facilities){
    const position=C.Cartesian3.fromDegrees(...item.coords),hospital=item.kind==='ospedale';
    healthPoints.add({position,pixelSize:hospital?12:10,color:C.Color.fromCssColorString(hospital?'#da3951':'#8a47ad'),outlineColor:C.Color.WHITE,outlineWidth:2,id:{romaHealthId:item.id},disableDepthTestDistance:Number.POSITIVE_INFINITY});
    const label=healthLabels.add({position,text:item.kind==='sede secondaria'?item.role:item.name,font:'600 11px Segoe UI, Arial',fillColor:C.Color.fromCssColorString('#552d51'),outlineColor:C.Color.WHITE,outlineWidth:3,style:C.LabelStyle.FILL_AND_OUTLINE,pixelOffset:new C.Cartesian2(0,-17),disableDepthTestDistance:Number.POSITIVE_INFINITY,show:false});
    healthEntries.push({item,label});
  }
  refreshHealth(height());
}
function refreshHealth(h){
  if(!healthPoints)return;
  healthPoints.show=overlayState.health;
  healthLabels.show=overlayState.health;
  const used=[];let n=0;
  for(const {item,label} of healthEntries){
    label.show=false;
    if(!overlayState.health||h>55000||n>=35)continue;
    const p=C.SceneTransforms.worldToWindowCoordinates(viewer.scene,label.position);
    if(!p||p.x<0||p.y<0||p.x>viewer.canvas.clientWidth||p.y>viewer.canvas.clientHeight)continue;
    const w=Math.min(120,Math.max(35,item.name.length*3));
    const r={l:p.x-w,r:p.x+w,t:p.y-35,b:p.y-12};
    if(used.some(b=>r.l<b.r&&r.r>b.l&&r.t<b.b&&r.b>b.t))continue;
    if(h<22000||item.kind==='ospedale'){label.show=true;used.push(r);n++;}
  }
}
function showHealthPopup(item){
  hidePopup();popupCoords=item.coords;popupBox.hidden=false;
  const top=document.createElement('div');top.className='popupHead';
  const title=document.createElement('h3');title.textContent=item.name;
  const close=document.createElement('button');close.type='button';close.className='popupClose';close.textContent='×';close.setAttribute('aria-label','Chiudi informazioni');close.onclick=hidePopup;
  top.append(title,close);popupBox.append(top);
  const type=document.createElement('div');type.className='popupType';type.textContent=item.kind==='ospedale'?'OSPEDALE':'CLINICA / CENTRO DI CURA';popupBox.append(type);
  const description=document.createElement('p');description.textContent=item.description;popupBox.append(description);
  if(item.officialName&&item.officialName!==item.name)addLine(popupBox,'Denominazione ufficiale',item.officialName);
  if(item.aliases?.length)addLine(popupBox,'Altri nomi',item.aliases.join(' · '));
  if(item.address)addLine(popupBox,'Indirizzo',item.address);
  if(item.website){const link=document.createElement('a');link.href=item.website;link.target='_blank';link.rel='noopener noreferrer';link.className='healthWebsite';link.textContent='Apri sito ufficiale ↗';popupBox.append(link);}
  const mapsLink=document.createElement('a');mapsLink.href='https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(item.name+' '+(item.address||'Roma'));mapsLink.target='_blank';mapsLink.rel='noopener noreferrer';mapsLink.className='healthWebsite';mapsLink.textContent='Apri su Google Maps ↗';popupBox.append(mapsLink);
  positionPopup();viewer.scene.requestRender();
}

function makeMunicipi(){
  municipiPoints=viewer.scene.primitives.add(new C.PointPrimitiveCollection());
  municipiLabels=viewer.scene.primitives.add(new C.LabelCollection());
  for(const item of (window.ROMA_MUNICIPI||[])){
    const position=C.Cartesian3.fromDegrees(...item.coords);
    municipiPoints.add({position,pixelSize:item.kind==='sede secondaria'?9:13,color:C.Color.fromCssColorString(item.kind==='sede secondaria'?'#63a4cc':'#1975ab'),outlineColor:C.Color.WHITE,outlineWidth:2,id:{romaMunicipioId:item.id},disableDepthTestDistance:Number.POSITIVE_INFINITY});
    const label=municipiLabels.add({position,text:item.kind==='sede secondaria'?item.role:item.name,font:'600 11px Segoe UI, Arial',fillColor:C.Color.fromCssColorString('#154d72'),outlineColor:C.Color.WHITE,outlineWidth:3,style:C.LabelStyle.FILL_AND_OUTLINE,pixelOffset:new C.Cartesian2(0,-17),disableDepthTestDistance:Number.POSITIVE_INFINITY,show:false});
    municipiEntries.push({item,label});
  }
  refreshMunicipi(height());
}
function refreshMunicipi(h){
  if(!municipiPoints)return;
  municipiPoints.show=overlayState.municipi;
  municipiLabels.show=overlayState.municipi;
  let count=0;const occupied=[];
  for(const {item,label} of municipiEntries){
    label.show=false;
    if(!overlayState.municipi||h>45000)continue;
    const p=C.SceneTransforms.worldToWindowCoordinates(viewer.scene,label.position);
    if(!p||p.x<0||p.y<0||p.x>viewer.canvas.clientWidth||p.y>viewer.canvas.clientHeight)continue;
    const box={left:p.x-65,right:p.x+65,top:p.y-32,bottom:p.y-11};
    if(occupied.some(o=>box.left<o.right&&box.right>o.left&&box.top<o.bottom&&box.bottom>o.top))continue;
    label.show=true;occupied.push(box);count++;
  }
}
function showMunicipioPopup(item){
  hidePopup();popupCoords=item.coords;popupBox.hidden=false;
  const top=document.createElement('div');top.className='popupHead';
  const title=document.createElement('h3');title.textContent=item.name;
  const close=document.createElement('button');close.type='button';close.className='popupClose';close.textContent='×';close.setAttribute('aria-label','Chiudi informazioni');close.onclick=hidePopup;
  top.append(title,close);popupBox.append(top);
  const type=document.createElement('div');type.className='popupType';type.textContent=item.kind==='sede secondaria'?'SEDE DISTACCATA / UFFICIO':'SEDE PRINCIPALE';popupBox.append(type);
  const description=document.createElement('p');description.textContent=item.description;popupBox.append(description);
  addLine(popupBox,'Municipio','Roma '+item.municipio);
  addLine(popupBox,'Funzione',item.role);
  addLine(popupBox,'Indirizzo',item.address);
  const related=(window.ROMA_MUNICIPI||[]).filter(x=>x.municipio===item.municipio&&x.id!==item.id);
  if(related.length){const h=document.createElement('div');h.className='popupType';h.textContent='ALTRE SEDI DEL MUNICIPIO';popupBox.append(h);for(const office of related){const b=document.createElement('button');b.type='button';b.className='healthWebsite';b.textContent=office.role+' — '+office.address;b.addEventListener('click',()=>{showMunicipioPopup(office);viewer.camera.flyTo({destination:C.Cartesian3.fromDegrees(office.coords[0],office.coords[1],7000),duration:0.7});});popupBox.append(b);}}
  const official=document.createElement('a');official.href=item.website;official.target='_blank';official.rel='noopener noreferrer';official.className='healthWebsite';official.textContent='Roma Capitale — Sito ufficiale ↗';popupBox.append(official);
  const maps=document.createElement('a');maps.href='https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(item.name+' '+item.address);maps.target='_blank';maps.rel='noopener noreferrer';maps.className='healthWebsite';maps.textContent='Apri su Google Maps ↗';popupBox.append(maps);
  positionPopup();viewer.scene.requestRender();
}

function makeRoads(){roadPrimitives=viewer.scene.primitives.add(new C.PolylineCollection());const lc=viewer.scene.primitives.add(new C.LabelCollection()),names=new Set();let count=0;
for(const s of roads.segments){if(s.priority>3)continue;const color=C.Color.fromCssColorString(s.priority<=1?'#ab6e35':s.priority<=3?'#c08b57':'#dbb98a').withAlpha(.78);for(const coords of s.coords){if(coords.length<2)continue;roadPrimitives.add({positions:C.Cartesian3.fromDegreesArray(coords.flat()),width:s.priority<=2?2.6:1.4,material:C.Material.fromType('Color',{color}),id:{romaRoadSegment:s.id}});count++;}
if(s.name&&s.priority<=3&&!names.has(s.name)&&names.size<450&&s.coords[0]?.length>1){const line=s.coords[0],mid=line[Math.floor(line.length/2)];const label=lc.add({position:C.Cartesian3.fromDegrees(...mid),text:s.name,font:'600 11px Segoe UI, Arial',fillColor:C.Color.fromCssColorString('#915e32'),outlineColor:C.Color.WHITE,outlineWidth:3,style:C.LabelStyle.FILL_AND_OUTLINE,disableDepthTestDistance:Number.POSITIVE_INFINITY,show:false});roadLabels.push({label,priority:s.priority});names.add(s.name);}}
$('mapStatus').textContent=`${districts.length} territori nei quiz · ${count.toLocaleString('it')} tratti OSM · ${roads.links.length} collegamenti`;}
function river(){const coords=[[12.507,42.065],[12.500,42.043],[12.500,42.020],[12.503,41.998],[12.500,41.981],[12.491,41.966],[12.482,41.953],[12.478,41.944],[12.471,41.938],[12.463,41.933],[12.461,41.925],[12.470,41.920],[12.474,41.911],[12.467,41.904],[12.468,41.895],[12.479,41.889],[12.482,41.879],[12.478,41.870],[12.472,41.861],[12.467,41.849],[12.463,41.839],[12.455,41.828],[12.451,41.815],[12.438,41.801],[12.421,41.790],[12.410,41.780],[12.385,41.776],[12.369,41.764],[12.348,41.754],[12.326,41.742],[12.304,41.732],[12.281,41.724],[12.257,41.722]];viewer.entities.add({name:'Tevere (tracciato indicativo)',polyline:{positions:C.Cartesian3.fromDegreesArray(coords.flat()),width:7,material:C.Color.fromCssColorString('#4eb7e5').withAlpha(.55)}});}
async function init(){try{const ds=await C.GeoJsonDataSource.load('js/districts.geojson',{stroke:C.Color.WHITE,fill:C.Color.fromCssColorString(colors.base),strokeWidth:1});viewer.dataSources.add(ds);for(const e of ds.entities.values){const id=e.properties?.roma_id?.getValue(C.JulianDate.now());if(Number.isInteger(id)&&e.polygon){if(!entities.has(id))entities.set(id,[]);entities.get(id).push(e);const hierarchy=e.polygon.hierarchy.getValue(C.JulianDate.now()),rect=C.Rectangle.fromCartesianArray(hierarchy.positions),center=C.Rectangle.center(rect);if(!districts[id].geoCenter)districts[id].geoCenter=[C.Math.toDegrees(center.longitude),C.Math.toDegrees(center.latitude)];}}if(entities.size!==districts.length)throw Error(`Geometrie: ${entities.size} di ${districts.length}`);recenterDistricts();makeLabels();makeRoads();makeTransit();makeHealth();makeMunicipi();river();started=true;change('learnQuartieri');fly(views.city);
// In SCENE2D the filled district polygon often wins scene.pick over a thin road.
// Search all picked primitives first, then use a screen-space tolerance for roads.
const roadHitSegments=roads.segments.filter(s=>s.priority<=3&&groupBySegment.has(s.id));
function nearestRoadAt(screenPoint){
  const cart=viewer.camera.pickEllipsoid(screenPoint);
  if(!cart)return null;
  const geo=C.Cartographic.fromCartesian(cart),lon=C.Math.toDegrees(geo.longitude),lat=C.Math.toDegrees(geo.latitude);
  const cameraWidth=Math.max(0.001,viewer.camera.computeViewRectangle()?.east-viewer.camera.computeViewRectangle()?.west||0.1);
  const delta=Math.max(.00012,Math.min(.05,C.Math.toDegrees(cameraWidth)*14/Math.max(1,viewer.canvas.clientWidth)));
  let best=null,bestDist2=14*14;
  const distPointSegment=(x,y,x1,y1,x2,y2)=>{const dx=x2-x1,dy=y2-y1,den=dx*dx+dy*dy;const t=den?Math.max(0,Math.min(1,((x-x1)*dx+(y-y1)*dy)/den)):0;return (x-x1-t*dx)**2+(y-y1-t*dy)**2;};
  for(const seg of roadHitSegments){
    for(const line of seg.coords){
      for(let i=1;i<line.length;i++){
        const a=line[i-1],b=line[i];
        if(lon<Math.min(a[0],b[0])-delta||lon>Math.max(a[0],b[0])+delta||lat<Math.min(a[1],b[1])-delta||lat>Math.max(a[1],b[1])+delta)continue;
        const p1=C.SceneTransforms.worldToWindowCoordinates(viewer.scene,C.Cartesian3.fromDegrees(a[0],a[1]));
        const p2=C.SceneTransforms.worldToWindowCoordinates(viewer.scene,C.Cartesian3.fromDegrees(b[0],b[1]));
        if(!p1||!p2)continue;
        const d2=distPointSegment(screenPoint.x,screenPoint.y,p1.x,p1.y,p2.x,p2.y);
        if(d2<bestDist2){bestDist2=d2;best=seg.id;}
      }
    }
  }
  return best;
}
function roadPopupAt(segmentId,mouse){
  const group=groupBySegment.get(segmentId);
  if(!group)return false;
  const cart=viewer.camera.pickEllipsoid(mouse),p=cart?C.Cartographic.fromCartesian(cart):null;
  const seg=roadById.get(segmentId);
  const location=p?[C.Math.toDegrees(p.longitude),C.Math.toDegrees(p.latitude)]:seg?.coords[0]?.[0];
  if(!location)return false;
  showRoadPopup(group,location);return true;
}
const handler=new C.ScreenSpaceEventHandler(viewer.scene.canvas);
handler.setInputAction(ev=>{
  const pickedAll=viewer.scene.drillPick(ev.position,25);
  const picked=pickedAll[0]||viewer.scene.pick(ev.position);
  const municipioHit=overlayState.municipi&&pickedAll.find(x=>x?.id?.romaMunicipioId);
  if(municipioHit){const office=(window.ROMA_MUNICIPI||[]).find(x=>x.id===municipioHit.id.romaMunicipioId);if(office){showMunicipioPopup(office);return;}}
  const healthHit=overlayState.health&&pickedAll.find(x=>x?.id?.romaHealthId);
  if(healthHit){const facility=(window.ROMA_HEALTH||[]).find(x=>x.id===healthHit.id.romaHealthId);if(facility){showHealthPopup(facility);return;}}
  const station=pickedAll.find(x=>x?.id?.romaTransitStation);
  if(station){showTransitPopup(station.id.romaTransitStation);return;}
  if(overlayState.roads){
    const roadHit=pickedAll.find(x=>Number.isInteger(x?.id?.romaRoadSegment));
    const id=roadHit?.id?.romaRoadSegment??nearestRoadAt(ev.position);
    if(Number.isInteger(id)&&roadPopupAt(id,ev.position))return;
  }
  const area=pickedAll.find(x=>x?.id?.properties?.roma_id);
  const id=(area||picked)?.id?.properties?.roma_id?.getValue(C.JulianDate.now());
  if(Number.isInteger(id))clicked(id);
  else if(mode.startsWith('learn'))hidePopup();
},C.ScreenSpaceEventType.LEFT_CLICK);
viewer.camera.moveEnd.addEventListener(()=>{const p=viewer.camera.pickEllipsoid(new C.Cartesian2(viewer.canvas.clientWidth/2,viewer.canvas.clientHeight/2));if(p&&!C.Rectangle.contains(region,C.Cartographic.fromCartesian(p))){fly(views.all);feedback('Navigazione limitata al Lazio.');}refresh();});
}catch(err){console.error('Roma Lab - inizializzazione Cesium:',err);$('mapStatus').textContent=`Errore mappa: ${err.message}`;feedback('Impossibile caricare la mappa. Controlla Console e Network (F12).',false);}}
document.querySelector('.updateNotice p').textContent='Disponibili 332 quartieri urbani, 22 rioni e 100 zone funzionali, tutti selezionabili nei test del livello massimo. La delibera del 1° ottobre 2026 approva 334 quartieri: il servizio ufficiale deve ancora pubblicarne due.';
document.querySelectorAll('[data-mode]').forEach(b=>b.onclick=()=>change(b.dataset.mode));$('level').onchange=e=>{level=+e.target.value;bag=[];last=null;$('levelCount').textContent=`${active().length} aree nei test su ${districts.length}`;newQuestion();};$('next').onclick=newQuestion;$('restart').onclick=()=>{if(mode==='testMovimenti'&&start!==null){steps=[start];chosenRoads=[];done=false;moves();refresh();}};$('zero').onclick=()=>{correct=attempts=0;$('correct').textContent='0';attempts=0;$('attempts').textContent='0';};$('zoomIn').onclick=()=>viewer.camera.zoomIn(height()*.35);$('zoomOut').onclick=()=>viewer.camera.zoomOut(height()*.5);$('zoomCenter').onclick=()=>fly(views.center);$('zoomCity').onclick=()=>fly(views.city);$('zoomAll').onclick=()=>fly(views.all);$('levelCount').textContent=`${active().length} aree nei test su ${districts.length}`;init();
})();
