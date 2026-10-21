// Original PlanetForge orbital-defense art, generated without external assets.
// Run: node scripts/assets/gen-invaders.mjs, then npm --prefix scripts/assets run assets:gen.
import {C, svg, round, write} from './common.mjs';

// Each checkpoint is independently reproducible; final release includes all seven items.
const STAGE = 3;
const assets=[];
let state='idle';
const paint=(token,tone=0)=>C(state!=='idle'&&!['ink','coal','rock','rock-dark','snow'].includes(token)
  ?(['cream','paper','sand'].includes(token)?'rock':'rock-dark'):token,tone);
const path=(d,token='none',extra='')=>`<path d="${d}" fill="${token==='none'?'none':paint(token)}" ${extra}/>`;
const rect=(x,y,w,h,token,r=8,extra='')=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="${paint(token)}" ${extra}/>`;
const circle=(x,y,r,token,extra='')=>`<circle cx="${x}" cy="${y}" r="${r}" fill="${paint(token)}" ${extra}/>`;
const ellipse=(x,y,rx,ry,token,extra='')=>`<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="${paint(token)}" ${extra}/>`;
const group=(id,body,extra='')=>`<g id="${id}" ${extra}>${body}</g>`;
const line=(d,token='ink',width=3,extra='')=>path(d,'none',`stroke="${paint(token)}" stroke-width="${width}" ${extra}`);
const glint=d=>line(d,'cream',4);
const shadow=(d,token)=>`<path d="${d}" fill="${paint(token,-.18)}" stroke="none"/>`;
const spark=(x,y,r,token='energy')=>path(`M${x} ${round(y-r)} Q${round(x+r*.2)} ${round(y-r*.2)} ${round(x+r)} ${y} Q${round(x+r*.2)} ${round(y+r*.2)} ${x} ${round(y+r)} Q${round(x-r*.2)} ${round(y+r*.2)} ${round(x-r)} ${y} Q${round(x-r*.2)} ${round(y-r*.2)} ${x} ${round(y-r)}Z`,token);
function emit({id,category,stem,size=[256,256],anchor=[.5,.5],frames=1,fps=6,parts=[],tags=[],phase='P1',meta={},draw}){
  for(let f=1;f<=frames;f++)write(`art/src/${category}/${stem}${frames>1?`-f${f}`:''}.svg`,svg(draw(f),...size,round(6*size[0]/256)));
  const name=`${stem}${frames>1?'-f{f}':''}`;
  assets.push({id,category,src:`art/src/${category}/${name}.svg`,out:`public/assets/sprites/${category}/${name}.png`,viewBox:size,anchor,frames,...(frames>1?{fps}:{}),parts,tags:['invaders',...tags],phase,...meta});
}

function battery(mode){
  state=mode;
  const light=mode==='idle'?'energy':'coal';
  const plinth=path('M31 211 Q31 190 128 190 Q225 190 225 211 V216 Q225 237 128 237 Q31 237 31 216Z','rock')+
    shadow('M218 210 V216 Q215 233 128 234 Q67 234 43 223 Q88 232 166 222Z','rock')+
    ellipse(128,207,97,22,'paper')+line('M55 215 V224 M97 225 V234 M155 225 V234 M199 214 V225','rock-dark');
  const mount=rect(83,160,90,49,'rock-dark',18)+ellipse(128,198,63,17,'rock')+
    path('M73 166 V151 Q73 118 112 118 H139 Q180 118 184 157 L187 180 Q179 197 130 197 Q80 197 73 180Z','science')+
    shadow('M170 136 Q186 156 184 180 Q169 194 131 194 H106 Q158 188 164 175Z','science')+
    glint('M85 146 Q88 131 109 130')+rect(80,168,23,13,light,6);
  // Top-level barrel group is essential: gen-parts splits before/after this group.
  const barrel=group('barrel',`<g transform="rotate(-35 128 150)">`+
    rect(116,132,94,36,'paper',12)+shadow('M125 154 H207 V160 Q207 168 195 168 H127Z','paper')+
    rect(179,129,26,42,'clay',9)+ellipse(212,150,11,24,'rock')+ellipse(215,150,5,14,'coal')+
    glint('M132 139 H165')+'</g>');
  const front=circle(128,150,23,'rock')+circle(128,150,12,'clay')+circle(122,144,3,'cream','stroke="none"')+
    [65,191].map(x=>circle(x,207,5,'rock-dark')).join('')+line('M111 181 H147','deep-water',4);
  state='idle'; // The unfinished shell is muted; scaffolding keeps its warm timber colors.
  const scaffolding=mode==='construction'?group('scaffolding',
    [40,204].map(x=>rect(x,83,12,151,'iron',6)).join('')+
    [106,166,217].map(y=>rect(34,y,188,10,'sand',5)).join('')+
    line('M52 116 L204 166 M52 166 L204 116 M52 176 L204 217','iron',5)+
    [46,210].map(x=>[111,171,222].map(y=>circle(x,y,3,'cream','stroke="none"')).join('')).join('')):'';
  const result=mode==='construction'?`<g opacity="0.4">${plinth+mount+barrel+front}</g>`+scaffolding:plinth+mount+barrel+front;
  state='idle';return result;
}
if(STAGE>=1)for(const mode of ['idle','off','construction'])emit({id:`building.battery${mode==='idle'?'':'.'+mode}`,category:'buildings',stem:`battery${mode==='idle'?'':'-'+mode}`,anchor:[.5,.9375],parts:mode==='construction'?['barrel','scaffolding']:['barrel'],tags:['battery',mode],meta:{partPivots:{barrel:[128,150]}},draw:()=>battery(mode)});

function mothership(frame=1,damaged=false){
  const shell=path('M34 133 Q40 161 71 174 Q101 184 115 178 Q127 189 140 178 Q183 182 219 144 L218 129Z','rock-dark')+
    shadow('M76 166 Q142 179 206 139 L217 145 Q189 183 140 178 Q127 189 115 178 Q94 184 76 166Z','rock-dark')+
    ellipse(128,133,108,28,'crystal')+shadow('M23 137 Q120 157 232 131 Q226 160 128 161 Q46 160 23 137Z','crystal')+
    path('M69 119 Q71 70 103 64 Q141 51 171 76 Q187 91 188 118 Q133 139 69 119Z','paper')+
    shadow('M148 67 Q180 94 170 122 L186 118 Q191 90 166 73Z','paper')+
    ellipse(128,97,38,27,'coal')+ellipse(128,96,29,21,'toxic')+
    ellipse(139,97,9,17,'deep-water')+ellipse(116,87,8,4,'cream','stroke="none"')+
    glint('M80 105 Q83 80 103 74')+glint('M38 128 Q53 120 65 120');
  const lights=group('lights',[[61,143],[103,151],[151,151],[193,143]].map(([x,y],i)=>{
    const out=damaged&&i===3, on=!out&&(damaged||i%2===(frame-1));
    return ellipse(x,y,9,5,on?'uranium':'coal')+(on?ellipse(x-2,y-1,3,1,'cream','stroke="none"'):'');
  }).join(''));
  const scars=damaged?group('cracks',line('M166 118 L159 135 L174 142 L163 154','ink',4)+
    line('M49 149 L63 155 L57 166 M151 78 L157 91 L149 104','ink',3)) : '';
  const smoke=damaged?group('smoke',
    circle(195,98,12,'rock-dark','opacity="0.8"')+circle(205,78,15,'rock','opacity="0.6"')+
    circle(217,57,18,'rock','opacity="0.4"')+circle(230,30,14,'snow','opacity="0.2"')):'';
  return smoke+group('hull',shell+lights+scars,'transform="rotate(-7 128 128)"');
}
if(STAGE>=2){
  emit({id:'invader.mothership.idle',category:'invaders',stem:'mothership-idle',frames:2,fps:3,parts:['hull','lights'],tags:['mothership','idle','loop'],draw:f=>mothership(f)});
  emit({id:'invader.mothership.damaged',category:'invaders',stem:'mothership-damaged',parts:['hull','lights','cracks','smoke'],tags:['mothership','damaged'],draw:()=>mothership(1,true)});
}

function escort(frame){
  const engine=group('engine',ellipse(32,46,frame===1?9:13,frame===1?5:8,'crystal',`opacity="${frame===1?.5:.8}"`)+
    ellipse(32,45,frame===1?5:8,frame===1?3:5,'toxic')+ellipse(30,44,3,2,'cream','stroke="none"'));
  const hull=path('M9 33 Q12 46 32 46 Q52 46 55 33Z','rock-dark')+
    ellipse(32,33,26,8,'crystal')+shadow('M7 35 Q31 42 57 32 Q56 41 32 41 Q11 41 7 35Z','crystal')+
    path('M18 29 Q18 13 31 12 Q46 12 47 29 Q31 35 18 29Z','paper')+
    shadow('M38 14 Q46 19 46 29 L41 31 Q44 23 38 14Z','paper')+
    ellipse(32,23,9,7,'coal')+ellipse(32,23,6,5,'toxic')+ellipse(35,23,2,4,'deep-water')+
    circle(29,21,1.5,'cream','stroke="none"')+
    line('M21 24 Q21 18 25 17','cream',1)+
    ellipse(14,34,2,1,'uranium','stroke-width="0.8"')+ellipse(49,34,2,1,'uranium','stroke-width="0.8"');
  return engine+group('hull',hull);
}
if(STAGE>=3)emit({id:'invader.escort',category:'invaders',stem:'escort',size:[64,64],frames:2,fps:5,parts:['hull','engine'],tags:['escort','loop'],draw:escort});

write('art/manifest/invaders.json',JSON.stringify({assets},null,2)+'\n');
console.log(`Invader art: stage ${STAGE}, ${assets.length} ids generated.`);
