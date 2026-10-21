// Original PlanetForge gem art, authored as deterministic vector geometry.
// Run: node scripts/assets/gen-gems.mjs, then npm --prefix scripts/assets run assets:gen.
import { C, svg, round, write } from './common.mjs';

const assets = [];
let state = 'idle';
// Same off-state palette mapping as gen-buildings.mjs and gen-economy.mjs.
const paint = (token, tone = 0) => C(state === 'off' && !['ink', 'coal', 'rock', 'rock-dark', 'snow'].includes(token)
  ? (['cream', 'paper', 'sand'].includes(token) ? 'rock' : 'rock-dark') : token, tone);
const p = (d, token = 'none', extra = '', tone = 0) => `<path d="${d}" fill="${token === 'none' ? 'none' : paint(token, tone)}" ${extra}/>`;
const rect = (x,y,w,h,token,r=8,extra='') => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="${paint(token)}" ${extra}/>`;
const ellipse = (x,y,rx,ry,token,extra='') => `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="${paint(token)}" ${extra}/>`;
const circle = (x,y,r,token,extra='') => `<circle cx="${x}" cy="${y}" r="${r}" fill="${paint(token)}" ${extra}/>`;
const group = (id, body, extra='') => `<g id="${id}" ${extra}>${body}</g>`;
const line = (d,token='ink',width=3,extra='') => p(d,'none',`stroke="${paint(token)}" stroke-width="${width}" ${extra}`);
const shine = d => line(d,'cream',4);
const star = (x,y,r) => p(`M${x} ${y-r}Q${x+2} ${y-2} ${x+r} ${y}Q${x+2} ${y+2} ${x} ${y+r}Q${x-2} ${y+2} ${x-r} ${y}Q${x-2} ${y-2} ${x} ${y-r}Z`,'snow');

function emit(id, category, stem, body, size=128, extra={}) {
  const src=`art/src/${category}/${stem}.svg`;
  write(src,svg(body,size,size,extra.stroke??6*size/256));
  const {stroke,...metadata}=extra;
  assets.push({id,category,src,out:`public/assets/sprites/${category}/${stem}.png`,viewBox:[size,size],anchor:[.5,.5],frames:1,parts:[],tags:['gems',stem],phase:'P1',...metadata});
}

function gem(kind, mini=false) {
  const fine=mini?3:1.5;
  if(kind==='diamond')return p('M35 32H89L112 55L64 111L16 55Z','snow')+
    p('M16 55H112L64 111Z','glacier')+
    p('M82 55H112L64 111Z','glacier','stroke="none"',-.18)+
    p('M45 55L64 111L82 55Z','snow')+
    line('M16 55H112M35 32L45 55L62 32L82 55L89 32','ink',fine)+
    (mini?'':line('M29 53L39 41M52 61L62 82','tint-white',4))+star(105,22,mini?9:10);
  if(kind==='emerald')return p('M38 16H86L105 35V93L86 112H38L19 93V35Z','leaf')+
    p('M38 16H86L76 34H47L36 45L19 35Z','grass','stroke="none"')+
    p('M105 35V93L86 112H38L48 94H77L88 83V45Z','leaf','stroke="none"',-.18)+
    p('M47 34H77L88 45V83L77 94H47L36 83V45Z','leaf')+
    line('M38 16L47 34M86 16L77 34M105 35L88 45M105 93L88 83M86 112L77 94M38 112L47 94M19 93L36 83M19 35L36 45','ink',fine)+
    (mini?line('M43 47V68','grass',5):line('M43 77V49L51 41H70','grass',4));
  if(kind==='ruby')return p('M64 16C89 16 108 37 108 64C108 91 89 112 64 112C39 112 20 91 20 64C20 37 39 16 64 16Z','danger','',-.18)+
    p('M64 16L81 38L48 38L20 64Q21 28 64 16Z','danger','stroke="none"')+
    p('M48 38H81L92 66L77 91H48L35 65Z','danger','',-.18)+
    p('M48 39H79L68 53H49L37 63Z','danger','stroke="none"')+
    line('M64 16L48 38M81 38L101 38M108 64L92 66M95 98L77 91M64 112L48 91M25 88L35 65M20 64L48 38','ink',fine)+
    (mini?line('M47 51L54 45','cream',5):shine('M44 56L51 45H66'));
  throw new Error(`Unknown gem ${kind}`);
}

for(const kind of ['diamond','emerald','ruby']) {
  emit(`resource.${kind}`,'resources',kind,gem(kind));
  emit(`resource.${kind}.mini`,'resources',`${kind}-mini`,`<g transform="scale(0.5)" stroke-width="8">${gem(kind,true)}</g>`,64,{stroke:4});
}

write('art/manifest/gems.json',JSON.stringify({assets},null,2)+'\n');
console.log(`Gem art: ${assets.length} ids generated.`);
