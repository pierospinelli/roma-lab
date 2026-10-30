/** Scarica fotografie reali da Wikimedia Commons, registrando licenze e autori.
 * Richiede Node.js 20+ e connessione Internet solo durante questa importazione.
 * Eseguire: node importa-foto-commons.mjs
 */
import fs from 'node:fs/promises';
import path from 'node:path';
const root=process.cwd();
const source=path.join(root,'js/monuments.js');
const src=await fs.readFile(source,'utf8');
const monuments=JSON.parse(src.trim().replace(/^window\.ROMA_MONUMENTS=/,'').replace(/;\s*$/,''));
const targets=new Map([
 ['mon-01','Colosseum Rome exterior'],['mon-04','Pantheon Rome facade'],['mon-05','Trevi Fountain Rome'],
 ['mon-06','Vittoriano Rome monument'],['mon-07','Castel Sant Angelo Rome'],['mon-08','Baths of Caracalla Rome'],
 ['mon-09','Circus Maximus Rome'],['mon-10','Trajans Column Rome'],['mon-12','Ara Pacis Rome'],
 ['mon-13','Pyramid of Cestius Rome'],['mon-14','Arch of Septimius Severus Rome'],
 ]);
const clean=v=>String(v||'').replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim();
const credits=[];let successes=0;
for(const mon of monuments){
 const query=targets.get(mon.id);
 if(!query)continue;
 try{
  const u=new URL('https://commons.wikimedia.org/w/api.php');
  Object.entries({action:'query',format:'json',generator:'search',gsrsearch:`filetype:bitmap ${query}`,gsrnamespace:6,gsrlimit:'12',prop:'imageinfo',iiprop:'url|extmetadata|mime',iiurlwidth:'480'}).forEach(([k,v])=>u.searchParams.set(k,v));
  const response=await fetch(u,{headers:{'User-Agent':'RomaLabEducational/0.25 (offline photo import)'}});
  if(!response.ok)throw Error('Wikimedia API HTTP '+response.status);
  const pages=Object.values((await response.json()).query?.pages||{});
  let chosen;
  for(const p of pages){const ii=p.imageinfo?.[0];const metadata=ii?.extmetadata||{};const license=clean(metadata.LicenseShortName?.value);const artist=clean(metadata.Artist?.value);const url=ii?.thumburl;const mime=ii?.thumbmime||ii?.mime||'';
   if(!url||!/^image\/(jpeg|png|webp)$/.test(mime)||!(/CC0|Public domain|CC BY(?:-|$)/i.test(license))||!artist)continue;
   chosen={url,title:p.title,license,artist,descriptionurl:ii.descriptionurl,licenseurl:clean(metadata.LicenseUrl?.value),mime};break;
  }
  if(!chosen){console.warn('Nessuna foto con metadata utilizzabili:',mon.name);continue;}
  const res=await fetch(chosen.url);if(!res.ok)throw Error('download '+res.status);
  const buffer=Buffer.from(await res.arrayBuffer());if(buffer.length<1000||buffer.length>5e6)throw Error('Dimensione immagine inattesa');
  const ext=chosen.mime==='image/png'?'png':chosen.mime==='image/webp'?'webp':'jpg';
  const file=`assets/monuments/${mon.id}.${ext}`;
  await fs.writeFile(path.join(root,file),buffer);
  mon.image=file;mon.photoCredit=chosen.artist;mon.photoLicense=chosen.license;mon.photoSource=chosen.descriptionurl;
  credits.push({monument:mon.name,...chosen,file});successes++;
  console.log('OK',mon.name,chosen.title);
 }catch(err){console.warn('Non importata:',mon.name,err.message);}
}
if(!successes){console.error('Nessuna foto importata. I file originali restano intatti.');process.exitCode=1;}
else{
 await fs.writeFile(source,'window.ROMA_MONUMENTS='+JSON.stringify(monuments)+';\n');
 const md=['# Crediti fotografie — Roma Lab','',...credits.flatMap(c=>[`## ${c.monument}`,`- File: \`${c.file}\``,`- Autore: ${c.artist}`,`- Licenza: ${c.license}`,`- Fonte: ${c.descriptionurl}`,`- URL licenza: ${c.licenseurl||'Consultare la pagina Wikimedia Commons'}`,''])].join('\n');
 await fs.writeFile(path.join(root,'CREDITI_IMMAGINI.md'),md);
 console.log(`Importate ${successes} foto. Ora esegui: node prepare-pages.mjs`);
}
