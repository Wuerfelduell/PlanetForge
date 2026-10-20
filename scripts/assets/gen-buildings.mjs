import { C, svg, round, write } from './common.mjs';

// Original toy architecture. Every material/state is resolved through the palette.
// Geometry stays identical in the off state; no SVG filters are needed.
let state = 'idle';
const paint = (token, tone = 0) => C(state === 'off' && !['ink', 'coal', 'rock', 'rock-dark', 'snow'].includes(token)
  ? (['cream', 'paper', 'sand'].includes(token) ? 'rock' : 'rock-dark') : token, tone);
const fill = (token, tone = 0) => `fill="${paint(token, tone)}"`;
const path = (d, token = 'none', extra = '') => `<path d="${d}" ${token === 'none' ? 'fill="none"' : fill(token)} ${extra}/>`;
const rect = (x,y,w,h,token,r=8,extra='') => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" ${fill(token)} ${extra}/>`;
const circle = (x,y,r,token,extra='') => `<circle cx="${x}" cy="${y}" r="${r}" ${fill(token)} ${extra}/>`;
const ellipse = (x,y,rx,ry,token,extra='') => `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" ${fill(token)} ${extra}/>`;
const group = (id, body, extra='') => `<g id="${id}" ${extra}>${body}</g>`;
const line = (d, token='ink', width=3) => path(d,'none',`stroke="${paint(token)}" stroke-width="${width}"`);
const lit = () => state === 'idle' ? 'energy' : 'coal';
const glint = d => line(d,'cream',4);
const base = () => rect(31,225,194,12,'rock',6)+path('M42 233H214','none',`stroke="${paint('rock-dark')}" stroke-width="5"`);
const windowPane = (x,y,w=24,h=28) => rect(x,y,w,h,lit(),8)+line(`M${x+w/2} ${y+3}V${y+h-3}`,'clay');
const door = (x=112,y=185,w=32,h=40) => rect(x,y,w,h,'iron',12)+circle(x+w-9,y+h/2,2,'cream','stroke="none"');
const foot = body => body+base();
const post = (x,y,h,token='iron') => rect(x,y,12,h,token,6);
const anchor = (id,x,y) => group(id,'',`transform="translate(${x} ${y})"`);
const leaf = (x,y,s=1) => `<g transform="translate(${x} ${y}) scale(${s})">${path('M0 0Q-22 -30 4 -34Q22 -16 0 0Z','leaf')}${line('M0 -4L4 -25','moss')}</g>`;
const roof = (y,token='clay') => path(`M36 ${y+30}Q28 ${y+24} 40 ${y+14}L108 ${y-28}Q128 ${y-42} 148 ${y-28}L216 ${y+14}Q228 ${y+24} 220 ${y+30}Q128 ${y+46} 36 ${y+30}Z`,token)+glint(`M53 ${y+15}L112 ${y-20}`);
const crate = (x,y,s=34) => rect(x,y,s,s,'sand',7)+line(`M${x+6} ${y+6}L${x+s-6} ${y+s-6}M${x+s-6} ${y+6}L${x+6} ${y+s-6}`,'iron',4);

function housing(tier){
  if(tier===3){
    const pods=[{x:62,y:151,w:132,c:'clay'},{x:81,y:94,w:113,c:'sand'},{x:62,y:37,w:132,c:'paper'}];
    return foot(post(167,18,40,'rock')+anchor('chimney-smoke-anchor',173,18)+pods.map(p=>
      rect(p.x,p.y,p.w,70,p.c,26)+path(`M${p.x+p.w-18} ${p.y+16}Q${p.x+p.w} ${p.y+63} ${p.x+p.w-24} ${p.y+64}H${p.x+20}`,'none',`stroke="${paint(p.c,-.18)}" stroke-width="9"`)+glint(`M${p.x+16} ${p.y+17}H${p.x+48}`)).join('')+
      group('windows',[[83,56],[139,56],[99,113],[153,113],[79,172],[159,172]].map(([x,y])=>windowPane(x,y,20,24)).join(''))+door(114,184,31,41));
  }
  const chimney=tier===2?rect(170,55,25,77,'iron',9)+rect(164,49,37,15,'clay',7):'';
  return foot(chimney+anchor('chimney-smoke-anchor',182,tier===2?49:88)+rect(52,129,152,100,tier===1?'paper':'clay',34)+
    path('M190 148V199Q190 219 165 219H77','none',`stroke="${paint(tier===1?'paper':'clay',-.18)}" stroke-width="10"`)+
    roof(tier===1?111:97,tier===1?'leaf':'clay')+(tier===1?line('M89 97L78 132M127 87V132M163 99L177 131','grass',5):rect(108,92,40,34,'paper',10))+
    group('windows',windowPane(68,158)+windowPane(165,158)+(tier===2?windowPane(117,101,22,20):''))+door(110,179,36,47));
}

