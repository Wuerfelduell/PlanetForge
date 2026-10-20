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

const buildings = [
  {id:'housing',tiers:3,phase:'P0',parts:['chimney-smoke-anchor','windows'],draw:housing},
  {id:'mine',tiers:1,multi:true,phase:'P0',parts:['cart','wheel'],draw:mine},
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
