import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
export const read = p => fs.readFileSync(path.join(ROOT,p),'utf8');
export const write = (p,s) => { fs.mkdirSync(path.dirname(path.join(ROOT,p)),{recursive:true});fs.writeFileSync(path.join(ROOT,p),s); };
export const palette = JSON.parse(read('art/palette.json'));
// Preserve hue and saturation; vary HSL lightness by 18 percent of its range.
export function shade(hex, delta) {
 const rgb=hex.slice(1).match(/../g).map(v=>parseInt(v,16)/255), max=Math.max(...rgb), min=Math.min(...rgb), l=(max+min)/2;
 const nl=Math.max(0,Math.min(1,l+delta)), d=max-min, sat=d===0?0:d/(1-Math.abs(2*l-1));
 const chroma=(1-Math.abs(2*nl-1))*sat, factor=d?chroma/d:0;
 return '#'+rgb.map(c=>Math.round(255*((c-min)*factor+nl-chroma/2)).toString(16).padStart(2,'0')).join('').toUpperCase();
}
export const C=(token,tone=0)=>tone?shade(palette[token],tone):palette[token];
export const colors = new Set(Object.values(palette).flatMap(v=>[v,shade(v,.18),shade(v,-.18)]));
export const round=n=>Math.round(n*10)/10;
export const manifest=()=>JSON.parse(read('art/manifest.json'));
export function files(dir){return fs.existsSync(path.join(ROOT,dir))?fs.readdirSync(path.join(ROOT,dir),{withFileTypes:true}).flatMap(e=>e.isDirectory()?files(`${dir}/${e.name}`):[`${dir}/${e.name}`]):[];}
export function expanded(m){return m.assets.flatMap(a=>Array.from({length:a.frames},(_,i)=>({...a,frame:i+1,key:a.frames>1?`${a.id}.f${i+1}`:a.id,src:a.src.replace('{f}',i+1),out:a.out.replace('{f}',i+1)})));}
export function svg(body,w=128,h=w,stroke=6*w/256){return `<svg xmlns="http://www.w3.org/2000/svg" version="1.1" viewBox="0 0 ${w} ${h}" fill="none" stroke="${C('ink')}" stroke-width="${stroke}" stroke-linecap="round" stroke-linejoin="round">${body}</svg>\n`;}