function mine(tier){
  const frame=tier===1?'iron':'rock';
  return foot(path('M34 224Q31 152 59 117Q90 77 137 95Q196 91 220 170L224 225Z','rock')+
    path('M143 107Q201 119 208 209H191','none',`stroke="${paint('rock-dark')}" stroke-width="14"`)+
    path('M65 221V165Q65 128 105 128Q144 128 144 165V221Z','coal')+
    post(58,140,83,frame)+post(139,140,83,frame)+rect(52,130,105,20,frame,7)+
    glint('M64 135H133')+line('M61 221L49 233M143 221L151 233','rock-dark',5)+
    (tier===2?rect(155,164,59,19,'rock-dark',9)+[165,184,203].map(x=>circle(x,173,4,'cream')).join('')+path('M163 160L170 143L183 153L197 141L207 161Z','iron'):'')+
    group('cart',path('M76 177L135 177L127 207H85Z','clay')+path('M82 176L94 158L108 170L121 156L132 177Z','iron')+
      group('wheel',circle(91,211,8,'rock-dark')+circle(122,211,8,'rock-dark'))));
}

function pump(tier){
  if(tier===1)return foot(ellipse(127,215,55,12,'water')+rect(111,130,29,86,'science',12)+
    path('M113 157H88Q76 157 76 170V184','none',`stroke="${paint('ink')}" stroke-width="18"`)+
    path('M113 157H88Q76 157 76 170V184','none',`stroke="${paint('science')}" stroke-width="10"`)+
    group('pump-arm',path('M125 133V100Q125 91 138 91H183','none',`stroke="${paint('ink')}" stroke-width="16"`)+
      path('M125 133V100Q125 91 138 91H183','none',`stroke="${paint('iron')}" stroke-width="9"`)+circle(126,133,9,'sand'))+
    glint('M118 172V197')+path('M76 190Q62 205 76 209Q90 205 76 190Z','water'));
  return foot(path('M80 225L114 99H146L180 225H156L130 143L104 225Z','science')+
    line('M103 183H156M111 156H146','deep-water',5)+post(193,101,123,'rock')+
    group('pump-arm',path('M65 78Q118 65 177 83L205 74L215 112L195 121L181 101Q116 86 68 101Z','clay')+
      circle(130,90,13,'sand')+glint('M80 83Q105 77 116 79'))+rect(56,199,46,25,'iron',10)+circle(78,211,7,'rock-dark'));
}

function sprout(x,y){return leaf(x,y,.6)+leaf(x+8,y,.5)+circle(x-5,y-10,6,'danger')+circle(x+6,y-8,6,'clay');}
function farm(tier){
  const rows=[185,211].map(y=>rect(40,y,176,15,'iron',7)+[62,105,148,191].map(x=>sprout(x,y)).join('')).join('');
  if(tier===1)return foot(rect(151,120,54,58,'paper',9)+path('M140 123L176 87L216 122Z','clay')+door(170,141,20,34)+rows);
  return foot(path('M39 222V125Q39 64 128 64Q217 64 217 125V222Z','science')+
    path('M191 97Q209 121 209 211H199','none',`stroke="${paint('deep-water')}" stroke-width="9"`)+rows+
    path('M42 127H213M128 67V220M84 73Q72 103 73 149M172 73Q184 104 184 149','none',`stroke="${paint('cream')}" stroke-width="7"`)+
    glint('M51 122Q49 89 76 84')+rect(108,153,41,71,'snow',10)+line('M128 164V213','science',4));
}

function foundry(tier){
  const y=tier===1?82:51;
  return foot(rect(158,y,37,130,'iron',9)+rect(150,y-8,53,19,'clay',7)+anchor('smoke-anchor',177,y-8)+
    (tier===2?rect(57,100,34,119,'rock',9)+rect(51,93,46,17,'rock-dark',7):'')+
    rect(51,147,154,78,'clay',22)+path('M186 157V202Q186 215 173 215H72','none',`stroke="${paint('iron')}" stroke-width="10"`)+
    line('M64 171H88M174 176H194M161 112H190M161 133H190','iron',4)+
    path('M88 223V193Q88 164 126 164Q164 164 164 193V223Z','coal')+
    group('glow',path('M101 220Q96 202 111 190L123 201Q138 175 142 190Q160 214 149 220Z',state==='idle'?'ascension':'coal')+
      path('M117 220Q110 210 127 201Q142 216 134 220Z',lit()))+
    rect(87,219,79,8,'rock-dark',4)+glint(`M165 ${y+20}V${y+43}`));
}

function lab(tier){
  const y=tier===1?133:114;
  return foot(rect(53,y,150,94,'paper',28)+path(`M190 ${y+18}V204Q190 217 171 217H78`,'none',`stroke="${paint('paper',-.18)}" stroke-width="10"`)+
    group('dome',path(`M46 ${y}Q47 ${y-67} 128 ${y-67}Q207 ${y-67} 210 ${y}Z`,'science')+
      path(`M128 ${y-66}Q163 ${y-42} 159 ${y}`,'none',`stroke="${paint('deep-water')}" stroke-width="8"`)+
      glint(`M61 ${y-16}Q66 ${y-43} 94 ${y-49}`)+rect(42,y-1,172,15,'rock',7))+
    line(`M171 ${y-48}L193 ${y-84}`,'rock-dark',6)+group('antenna-light',circle(195,y-87,10,state==='idle'?'danger':'coal'))+
    (tier===2?path('M61 153Q26 146 39 117L75 139Z','cream')+line('M59 154V180','rock-dark',7)+circle(41,125,5,'crystal'):'')+
    windowPane(73,174,30,28)+windowPane(153,174,30,28)+door(113,184,30,41));
}

