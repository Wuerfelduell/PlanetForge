import { C, svg, round, write } from './common.mjs';

// Original rounded toy industry. Helpers mirror the building generator locally,
// so this independent fragment does not change any shared generator or artwork.
let state = 'idle';
const paint = (token, tone = 0) => C(state === 'off' && !['ink','coal','rock','rock-dark','snow'].includes(token)
  ? (['cream','paper','sand'].includes(token) ? 'rock' : 'rock-dark') : token, tone);
const fill = token => `fill="${paint(token)}"`;
const path = (d, token='none', extra='') => `<path d="${d}" fill="${token==='none'?'none':paint(token)}" ${extra}/>`;
const rect = (x,y,w,h,token,r=8,extra='') => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" ${fill(token)} ${extra}/>`;
const circle = (x,y,r,token,extra='') => `<circle cx="${x}" cy="${y}" r="${r}" ${fill(token)} ${extra}/>`;
const ellipse = (x,y,rx,ry,token,extra='') => `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" ${fill(token)} ${extra}/>`;
const group = (id,body,extra='') => `<g id="${id}" ${extra}>${body}</g>`;
const line = (d,token='ink',width=3) => path(d,'none',`stroke="${paint(token)}" stroke-width="${width}"`);
const glint = d => line(d,'cream',4);
const active = token => state==='idle'?token:'coal';
const base = () => rect(31,225,194,12,'rock',6)+line('M42 233H214','rock-dark',5);
const post = (x,y,h,token='iron') => rect(x,y,12,h,token,6);
const pipe = (d,token='rock',width=10) => line(d,'ink',width+6)+line(d,token,width);
const shade = (d,token,width=9) => path(d,'none',`stroke="${paint(token,-.18)}" stroke-width="${width}"`);
function scaffolding(){
  return group('scaffolding',post(38,78,159)+post(206,78,159)+rect(30,113,196,12,'sand',5)+rect(30,186,196,12,'sand',5)+
    line('M46 181L207 127M47 202L199 230','iron',5)+post(176,154,83,'sand')+post(196,154,83,'sand')+
    [166,186,206,226].map(y=>line(`M180 ${y}H200`,'iron',4)).join(''));
}

function biogas(){
  const tank=(x,y,w,h,token)=>path(`M${x} ${y+h}V${y+44}Q${x} ${y} ${x+w/2} ${y}Q${x+w} ${y} ${x+w} ${y+44}V${y+h}Z`,token)+
    shade(`M${x+w-13} ${y+43}V${y+h-13}H${x+19}`,token)+
    glint(`M${x+13} ${y+39}Q${x+14} ${y+19} ${x+32} ${y+16}`)+
    rect(x-3,y+h-13,w+6,14,'rock',7)+line(`M${x+6} ${y+55}H${x+w-6}`,'moss',4);
  return pipe('M83 127V91Q83 79 96 79H153Q165 79 165 92V133','sand',12)+
    tank(119,107,91,114,'leaf')+tank(37,122,99,99,'grass')+
    circle(83,186,13,'paper')+line('M83 186L90 179','leaf',4)+
    post(193,87,66,'rock-dark')+rect(186,83,26,12,'rock',6)+
    group('gas-flame',path('M192 78Q179 63 198 46Q195 61 205 59Q219 76 202 82Z',active('ascension'))+
      path('M198 78Q191 71 200 64Q209 76 202 78Z',active('energy'),'stroke="none"'))+
    line('M164 211L184 157','iron',6)+line('M175 179Q185 183 192 174L198 157M184 177L190 154M177 174L181 151','rock',4)+
    path('M145 225Q141 213 153 209Q152 197 165 195Q179 185 191 200Q207 199 211 214L218 225Z','iron')+
    path('M154 214Q164 201 177 202L185 211L202 213','none',`stroke="${paint('clay')}" stroke-width="6"`)+
    path('M164 202Q153 186 170 188Q180 196 164 202Z','leaf')+base();
}

const buildings = [
  {id:'biogas-plant',draw:biogas,parts:['gas-flame']},
];
const assets=[];
function emit(id,category,stem,body,size,anchor,parts=[],tags=[]){
  // All geometry stays at one decimal, including coordinates from arithmetic.
  const content=body.replace(/-?\d+\.\d{2,}/g,n=>String(round(Number(n))));
  write(`art/src/${category}/${stem}.svg`,svg(content,size));
  assets.push({id,category,src:`art/src/${category}/${stem}.svg`,out:`public/assets/sprites/${category}/${stem}.png`,viewBox:[size,size],anchor,frames:1,parts,tags,phase:'P1'});
}
for(const def of buildings){
  for(const mode of ['idle','construction','off']){
    state=mode;
    const body=def.draw();
    const content=mode==='construction'?`<g opacity="0.4">${body}</g>${scaffolding()}`:body;
    emit(`building.${def.id}${mode==='idle'?'':'.'+mode}`,'buildings',`${def.id.replaceAll('.','-')}${mode==='idle'?'':'-'+mode}`,content,256,[.5,.9375],
      [...(def.parts??[]),...(mode==='construction'?['scaffolding']:[])],[def.id,mode]);
  }
}
state='idle';
write('art/manifest/industry.json',JSON.stringify({assets},null,2)+'\n');
console.log(`Industry: ${assets.length} assets generated.`);
