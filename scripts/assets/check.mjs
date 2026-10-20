import fs from 'node:fs';
import {ROOT,read,files,manifest,expanded,colors} from './common.mjs';
const m=manifest(), errors=[], seen=new Set(), sources=new Set();
const fail=s=>errors.push(s);
for(const a of m.assets){
 if(seen.has(a.id))fail(`Duplicate id ${a.id}`);seen.add(a.id);
 if(!Number.isInteger(a.frames)||a.frames<1)fail(`Invalid frames ${a.id}`);
 if(a.frames>1&&(!a.src.includes('{f}')||!a.out.includes('{f}')||!a.fps))fail(`Animation contract ${a.id}`);
}
for(const a of expanded(m)){
 sources.add(a.src);if(!fs.existsSync(`${ROOT}/${a.src}`)){fail(`Missing ${a.src}`);continue;}
 const s=read(a.src), root=s.match(/<svg\b[^>]*>/)?.[0]??'';
 if(Buffer.byteLength(s)>30000)fail(`Over 30 KB ${a.src}`);
 if(/<(text|image|script|foreignObject|animate|animateTransform)\b/i.test(s)||/\son\w+=/i.test(s))fail(`Forbidden SVG element ${a.src}`);
 if(/\s(?:width|height)\s*=/.test(root))fail(`Root dimensions ${a.src}`);
 if(/(?:href\s*=\s*["'](?!#)|url\(\s*["']?(?!#)[^)]|@import)/.test(s))fail(`External reference ${a.src}`);
 const v=root.match(/viewBox="0 0 (\d+) (\d+)"/);if(!v||+v[1]!==a.viewBox[0]||+v[2]!==a.viewBox[1])fail(`viewBox ${a.src}`);
 for(const color of s.match(/#[0-9a-f]{6}\b/gi)??[])if(!colors.has(color.toUpperCase()))fail(`Color ${color}: ${a.src}`);
 for(const part of a.parts??[])if(!s.includes(`id="${part}"`))fail(`Missing part ${part}: ${a.src}`);
 if(/\d+\.\d{2,}/.test(s))fail(`Coordinate precision ${a.src}`);
 if(/<filter\b/.test(s)&&!['fx','space','planets'].includes(a.category))fail(`Filter category ${a.src}`);
}
for(const f of files('art/src').filter(f=>f.endsWith('.svg')))if(!sources.has(f))fail(`Unlisted source ${f}`);
if(errors.length){console.error(errors.join('\n'));process.exit(1);}
console.log(`PASS: ${m.assets.length} ids, ${sources.size} SVG files (${m.phase}).`);
