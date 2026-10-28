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

function steamPuff(x,y){return `<g transform="translate(${x} ${y})">`+
  p('M-15 15Q-28 14 -27 4Q-27 -5 -18 -8Q-19 -22 -6 -23Q5 -25 10 -15Q24 -18 27 -6Q35 1 27 11Q24 18 10 16Z','snow')+
  p('M-24 5Q-15 13 -4 8Q9 15 24 4Q31 4 26 11Q22 17 10 14L-14 13Q-23 13 -24 5Z','glacier','stroke="none"')+
  line('M-16 -7Q-14 -15 -7 -15','cream',4)+'</g>';}

function geothermal(){
  // A flat plant on an exposed magma puddle, not a reactor dome or glass sphere.
  // The puddle itself is the 200 px footprint; its outlined bottom is exactly y=240.
  const pool=ellipse(128,224,97,13,'lava')+
    ellipse(126,222,86,8,state==='idle'?'ascension':'rock-dark','stroke="none"')+
    line('M48 223Q65 214 83 221M91 230Q111 223 133 229M166 228Q187 221 207 224',lit('energy'),3);
  return pool+
    // Top-level part for steam drift; pivot is midway between stack bases at y=142.
    group('steam',state==='idle'?steamPuff(82,69)+steamPuff(169,77)+
      line('M82 93V98M169 101V106','snow',6):'')+
    rect(66,98,32,44,'rock-dark',10)+rect(153,106,32,36,'rock-dark',10)+
    rect(61,96,42,13,'snow',6)+rect(148,104,42,13,'snow',6)+
    line('M74 115V130M161 122V130','rock',5)+
    rect(62,199,27,27,'rock-dark',8)+rect(167,199,27,27,'rock-dark',8)+
    rect(57,139,142,77,'paper',19)+
    p('M182 146Q197 149 196 163V200Q196 212 180 213H76V205H176Q183 205 183 197Z','paper','stroke="none"',-.18)+
    rect(49,132,158,17,'iron',8)+shine('M60 138H95M65 158V169')+
    line('M68 186H82M68 196H82M173 163H187M173 174H187','rock-dark',4)+
    circle(128,179,34,'rock-dark')+circle(128,179,27,'coal')+
    group('heat-core',
      (state==='idle'?circle(128,179,23,'ascension','stroke="none" opacity="0.2"'):'')+
      // Flame-like double tip remains a faceted orange-red crystal, not a flame decal.
      p('M115 194L110 179L119 164L126 170L133 155L145 176L139 195L127 201Z',lit('lava'),'stroke-width="3"')+
      p('M133 158L130 180L119 193L114 179L119 168L126 175Z',lit('ascension'),'stroke="none"')+
      p('M130 180L140 178L136 192L127 198Z',lit('energy'),'stroke="none"')+
      (state==='idle'?line('M119 176L121 173','cream',3):''))+
    rivet(128,149)+rivet(98,179)+rivet(158,179)+rivet(128,209)+
    // Both intake pipes visibly terminate below the molten surface.
    pipe('M69 180H52Q43 180 43 191V225','rock',10)+
    pipe('M188 189H205Q214 189 214 201V225','rock',10)+
    rect(36,204,14,9,'rock-dark',4)+rect(207,208,14,9,'rock-dark',4)+
    line('M40 190V200M211 201V205','snow',3)+
    line('M37 227Q43 231 51 227M206 228Q214 232 221 227',lit('energy'),3);
}

const definitions=[
  {id:'gravity-cannon',draw:gravityCannon,parts:['barrel'],pivot:[94,159],tags:['defense','core-iron','gravity']},
  {id:'core-armor',draw:coreArmor,parts:['plate','vents'],tags:['industry','core-iron','sun-shield']},
  {id:'power-geothermal',draw:geothermal,parts:['steam','heat-core'],pivot:[128,142],tags:['power','magma','ember-crystal']},
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
