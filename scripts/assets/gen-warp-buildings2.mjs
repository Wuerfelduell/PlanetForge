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

// Rounded point-up hexagon: orbital shield rim/rivets and crystal inset,
// adapted to the requested workshop die. The current sun shield is annular.
function armorPlate(x,y,scale=1){
  return `<g transform="translate(${x} ${y}) scale(${scale})">`+
    path('M-5 -25Q0 -28 5 -25L21 -16Q25 -14 25 -8V8Q25 14 21 16L5 25Q0 28 -5 25L-21 16Q-25 14 -25 8V-8Q-25 -14 -21 -16Z','space-deep')+
    path('M2 -20L18 -11V10L2 21Z','deep-water','stroke="none"',-.18)+
    rim('M-18 -8V-11L0 -21L12 -14')+
    path('M0 -9L7 0L0 9L-7 0Z',lit('crystal'),'stroke-width="3"')+
    circle(-14,6,3,'snow','stroke-width="2"')+circle(13,9,3,'rock','stroke-width="2"')+'</g>';
}

function shellArmor(){
  const back=
    // A short open hangar, asymmetrical beside its rising delivery rail.
    path('M36 224V113Q36 75 74 75H126Q164 75 164 113V224Z','paper')+
    path('M139 86Q160 94 160 117V222H144V112Z','rock','stroke="none"')+
    path('M54 222V117Q54 96 75 96H126Q146 96 146 117V222Z','coal')+
    rect(41,78,118,22,'rock',9)+rim('M52 85H123')+
    rect(42,105,15,113,'clay',7)+rect(139,105,15,113,'clay',7)+
    line('M48 114V145M145 114V145','paper',3)+
    [51,148].map(x=>rivet(x,89)).join('')+
    rect(68,193,64,30,'rock-dark',9)+rect(62,187,77,13,'rock',6)+
    // Twin rail channels point outwards/upwards, not along the ground.
    path('M160 224L202 103Q204 97 210 100L222 106L181 224Z','rock-dark')+
    line('M168 216L207 109M180 216L218 111','snow',4)+
    line('M180 192L190 197M189 166L199 171M198 140L208 145','rock',5)+
    path('M196 112L205 98Q208 93 213 98L223 108Z','clay')+
    line('M204 105L209 102','cream',3)+
    path('M182 222V204L193 202L205 222Z','rock')+
    group('finished-plates',armorPlate(173,193,.6)+armorPlate(179,180,.6)+armorPlate(185,167,.6));
  // Only the ram and upper die move. Top-level group supports gen-parts slicing.
  const press=group('press',rect(88,101,26,31,'rock',8)+
    line('M95 107V121','snow',4)+rect(73,130,56,22,'clay',8)+
    rect(80,149,42,10,'space-deep',5)+rim('M82 136H111')+
    line('M119 138V144','iron',4));
  const front=group('plate',armorPlate(101,178))+
    rect(60,211,80,13,'rock',6)+
    rect(38,161,27,39,'clay',8)+rect(43,168,17,10,lit('science'),4,'stroke-width="3"')+
    circle(52,189,3,'rock-dark','stroke="none"')+
    line('M81 217H91M111 217H121','rock-dark',3);
  // Foundation follows the moving part, so it stays in the foreground slice.
  return foot(back+press+front);
}

const definitions = [
  {id:'neutron-bastion',draw:neutronBastion,parts:['sensor'],tags:['defense','neutronium']},
  {id:'shell-armor',draw:shellArmor,parts:['press','plate','finished-plates'],pivot:[101,101],tags:['industry','neutronium','sun-shield']},
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
