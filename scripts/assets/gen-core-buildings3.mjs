// Original deep-quartz architecture. Run this file before assets:gen.
// Local shape/state helpers follow the existing building generators.
import {C, svg, write} from './common.mjs';

let state = 'idle';
const paint = (token, tone = 0) => {
  if(state !== 'idle') {
    if(['snow','tint-white','glacier'].includes(token)) return C('rock', .18);
    if(['cream','paper'].includes(token)) return C('rock', tone);
    if(!['ink','coal','rock','rock-dark'].includes(token)) return C('rock-dark', tone);
  }
  return C(token, tone);
};
const path = (d, token='none', extra='', tone=0) => `<path d="${d}" fill="${token==='none'?'none':paint(token,tone)}" ${extra}/>`;
const rect = (x,y,w,h,token,r=8,extra='') => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="${paint(token)}" ${extra}/>`;
const ellipse = (x,y,rx,ry,token,extra='') => `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="${token==='none'?'none':paint(token)}" ${extra}/>`;
const circle = (x,y,r,token,extra='') => `<circle cx="${x}" cy="${y}" r="${r}" fill="${paint(token)}" ${extra}/>`;
const group = (id,body) => `<g id="${id}">${body}</g>`;
const line = (d,token='ink',width=3,extra='') => path(d,'none',`stroke="${paint(token)}" stroke-width="${width}" ${extra}`);
const lit = token => state==='idle'?token:'coal';
const glint = d => line(d,'snow',4);
// Including the 6 px outline: x=28..228, bottom exactly y=240.
const base = () => rect(31,225,194,12,'rock',6)+line('M42 233H214','rock-dark',5);
const pipe = (d,token,width=10) => line(d,'ink',width+6)+line(d,token,width);

function scaffolding(){
  return group('scaffolding',rect(38,57,12,180,'iron',6)+rect(206,57,12,180,'iron',6)+
    rect(31,91,194,12,'sand',5)+rect(31,179,194,12,'sand',5)+
    line('M50 173L206 108M50 197L164 231','iron',5)+
    rect(174,155,12,82,'sand',6)+rect(194,155,12,82,'sand',6)+
    [168,188,208,228].map(y=>line(`M180 ${y}H200`,'iron',4)).join(''));
}

function quantumLab(){
  const shell =
    // Low swept white wings support a tall transparent bell, without an antenna.
    path('M39 224V186Q39 173 51 166L82 146H174L205 166Q217 173 217 186V224Z','snow')+
    path('M176 151L205 171Q212 176 212 187V221H185V183Z','glacier','stroke="none"')+
    glint('M49 188V181L68 168')+
    path('M66 158V94Q66 36 128 36Q190 36 190 94V158Z','glacier')+
    path('M160 45Q187 62 187 94V155H174V91Q174 62 160 45Z','science','stroke="none" opacity="0.4"')+
    rect(62,152,132,18,'rock',8)+glint('M72 158H111')+
    // The pale quartz stays in the back slice when the rings rotate.
    (state==='idle'?ellipse(128,108,26,37,'tint-white','stroke="none" opacity="0.3"'):'')+
    path('M124 77Q128 72 132 77L146 99Q148 103 146 108L132 139Q128 145 124 139L110 108Q108 103 110 99Z','glacier')+
    path('M128 77L126 104L113 103Z','snow','stroke="none"')+
    path('M128 77L143 102L126 104L128 140Z','glacier','stroke="none"')+
    path('M126 104L143 102L128 140Z','science','stroke="none" opacity="0.3"')+
    (state==='idle'?path('M127 87L133 103L127 127L120 105Z','tint-white','stroke="none"'):
      line('M126 90L120 103','rock',3));
  const rings = group('rings',[-34,34].map((a,i)=>
    ellipse(128,108,49,18,'none',`transform="rotate(${a} 128 108)" stroke="${paint('ink')}" stroke-width="10"`)+
    ellipse(128,108,49,18,'none',`transform="rotate(${a} 128 108)" stroke="${paint(lit(i?'crystal':'science'))}" stroke-width="4"`)+
    `<g transform="rotate(${a} 128 108)">${circle(i?79:177,108,5,lit('snow'),'stroke-width="3"')}</g>`).join(''));
  const front =
    // Reflections are on the fixed glass layer; the moving part has no glass.
    glint('M77 85Q78 59 101 51M76 97V117')+
    line('M180 119V143','science',3)+
    rect(57,167,142,18,'snow',8)+line('M72 178H112M145 178H184','glacier',4)+
    group('panels',[[61,192,30],[165,192,30]].map(([x,y,w])=>
      rect(x,y,w,20,'rock-dark',7)+rect(x+5,y+5,w-10,10,lit('science'),4,'stroke="none"')+
      (state==='idle'?line(`M${x+9} ${y+8}H${x+17}`,'tint-white',2):'')).join('')+
      circle(99,202,3,lit('crystal'),'stroke="none"')+circle(157,202,3,lit('science'),'stroke="none"'))+
    rect(111,187,34,38,'rock-dark',11)+rect(116,192,24,33,'snow',8,'stroke-width="3"')+
    line('M128 197V220','rock',3)+
    line('M51 219H91M165 219H205','glacier',4)+base();
  return shell+rings+front;
}

const definitions = [
  {id:'quantum-lab',draw:quantumLab,parts:['rings','panels'],part:'rings',pivot:[128,108],tags:['science','quantum']},
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
    parts:[...def.parts,...(mode==='construction'?['scaffolding']:[])],partPivots:{[def.part]:def.pivot},
    tags:['core-buildings3',def.id,'deep-quartz',...def.tags,mode],phase:'P1'});
}
write('art/manifest/core-buildings3.json',JSON.stringify({assets},null,2)+'\n');
console.log(`Core buildings 3: ${definitions.length} buildings / ${assets.length} ids.`);
