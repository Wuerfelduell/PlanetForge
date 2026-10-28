// Original deep-core toy architecture. Run explicitly before assets:gen.
// Shape/state/scaffolding helpers copied locally from the building/weapon generators.
import {C, svg, write} from './common.mjs';

let state='idle';
const paint=(token,tone=0)=>C(state!=='idle'&&!['ink','coal','rock','rock-dark','snow'].includes(token)
  ?(['cream','paper','sand'].includes(token)?'rock':'rock-dark'):token,tone);
const p=(d,token='none',extra='',tone=0)=>`<path d="${d}" fill="${token==='none'?'none':paint(token,tone)}" ${extra}/>`;
const rect=(x,y,w,h,token,r=8,extra='',tone=0)=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="${paint(token,tone)}" ${extra}/>`;
const circle=(x,y,r,token,extra='',tone=0)=>`<circle cx="${x}" cy="${y}" r="${r}" fill="${paint(token,tone)}" ${extra}/>`;
const ellipse=(x,y,rx,ry,token,extra='',tone=0)=>`<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="${paint(token,tone)}" ${extra}/>`;
const line=(d,token='ink',width=3,extra='')=>p(d,'none',`stroke="${paint(token)}" stroke-width="${width}" ${extra}`);
const group=(id,body)=>`<g id="${id}">${body}</g>`;
const shine=d=>line(d,'cream',4);
const lit=(token='ascension')=>state==='idle'?token:'coal';
const pipe=(d,token='rock',width=8)=>line(d,'ink',width+6)+line(d,token,width);
const base=()=>rect(31,225,194,12,'rock',6)+line('M42 233H214','rock-dark',5);
const foot=body=>body+base();
const rivet=(x,y)=>circle(x,y,4,'rock','stroke-width="3"');
const seam=d=>line(d,lit(),6)+(state==='idle'?line(d,'energy',2):'');

function scaffolding(){return group('scaffolding',rect(38,78,12,159,'iron',6)+rect(206,78,12,159,'iron',6)+
  rect(31,113,194,12,'sand',5)+rect(31,186,194,12,'sand',5)+
  line('M50 180L206 127M50 201L198 230','iron',5)+rect(174,155,12,82,'sand',6)+rect(194,155,12,82,'sand',6)+
  [168,188,208,228].map(y=>line(`M180 ${y}H200`,'iron',4)).join(''));}

function gravityCannon(){
  const ring=(x,front)=>{
    const d=front?`M${x} 199A14 43 0 0 0 ${x} 113`:`M${x} 113A14 43 0 0 0 ${x} 199`;
    return line(d,'ink',12)+line(d,'oil-sheen',6)+
      (front?line(`M${x+8} 127Q${x+14} 142 ${x+13} 151`,state==='idle'?'crystal':'rock',3):'');
  };
  return foot(
    p('M38 223L46 192Q49 179 63 179H193Q207 179 210 192L218 223Z','lava','',-.18)+
    p('M180 183H194Q205 183 207 196L214 221H183Z','iron','stroke="none"',-.18)+
    rect(76,175,102,21,'rock-dark',9)+
    p('M65 188L72 153Q76 133 96 133Q115 133 124 155L143 188Z','lava','',-.18)+
    seam('M50 213H76L85 202H106M147 204H166L174 215H205')+
    shine('M55 192H70')+rivet(55,221)+rivet(201,221)+
    // The whole aiming assembly is one top-level group; hinge and feet stay fixed.
    group('barrel',`<g transform="rotate(-25 94 159)">`+
      [113,145,177].map(x=>ring(x,false)).join('')+
      rect(80,128,99,57,'lava',19,'',-.18)+
      p('M88 162H176V174Q175 183 165 183H94Q84 183 84 174Z','iron','stroke="none"',-.18)+
      shine('M91 137H110')+line('M124 138H157','clay',4)+
      ellipse(181,156,13,28,'lava','',-.18)+ellipse(184,156,8,20,'oil')+
      [113,145,177].map(x=>ring(x,true)).join('')+
      // Air curls ahead of the short muzzle; no projectile or long ion barrel.
      (state==='idle'?p('M204 131C227 126 241 151 228 171C219 185 198 179 196 165C193 152 210 145 217 155C224 168 209 173 205 164C214 170 216 158 209 158C202 158 202 169 212 171C227 174 232 153 219 143Q211 138 204 131Z','oil-sheen','stroke="none"')+
        line('M200 145Q206 136 218 141M231 156Q232 167 224 174','crystal',3)+
        line('M203 164Q201 154 211 153Q220 154 217 163','space',5):'')+
      '</g>')+
    circle(94,159,23,'rock-dark')+circle(94,159,14,'lava','',-.18)+
    circle(94,159,6,lit())+shine('M79 152Q82 145 89 144')+
    rect(108,204,33,17,'coal',6)+line('M116 212H133',lit(),4));
}

// Same rounded point-up die as shell-armor. sun.shield.segment.built currently
// renders an annular segment, so the workshop hexagon follows that established convention.
function corePlate(){return group('plate',
  `<g transform="translate(115 174) scale(1.2)" stroke-width="5">`+
  p('M-5 -25Q0 -28 5 -25L21 -16Q25 -14 25 -8V8Q25 14 21 16L5 25Q0 28 -5 25L-21 16Q-25 14 -25 8V-8Q-25 -14 -21 -16Z','lava','',-.18)+
  p('M2 -20L18 -11V10L2 21Z','iron','stroke="none"',-.18)+
  line('M-18 9V-10L0 -21L18 -10V10L0 21Z',lit(),3)+
  line('M-15 -9L-5 -3L-8 6L4 11L2 19M-5 -3L5 -8L13 -4',lit(),3)+
  (state==='idle'?line('M-16 -10L0 -20M-5 -2L-8 5','energy',2):'')+
  circle(-15,8,2,'rock','stroke="none"')+circle(13,8,2,'rock','stroke="none"')+'</g>');}

function coreArmor(){return foot(
  // Broad warm forge with a low square canopy; the blue armor hangar is tall/arched.
  '<g transform="translate(28 0)">'+
  rect(40,117,144,108,'lava',16,'',-.18)+
  p('M164 125H180V221H164Z','iron','stroke="none"',-.18)+
  rect(73,129,85,96,'coal',12)+
  rect(47,82,24,38,'rock-dark',8)+rect(41,77,36,13,'rock',6)+
  pipe('M165 126V98H179','rock',7)+
  group('vents',state==='idle'?
    line('M55 70Q43 62 55 53Q65 46 56 38M172 86Q159 77 170 67','snow',7):'')+
  rect(34,108,156,23,'lava',9,'',-.18)+rect(49,101,128,10,'iron',5)+
  shine('M46 116H73M54 88V98')+rivet(45,120)+rivet(179,120)+
  // A compact ram over an unmistakable horned anvil holds the cooling plate.
  rect(102,128,27,16,'rock',6)+rect(91,139,49,11,'rock-dark',5)+
  p('M77 201H155L145 214H132L137 225H94L99 214H84L69 204Q68 201 77 201Z','rock')+
  line('M84 208H145','rock-dark',3)+shine('M81 205H100')+
  corePlate()+
  rect(47,149,20,56,'iron',8)+line('M53 160H61M53 173H61M53 186H61','coal',4)+
  seam('M49 216H61L65 207M160 211L169 204L174 214')+
  '</g><g transform="translate(256 0) scale(-1 1)">'+
  // Delivery rises on the LEFT, opposite the tall blue workshop's right-hand rail.
  p('M179 224L202 132Q204 125 211 129L221 135L198 224Z','rock-dark')+
  line('M184 215L206 139M195 216L216 142','paper',4)+
  line('M191 188L203 191M197 162L209 165','rock',5)+
  rect(178,216,32,9,'rock',4)+
  p('M197 133L206 118Q209 114 213 119L225 135Z','iron')+
  line('M213 127L217 132','cream',4)+'</g>');
}

const definitions=[
  {id:'gravity-cannon',draw:gravityCannon,parts:['barrel'],pivot:[94,159],tags:['defense','core-iron','gravity']},
  {id:'core-armor',draw:coreArmor,parts:['plate','vents'],tags:['industry','core-iron','sun-shield']},
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
    parts:[...def.parts,...(mode==='construction'?['scaffolding']:[])],tags:['core-buildings2',...def.tags,mode],phase:'P1',
    ...(def.pivot?{partPivots:{[def.parts[0]]:def.pivot}}:{})});
}
write('art/manifest/core-buildings2.json',JSON.stringify({assets},null,2)+'\n');
console.log(`Core buildings 2: ${definitions.length} buildings, ${assets.length} ids.`);