function launchpad(){return foot(post(42,54,169,'rock')+post(85,54,169,'rock')+
  line('M54 72L85 107L54 142L85 177L54 211M54 107H85M54 177H85','rock-dark',6)+
  rect(35,46,68,20,'clay',8)+rect(91,95,60,16,'rock',7)+
  rect(107,195,93,22,'rock-dark',10)+rect(95,211,117,14,'paper',7)+
  [114,142,170,198].map(x=>rect(x,216,8,7,'ascension',3,'stroke="none"')).join('')+glint('M40 51H86'));}

function rocket(tier,variant,big=false){
  const fins=big?path('M91 123Q48 151 41 224Q60 222 86 203Z','crystal')+path('M165 123Q208 151 215 224Q196 222 170 203Z','crystal'):
    path('M91 157Q62 171 59 231L92 212Z','clay')+path('M165 157Q194 171 197 231L164 212Z','clay');
  return fins+path('M102 205H154L161 236Q128 240 95 236Z','rock-dark')+
    path(`M88 201V${big?91:106}Q88 59 128 ${big?18:34}Q168 59 168 ${big?91:106}V201Q128 220 88 201Z`,'cream')+
    path(`M128 ${big?18:34}Q151 40 161 ${big?67:80}Q128 95 95 ${big?67:80}Q105 44 128 ${big?18:34}Z`,big?'crystal':'clay')+
    path('M157 104V192Q153 201 142 203','none',`stroke="${paint('paper')}" stroke-width="11"`)+
    circle(128,121,24,'rock-dark')+circle(128,121,17,'science')+glint('M117 120Q117 111 127 111')+
    (big?path('M128 159L144 180L128 210L112 180Z','crystal'):rect(115,178,26,24,'clay',9))+
    glint('M99 147V174')+anchor('flame-anchor',128,240);
}

const buildings = [
  {id:'housing',tiers:3,phase:'P0',parts:['chimney-smoke-anchor','windows'],draw:housing},
  {id:'mine',tiers:2,phase:'P0',parts:['cart','wheel'],draw:mine},
  {id:'pump',tiers:2,phase:'P0',parts:['pump-arm'],draw:pump},
  {id:'farm',tiers:2,phase:'P0',draw:farm},
  {id:'foundry',tiers:2,phase:'P0',parts:['glow','smoke-anchor'],draw:foundry},
  {id:'lab',tiers:2,phase:'P0',parts:['dome','antenna-light'],draw:lab},
  {id:'launchpad',tiers:1,phase:'P0',draw:launchpad},
  {id:'rocket-small',tiers:1,phase:'P0',parts:['flame-anchor'],draw:rocket},
];

function scaffolding(){
  return group('scaffolding',post(38,78,159)+post(206,78,159)+rect(30,113,196,12,'sand',5)+rect(30,186,196,12,'sand',5)+
    line('M46 181L207 127M47 202L199 230','iron',5)+post(176,154,83,'sand')+post(196,154,83,'sand')+
    [166,186,206,226].map(y=>line(`M180 ${y}H200`,'iron',4)).join(''));
}

const assets=[];
for(const def of buildings){
  for(let tier=1;tier<=def.tiers;tier++){
    for(const variant of def.variants??['']){
      for(const mode of ['idle','construction','off']){
        state=mode;
        const tiered=def.tiers>1||def.multi;
        const id=`building.${def.id}${tiered?`.t${tier}`:''}${variant?`.${variant}`:''}${mode==='idle'?'':`.${mode}`}`;
        const stem=`${def.id}${tiered?`-t${tier}`:''}${variant?`-${variant}`:''}${mode==='idle'?'':`-${mode}`}`;
        const body=def.draw(tier,variant);
        const content=mode==='construction'?`<g opacity="0.4">${body}</g>${scaffolding()}`:body;
        write(`art/src/buildings/${stem}.svg`,svg(content,256));
        assets.push({id,category:'buildings',src:`art/src/buildings/${stem}.svg`,out:`public/assets/sprites/buildings/${stem}.png`,viewBox:[256,256],anchor:[.5,.9375],frames:1,parts:[...(def.parts??[]),...(mode==='construction'?['scaffolding']:[])],tags:[def.id,...(tiered?[`tier${tier}`]:[]),...(variant?[variant]:[]),mode],phase:def.phase});
      }
    }
  }
}
write('art/manifest/buildings.json',JSON.stringify({assets},null,2)+'\n');
console.log(`Buildings: ${assets.length} assets generated.`);
