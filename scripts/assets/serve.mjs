import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import {ROOT} from './common.mjs';
http.createServer((req,res)=>{
 const file=path.resolve(ROOT,'.'+decodeURIComponent((req.url==='/'?'/art/preview/index.html':req.url).split('?')[0]));
 if(!file.startsWith(ROOT+path.sep)){res.writeHead(403).end();return;}
 fs.readFile(file,(err,data)=>{if(err){res.writeHead(404).end('Not found');return;}res.setHeader('Content-Type',({'html':'text/html','svg':'image/svg+xml','json':'application/json','png':'image/png'})[path.extname(file).slice(1)]??'text/plain');res.end(data);});
}).listen(4173,'0.0.0.0',()=>console.log('http://localhost:4173/art/preview/'));
