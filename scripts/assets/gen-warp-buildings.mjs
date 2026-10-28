// Original late-game toy buildings. Run before assets:gen (which splits parts and merges fragments):
// node scripts/assets/gen-warp-buildings.mjs
// npm --prefix scripts/assets run assets:gen
// npm --prefix scripts/assets run assets:check
import { C, svg, write } from './common.mjs';

// Local copies of the building/weapons helpers keep the shared generators untouched.
let state='idle';
const paint=(token,tone=0)=>C(state==='off'&&!['ink','coal','rock','rock-dark','snow'].includes(token)
  ?(['cream','paper','sand'].includes(token)?'rock':'rock-dark'):token,tone);
const path=(d,token='none',extra='',tone=0)=>`<path d="${d}" fill="${token==='none'?'none':paint(token,tone)}" ${extra}/>`;
const rect=(x,y,w,h,token,r=8,extra='')=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="${paint(token)}" ${extra}/>`;
const circle=(x,y,r,token,extra='')=>`<circle cx="${x}" cy="${y}" r="${r}" fill="${token==='none'?'none':paint(token)}" ${extra}/>`;
const ellipse=(x,y,rx,ry,token,extra='')=>`<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="${paint(token)}" ${extra}/>`;
const group=(id,body)=>`<g id="${id}">${body}</g>`;
const line=(d,token='ink',width=3,extra='')=>path(d,'none',`stroke="${paint(token)}" stroke-width="${width}" ${extra}`);
const glint=d=>line(d,'cream',4);
const lit=(token='science')=>state==='idle'?token:'coal';
const pipe=(d,token='rock',width=10)=>line(d,'ink',width+6)+line(d,token,width);
const post=(x,y,h,token='iron')=>rect(x,y,12,h,token,6);
// 194 + the 6 px outline = exactly 200 px; bottom outline meets y=240.
const base=()=>rect(31,225,194,12,'rock',6)+line('M42 233H214','rock-dark',5);
function scaffolding(){return group('scaffolding',post(38,78,159)+post(206,78,159)+rect(31,113,194,12,'sand',5)+rect(31,186,194,12,'sand',5)+
  line('M46 181L207 127M47 202L199 230','iron',5)+post(176,154,83,'sand')+post(196,154,83,'sand')+
  [166,186,206,226].map(y=>line(`M180 ${y}H200`,'iron',4)).join(''));}

function warpgate(){
  // The entire portal is a self-contained layer; the stationary ring masks its edge.
  const portal=circle(128,114,62,lit('deep-water'))+(state==='idle'?
    path('M78 84C111 45 184 68 185 114C181 152 142 167 114 145C88 124 107 93 134 96C153 99 156 119 143 128C158 105 127 103 123 119C119 139 154 147 167 125C187 91 130 64 98 91Z','oil-sheen','stroke="none"')+
    line('M79 123C73 86 115 64 148 80C180 96 163 137 139 136C119 135 113 117 128 110','crystal',9)+
    line('M84 139C103 166 153 168 175 134M92 85L105 79M155 91L165 102','science',5)+
    line('M88 108L101 105M149 146L162 140M133 84L139 87M103 137L108 140','snow',3)+
    circle(141,109,3,'snow','stroke="none"'): '');
  return base()+rect(37,207,182,18,'rock-dark',8)+rect(43,195,170,17,'paper',8)+
    path('M53 199L65 158H87L91 199ZM165 199L169 158H191L203 199Z','rock')+
    line('M69 188L74 174M180 187L184 175','paper',5)+
    group('portal',portal)+
    circle(128,114,74,'none',`stroke="${paint('ink')}" stroke-width="30"`)+
    circle(128,114,74,'none',`stroke="${paint('paper')}" stroke-width="24"`)+
    line('M199 99A74 74 0 0 1 115 187','rock',7)+
    glint('M63 93A69 69 0 0 1 102 50')+
    [0,60,120,180,240,300].map(a=>`<g transform="rotate(${a} 128 114)">`+
      rect(115,21,26,36,'rock-dark',9)+rect(120,26,16,25,lit('science'),6,'stroke-width="3"')+
      line('M123 33H133M123 43H133',state==='idle'?'snow':'rock-dark',3)+'</g>').join('')+
    rect(104,199,48,13,'paper',6)+rect(95,211,66,13,'paper',6)+rect(85,224,86,13,'paper',6)+
    glint('M111 203H144M102 215H154M94 228H163');
}

const definitions=[
  {id:'warpgate',draw:warpgate,part:'portal',pivot:[128,114],tags:['travel','unique']},
];
const assets=[];
for(const def of definitions)for(const mode of ['idle','construction','off']){
  state=mode;
  let body=def.draw();
  state='idle';
  if(mode==='construction')body=`<g opacity="0.4">${body}</g>${scaffolding()}`;
  const stem=def.id+(mode==='idle'?'':`-${mode}`),src=`art/src/buildings/${stem}.svg`;
  write(src,svg(body,256));
  assets.push({id:`building.${def.id}${mode==='idle'?'':'.'+mode}`,category:'buildings',src,
    out:`public/assets/sprites/buildings/${stem}.png`,viewBox:[256,256],anchor:[.5,.9375],frames:1,
    parts:[def.part,...(mode==='construction'?['scaffolding']:[])],partPivots:{[def.part]:def.pivot},
    tags:['warp',def.id,'ascension-10',...def.tags,mode],phase:'P1'});
}
write('art/manifest/warp-buildings.json',JSON.stringify({assets},null,2)+'\n');
console.log(`Warp buildings: ${definitions.length} buildings / ${assets.length} ids.`);
