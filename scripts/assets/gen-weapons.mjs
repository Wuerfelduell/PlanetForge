// Original PlanetForge defense art. Run this generator before assets:gen.
// Helpers intentionally copied from the building/gem generators; shared code stays untouched.
import { C, svg, round, write } from './common.mjs';
let state='idle';
const paint=(token,tone=0)=>C(state==='off'&&!['ink','coal','rock','rock-dark','snow'].includes(token)
  ?(['cream','paper','sand'].includes(token)?'rock':'rock-dark'):token,tone);
const path=(d,token='none',extra='',tone=0)=>`<path d="${d}" fill="${token==='none'?'none':paint(token,tone)}" ${extra}/>`;
const rect=(x,y,w,h,token,r=8,extra='')=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="${paint(token)}" ${extra}/>`;
const circle=(x,y,r,token,extra='')=>`<circle cx="${x}" cy="${y}" r="${r}" fill="${paint(token)}" ${extra}/>`;
const ellipse=(x,y,rx,ry,token,extra='')=>`<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="${paint(token)}" ${extra}/>`;
const group=(id,body,extra='')=>`<g id="${id}" ${extra}>${body}</g>`;
const line=(d,token='ink',width=3,extra='')=>path(d,'none',`stroke="${paint(token)}" stroke-width="${width}" ${extra}`);
const glint=d=>line(d,'cream',4);
const lit=(token='energy')=>state==='idle'?token:'coal';
const post=(x,y,h,token='iron')=>rect(x,y,12,h,token,6);
const base=()=>rect(31,225,194,12,'rock',6)+line('M42 233H214','rock-dark',5);
const foot=body=>body+base();
const pipe=(d,token='rock',width=10)=>line(d,'ink',width+6)+line(d,token,width);
const leaf=(x,y,rotation=0)=>`<g transform="translate(${x} ${y}) rotate(${rotation})">${path('M-14 4Q-17-11 10-13Q19 10-14 4Z','leaf')}${line('M-12 3L9-10','grass',3)}</g>`;
function scaffolding(){return group('scaffolding',post(38,78,159)+post(206,78,159)+rect(30,113,196,12,'sand',5)+rect(30,186,196,12,'sand',5)+
  line('M46 181L207 127M47 202L199 230','iron',5)+post(176,154,83,'sand')+post(196,154,83,'sand')+
  [166,186,206,226].map(y=>line(`M180 ${y}H200`,'iron',4)).join(''));}
function pitfall(){
 return ellipse(128,212,97,25,'moss')+
  path('M33 215Q73 238 153 229Q199 226 223 210Q226 236 128 237Q45 237 33 215Z','moss','stroke="none"',-.18)+
  ellipse(128,205,82,20,'coal')+ellipse(145,210,54,12,'ink','stroke="none"')+
  group('camouflage',pipe('M51 190L133 213M57 204L117 225M76 184L61 216M102 187L90 221M127 194L118 225','iron',4)+
    leaf(63,188,-12)+leaf(89,190,18)+leaf(112,198,48)+leaf(71,211,160)+leaf(103,219,160))+
  [[46,188],[191,187],[62,216]].map(([x,y])=>path(`M${x} ${y+18}V${y-9}Q${x+5} ${y-18} ${x+10} ${y-9}V${y+18}Z`,'iron')+glint(`M${x+3} ${y-4}V${y+8}`)).join('')+
  group('flag',line('M205 219V140','ink',6)+path('M205 143Q214 138 226 145L221 156L227 169Q214 163 205 167Z','ascension')+path('M215 148L221 154L215 160L210 154Z','coal','stroke="none"'))+
  glint('M42 210Q49 221 66 223')+leaf(171,224,145);
}
const definitions=[
 {id:'pitfall',draw:pitfall,parts:['camouflage','flag']},
];
const assets=[];
for(const def of definitions)for(const mode of ['idle','construction','off']){
 state=mode;
 let body=def.draw();
 state='idle';
 if(mode==='construction')body=`<g opacity="0.4">${body}</g>${scaffolding()}`;
 const suffix=mode==='idle'?'':`.${mode}`,stem=def.id.replaceAll('.','-')+(mode==='idle'?'':`-${mode}`);
 const src=`art/src/buildings/${stem}.svg`;
 write(src,svg(body,256));
 assets.push({id:`building.${def.id}${suffix}`,category:'buildings',src,out:`public/assets/sprites/buildings/${stem}.png`,viewBox:[256,256],anchor:[.5,.9375],frames:1,
  parts:[...(def.parts??[]),...(mode==='construction'?['scaffolding']:[])],tags:['defense',...def.id.split('.'),mode],phase:'P1',
  ...(def.pivot?{partPivots:{[def.parts[0]]:def.pivot}}:{})});
}
write('art/manifest/weapons.json',JSON.stringify({assets},null,2)+'\n');
console.log(`Defense art: ${definitions.length} buildings / ${assets.length} ids.`);
