// Original toy missile defenses. No external artwork or dependencies.
// Run this script before npm --prefix scripts/assets run assets:gen.
// Local helpers follow gen-buildings/gen-weapons; shared helpers stay untouched.
import {C,svg,write} from './common.mjs';

let state='idle';
const paint=(token,tone=0)=>C(state!=='idle'&&!['ink','coal','rock','rock-dark','snow'].includes(token)
  ?(['cream','paper','sand'].includes(token)?'rock':'rock-dark'):token,tone);
const path=(d,token='none',extra='',tone=0)=>`<path d="${d}" fill="${token==='none'?'none':paint(token,tone)}" ${extra}/>`;
const rect=(x,y,w,h,token,r=8,extra='')=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="${paint(token)}" ${extra}/>`;
const circle=(x,y,r,token,extra='')=>`<circle cx="${x}" cy="${y}" r="${r}" fill="${paint(token)}" ${extra}/>`;
const ellipse=(x,y,rx,ry,token,extra='')=>`<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="${paint(token)}" ${extra}/>`;
const group=(id,body,extra='')=>`<g id="${id}" ${extra}>${body}</g>`;
const line=(d,token='ink',width=3,extra='')=>path(d,'none',`stroke="${paint(token)}" stroke-width="${width}" ${extra}`);
const glint=d=>line(d,'cream',4);
const lit=token=>state==='idle'?token:'coal';
const rivet=(x,y)=>circle(x,y,3,'rock-dark','stroke="none"');
// Outline-inclusive footprint 200 px; bottom edge exactly y=240.
const base=()=>rect(31,225,194,12,'rock',6)+line('M42 233H214','rock-dark',5);

function scaffolding(){return group('scaffolding',
  rect(38,78,12,159,'iron',6)+rect(206,78,12,159,'iron',6)+
  rect(31,113,194,12,'sand',5)+rect(31,186,194,12,'sand',5)+
  line('M50 180L206 127M50 201L198 230','iron',5)+
  rect(174,155,12,82,'sand',6)+rect(194,155,12,82,'sand',6)+
  [168,188,208,228].map(y=>line(`M180 ${y}H200`,'iron',4)).join(''));}

function missileSilo(){
  const hatchDoors=group('hatches',
    // Two broad doors stand folded away from the ground opening.
    path('M62 183L38 143Q32 130 42 120Q51 112 61 121L91 169Z','rock')+
    path('M49 124Q52 122 57 127L80 168L64 176L43 141Q39 133 49 124Z','paper','stroke="none"')+
    line('M53 138L70 167','rock-dark',3)+glint('M44 132L49 127')+
    path('M124 170L146 124Q154 111 166 121Q181 132 173 146L153 183Z','rock')+
    path('M162 126Q173 134 167 145L150 175L137 169Z','rock-dark','stroke="none"')+
    glint('M152 130L136 161')+
    rect(52,180,28,12,'rock-dark',5)+rect(137,180,27,12,'rock-dark',5));
  const back=hatchDoors+
    path('M38 192Q38 168 106 168Q174 168 174 192V208Q174 230 106 230Q38 230 38 208Z','rock')+
    ellipse(106,189,68,24,'paper')+ellipse(106,189,55,17,'coal')+
    glint('M49 184Q61 175 79 175');
  // The whole rocket moves; its lower body is masked by the foreground rim.
  const rocket=group('rocket',
    path('M87 207V151Q87 131 106 111Q125 131 125 151V207Z','snow')+
    path('M114 125Q125 140 125 151V207H114Z','glacier','stroke="none"')+
    path('M90 138Q93 130 98 124L116 139Q120 145 121 153Z','danger','stroke="none"')+
    path('M87 159L125 176V188L87 171Z','danger','stroke="none"')+
    glint('M94 145V155')+line('M94 194H106','rock',3));
  const front=
    path('M38 191Q106 220 174 191V207Q106 238 38 207Z','energy')+
    // Coal is our warm near-black; no pure-black ink or realistic warnings.
    path('M47 201L55 204L51 214L43 210ZM70 208L80 210L75 222L65 219ZM96 212H106L100 227L90 226ZM123 212L134 210L128 226L117 228ZM150 205L161 201L155 216L144 221Z','coal','stroke="none"')+
    path('M38 191Q106 220 174 191M38 207Q106 238 174 207','none')+
    line('M60 189H70M143 189H153','rock-dark',7)+
    group('control-hut',rect(174,172,43,53,'paper',12)+
      path('M171 177V169Q171 163 179 163H213Q220 163 220 169V177Z','clay')+
      rect(181,183,27,18,lit('science'),6)+rect(188,207,15,18,'iron',5)+
      line('M194 164V153','rock-dark',4)+
      group('beacon',circle(194,148,6,lit('danger'),'stroke-width="3"'))+
      glint('M180 168H202'));
  return back+rocket+front+base();
}

function sandbag(x,y,w=43){return rect(x,y,w,22,'sand',10)+
  path(`M${x+4} ${y+14}Q${x+w/2} ${y+21} ${x+w-4} ${y+13}V${y+17}Q${x+w-4} ${y+20} ${x+w-12} ${y+20}H${x+12}Z`,'sand','stroke="none"',-.18)+
  line(`M${x+w-9} ${y+6}Q${x+w-13} ${y+11} ${x+w-9} ${y+16}`,'iron',3)+
  glint(`M${x+8} ${y+6}H${x+21}`);}

function interceptorTube(x,y){return rect(x,y,18,77,'snow',8)+
  rect(x+11,y+9,5,64,'glacier',2,'stroke="none"')+
  ellipse(x+9,y+5,9,5,'paper','stroke-width="3"')+
  ellipse(x+9,y+5,4,2,'coal','stroke="none"')+
  line(`M${x+5} ${y+18}V${y+46}`,'cream',3)+
  rect(x+3,y+62,12,7,'rock',3,'stroke-width="3"');}

function missileDefense(){
  const back=ellipse(128,219,88,14,'moss')+
    sandbag(40,198,46)+sandbag(169,198,46)+
    path('M92 215L103 177H150L166 215Z','rock')+
    path('M140 179H150L162 212H147Z','rock-dark','stroke="none"')+
    ellipse(126,204,55,15,'rock-dark');
  const turret=group('turret',
    ellipse(126,180,45,14,'rock')+
    // Two rows of three canisters; all six rounded mouths stay visible.
    `<g transform="rotate(28 126 180)">`+
    [100,126,152].map(x=>interceptorTube(x,69)).join('')+
    rect(93,132,83,24,'rock-dark',8)+
    [81,107,133].map(x=>interceptorTube(x,95)).join('')+
    rect(78,153,78,13,'clay',6)+glint('M87 158H125')+
    rivet(86,159)+rivet(148,159)+'</g>'+
    circle(126,180,21,'rock-dark')+circle(126,180,13,'rock')+
    rect(117,176,18,8,lit('science'),4,'stroke-width="3"')+
    glint('M112 172Q116 165 123 165')+
    // Tracking dish rotates together with the launcher, on the left cheek.
    group('tracking-dish',line('M89 183L70 156','rock-dark',7)+
      path('M46 137Q38 163 64 171Q82 176 88 158Z','paper')+
      path('M49 143Q58 163 82 161','none',`stroke="${paint('rock')}" stroke-width="4"`)+
      line('M65 155L56 137','rock-dark',3)+circle(54,134,5,lit('science'),'stroke-width="3"')));
  // Front bags hide the pedestal's short feet, rather than the turntable.
  const front=sandbag(34,213,45)+sandbag(80,215,46)+sandbag(127,215,46)+sandbag(175,213,45);
  return back+turret+front+base();
}

const definitions=[
  {id:'missile-silo',draw:missileSilo,parts:['rocket','hatches','control-hut','beacon'],pivot:[106,207],tags:['missiles','silo']},
  {id:'missile-defense',draw:missileDefense,parts:['turret','tracking-dish'],pivot:[126,180],tags:['missiles','interceptors','defense']},
];
const assets=[];
for(const def of definitions)for(const mode of ['idle','construction','off']){
  state=mode;
  let body=def.draw();
  state='idle';
  if(mode==='construction')body=`<g opacity="0.4">${body}</g>`+scaffolding();
  const stem=def.id+(mode==='idle'?'':`-${mode}`),src=`art/src/buildings/${stem}.svg`;
  write(src,svg(body,256));
  assets.push({id:`building.${def.id}${mode==='idle'?'':'.'+mode}`,category:'buildings',src,
    out:`public/assets/sprites/buildings/${stem}.png`,viewBox:[256,256],anchor:[.5,.9375],frames:1,
    parts:[...def.parts,...(mode==='construction'?['scaffolding']:[])],partPivots:{[def.parts[0]]:def.pivot},
    tags:['war-buildings',def.id,...def.tags,mode],phase:'P1'});
}
write('art/manifest/war-buildings.json',JSON.stringify({assets},null,2)+'\n');
console.log(`War buildings: ${definitions.length} buildings, ${assets.length} ids.`);
