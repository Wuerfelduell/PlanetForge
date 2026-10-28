// Original late-game toy architecture, drawn entirely from palette-based SVG.
// Run this generator before npm --prefix scripts/assets run assets:gen.
// Helpers copied locally from the building/weapon generators; no shared edits.
import {C, svg, round, write} from './common.mjs';

let state = 'idle';
const paint = (token, tone = 0) => C(state !== 'idle' && !['ink','coal','rock','rock-dark','snow'].includes(token)
  ? (['cream','paper','sand','tint-white'].includes(token) ? 'rock' : 'rock-dark') : token, tone);
const path = (d, token = 'none', extra = '', tone = 0) => `<path d="${d}" fill="${token === 'none' ? 'none' : paint(token, tone)}" ${extra}/>`;
const rect = (x,y,w,h,token,r=8,extra='') => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="${paint(token)}" ${extra}/>`;
const circle = (x,y,r,token,extra='') => `<circle cx="${x}" cy="${y}" r="${r}" fill="${paint(token)}" ${extra}/>`;
const ellipse = (x,y,rx,ry,token,extra='') => `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="${paint(token)}" ${extra}/>`;
const group = (id,body,extra='') => `<g id="${id}" ${extra}>${body}</g>`;
const line = (d,token='ink',width=3,extra='') => path(d,'none',`stroke="${paint(token)}" stroke-width="${width}" ${extra}`);
const rim = d => line(d,'snow',4);
const lit = token => state === 'idle' ? token : 'coal';
const rivet = (x,y) => circle(x,y,5,'rock','stroke-width="3"')+circle(x-1,y-1,1.5,'snow','stroke="none"');
// 194 px + the shared 6 px outline = exactly 200 px at ground y=240.
const base = () => rect(31,225,194,12,'rock',6)+line('M42 233H214','rock-dark',5);
const foot = body => body+base();

function scaffolding(){
  return group('scaffolding',rect(38,78,12,159,'iron',6)+rect(206,78,12,159,'iron',6)+
    rect(31,113,194,12,'sand',5)+rect(31,186,194,12,'sand',5)+
    line('M50 180L206 127M50 201L198 230','iron',5)+
    rect(174,155,12,82,'sand',6)+rect(194,155,12,82,'sand',6)+
    [168,188,208,228].map(y=>line(`M180 ${y}H200`,'iron',4)).join(''));
}

function neutronBastion(){
  return foot(
    // Low stepped bunker, with neither battlements nor a gun barrel.
    rect(45,142,166,84,'space-deep',22)+
    path('M185 150Q204 150 204 171V218H172Z','deep-water','stroke="none"',-.18)+
    path('M57 145V130Q57 115 73 115H183Q199 115 199 130V145Z','space-deep')+
    path('M66 135Q66 125 78 125H169','none',`stroke="${paint('deep-water',-.18)}" stroke-width="7"`)+
    rim('M69 129Q69 123 80 123H150')+
    // Broad armored cheeks flare outward to carry the roof's weight.
    path('M41 166Q41 155 53 155H81Q91 155 93 168L100 223H36Z','space-deep')+
    path('M163 168Q165 155 175 155H203Q215 155 215 166L220 223H156Z','space-deep')+
    path('M75 160H81L91 219H77ZM199 159H204Q211 159 211 171L216 219H198Z','deep-water','stroke="none"',-.18)+
    rim('M48 180V170Q48 163 58 163H69M171 173Q173 163 181 163H192')+
    rect(96,171,64,52,'deep-water',13)+rect(107,181,42,42,'space-deep',10)+
    line('M128 185V220M115 205H121M135 205H141','rock-dark',3)+
    [52,79,177,204].map((x,i)=>rivet(x,i%2?211:184)).join('')+
    line('M104 159H152','rock-dark',4)+
    // Tiny single sensor peeks above the slab, like a shy periscope.
    group('sensor',rect(111,103,34,15,'rock-dark',7)+rect(104,85,48,24,'space-deep',12)+
      ellipse(128,97,12,7,lit('science'),'stroke-width="3"')+
      (state==='idle'?line('M122 94H128','snow',3):'')+rim('M112 92L117 90')));
}

const definitions = [
  {id:'neutron-bastion',draw:neutronBastion,parts:['sensor'],tags:['defense','neutronium']},
];
const assets = [];
for(const def of definitions)for(const mode of ['idle','construction','off']){
  state=mode;
  let body=def.draw();
  state='idle';
  if(mode==='construction')body=`<g opacity="0.4">${body}</g>`+scaffolding();
  const stem=def.id+(mode==='idle'?'':`-${mode}`),src=`art/src/buildings/${stem}.svg`;
  write(src,svg(body,256));
  assets.push({id:`building.${def.id}${mode==='idle'?'':'.'+mode}`,category:'buildings',src,
    out:`public/assets/sprites/buildings/${stem}.png`,viewBox:[256,256],anchor:[.5,.9375],frames:1,
    parts:[...def.parts,...(mode==='construction'?['scaffolding']:[])],
    tags:['warp-buildings2',def.id,...def.tags,mode],phase:'P1',
    ...(def.pivot?{partPivots:{[def.parts[0]]:def.pivot}}:{})});
}
write('art/manifest/warp-buildings2.json',JSON.stringify({assets},null,2)+'\n');
console.log(`Warp buildings 2: ${definitions.length} buildings, ${assets.length} ids.`);
