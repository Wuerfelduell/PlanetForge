import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import {ROOT,manifest,expanded,write} from './common.mjs';
// Deterministic shelf packing. Each trimmed RGBA frame gets a two pixel gutter.
const MAX=2048,PAD=2;
const m=manifest(), records=expanded(m);
await fs.rm(path.join(ROOT,'public/assets/atlas'),{recursive:true,force:true});
await fs.rm(path.join(ROOT,'public/assets/sprites'),{recursive:true,force:true});
const index={version:1,scales:{}};
for(const scale of [1,2]){
 const groups=new Map(); index.scales[scale]={};
 for(const a of records){
  const width=a.viewBox[0]*scale,height=a.viewBox[1]*scale;
  const png=await sharp(path.join(ROOT,a.src),{density:72*scale}).resize(width,height).png().toBuffer();
  const out=a.out.replace(/\.png$/,scale===1?'.png':'@2x.png');
  await fs.mkdir(path.dirname(path.join(ROOT,out)),{recursive:true});await fs.writeFile(path.join(ROOT,out),png);
  const {data,info}=await sharp(png).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  let left=width,top=height,right=-1,bottom=-1;
  for(let y=0;y<height;y++)for(let x=0;x<width;x++)if(data[(y*width+x)*4+3]>0){left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);}
  if(right<0){left=top=0;right=bottom=0;}
  const w=right-left+1,h=bottom-top+1;
  if(w+PAD*2>MAX||h+PAD*2>MAX){
   // Full portrait backgrounds exceed a sheet at 2x: single PNG is authoritative.
   index.scales[scale][a.key]={standalone:out.replace('public/',''),reason:'larger-than-atlas'};continue;
  }
  const trimmed=await sharp(data,{raw:info}).extract({left,top,width:w,height:h}).png().toBuffer();
  if(!groups.has(a.category))groups.set(a.category,[]);
  groups.get(a.category).push({a,trimmed,w,h,left,top,width,height});
 }
 for(const [category,items] of groups){
  items.sort((a,b)=>b.h-a.h||b.w-a.w||a.a.key.localeCompare(b.a.key));
  const pages=[];
  for(const item of items){
   let page=pages.at(-1);
   if(!page){page={items:[],x:PAD,y:PAD,row:0,w:0,h:0};pages.push(page);}
   if(page.x+item.w+PAD>MAX){page.x=PAD;page.y+=page.row+PAD*2;page.row=0;}
   if(page.y+item.h+PAD>MAX){page={items:[],x:PAD,y:PAD,row:0,w:0,h:0};pages.push(page);}
   item.x=page.x;item.y=page.y;page.items.push(item);page.x+=item.w+PAD*2;page.row=Math.max(page.row,item.h);page.w=Math.max(page.w,page.x-PAD);page.h=Math.max(page.h,item.y+item.h+PAD);
  }
  const names=pages.map((_,i)=>`${category}@${scale}x${i?`-${i+1}`:''}`);
  for(let i=0;i<pages.length;i++){
   const p=pages[i],name=names[i],frames={};
   for(const it of p.items){
    frames[it.a.key]={frame:{x:it.x,y:it.y,w:it.w,h:it.h},rotated:false,trimmed:it.w!==it.width||it.h!==it.height,spriteSourceSize:{x:it.left,y:it.top,w:it.w,h:it.h},sourceSize:{w:it.width,h:it.height},pivot:{x:it.a.anchor?.[0]??.5,y:it.a.anchor?.[1]??.5},anchor:{x:it.a.anchor?.[0]??.5,y:it.a.anchor?.[1]??.5}};
    index.scales[scale][it.a.key]={atlas:`assets/atlas/${name}.json`,frame:it.a.key};
   }
   const animations={};for(const a of m.assets.filter(a=>a.category===category&&a.frames>1)){const all=Array.from({length:a.frames},(_,f)=>`${a.id}.f${f+1}`);if(all.every(key=>frames[key]))animations[a.id]=all;}
   const atlas={frames,animations,meta:{app:'PlanetForge original SVG pipeline',version:'1',image:`${name}.png`,format:'RGBA8888',size:{w:p.w,h:p.h},scale:String(scale),related_multi_packs:names.filter(n=>n!==name).map(n=>n+'.json')}};
   write(`public/assets/atlas/${name}.json`,JSON.stringify(atlas)+'\n');
   await sharp({create:{width:p.w,height:p.h,channels:4,background:'#00000000'}}).composite(p.items.map(it=>({input:it.trimmed,left:it.x,top:it.y}))).png().toFile(path.join(ROOT,`public/assets/atlas/${name}.png`));
  }
  console.log(`${category} @${scale}x: ${items.length} frames / ${pages.length} sheets`);
 }
}
index.animations=Object.fromEntries(m.assets.filter(a=>a.frames>1).map(a=>[a.id,{frames:Array.from({length:a.frames},(_,i)=>`${a.id}.f${i+1}`),fps:a.fps}]));
write('public/assets/atlas/index.json',JSON.stringify(index,null,2)+'\n');
console.log(`Built ${records.length} SVGs at 1x and 2x.`);
