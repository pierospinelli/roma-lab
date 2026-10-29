import {createServer} from 'node:http';
import {readFile,stat} from 'node:fs/promises';
import {resolve,sep,extname} from 'node:path';
const root=resolve(import.meta.dirname),port=6060;
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.geojson':'application/geo+json; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.gif':'image/gif','.webp':'image/webp','.wasm':'application/wasm','.woff2':'font/woff2'};
createServer(async(req,res)=>{
  try{
    const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
    const file=resolve(root,'.'+(pathname==='/'?'/index.html':pathname));
    if(file!==root&&!file.startsWith(root+sep)){res.writeHead(403);res.end();return;}
    if(!(await stat(file)).isFile())throw new Error('Not a file');
    res.writeHead(200,{'Content-Type':types[extname(file)]||'application/octet-stream','Cache-Control':'no-cache','Access-Control-Allow-Origin':'http://localhost:6060'});
    res.end(await readFile(file));
  }catch{res.writeHead(404,{'Content-Type':'text/plain; charset=utf-8'});res.end('File non trovato');}
}).listen(port,'127.0.0.1',()=>console.log(`Roma Lab: http://localhost:${port}`));
