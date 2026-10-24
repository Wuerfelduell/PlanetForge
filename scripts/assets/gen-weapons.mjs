// Original PlanetForge defense art. Run this generator before assets:gen.
// Helpers intentionally copied from the building/gem generators; shared code stays untouched.
import { C, svg, round, write } from './common.mjs';
let state='idle';
const paint=(token,tone=0)=>C(state==='off'&&!['ink','coal','rock','rock-dark','snow'].includes(token)
  ?(['cream','paper','sand'].includes(token)?'rock':'rock-dark'):token,tone);
const path=(d,token='none',extra='',tone=0)=>`<path d="${d}" fill="${token==='none'?'none':paint(token,tone)}" ${extra}/>`;
const rect=(x,y,w,h,token,r=8,extra='')=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="${paint(token)}" ${extra}/>`;
const circle=(x,y,r,token,extra='')=>`<circle cx="${x}" cy="${y}" r="${r}" fill="${paint(token)}" ${extra}/>`;
const ellipse=(x,y,rx,ry,token,extra='')=>`<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="${paint(token)}" ${extra}/>`;
const group=(id,body,extra='')=>`<g id="${id}" ${extra}>${body}</g>`;
const line=(d,token='ink',width=3,extra='')=>path(d,'none',`stroke="${paint(token)}" stroke-width="${width}" ${extra}`);
const glint=d=>line(d,'cream',4);
const lit=(token='energy')=>state==='idle'?token:'coal';
const post=(x,y,h,token='iron')=>rect(x,y,12,h,token,6);
const base=()=>rect(31,225,194,12,'rock',6)+line('M42 233H214','rock-dark',5);
const foot=body=>body+base();
const pipe=(d,token='rock',width=10)=>line(d,'ink',width+6)+line(d,token,width);
const leaf=(x,y,rotation=0)=>`<g transform="translate(${x} ${y}) rotate(${rotation})">${path('M-14 4Q-17-11 10-13Q19 10-14 4Z','leaf')}${line('M-12 3L9-10','grass',3)}</g>`;
function scaffolding(){return group('scaffolding',post(38,78,159)+post(206,78,159)+rect(30,113,196,12,'sand',5)+rect(30,186,196,12,'sand',5)+
  line('M46 181L207 127M47 202L199 230','iron',5)+post(176,154,83,'sand')+post(196,154,83,'sand')+
  [166,186,206,226].map(y=>line(`M180 ${y}H200`,'iron',4)).join(''));}
function pitfall(){
 return ellipse(128,212,97,25,'moss')+
  path('M33 215Q73 238 153 229Q199 226 223 210Q226 236 128 237Q45 237 33 215Z','moss','stroke="none"',-.18)+
  ellipse(128,205,82,20,'coal')+ellipse(145,210,54,12,'ink','stroke="none"')+
  group('camouflage',pipe('M51 190L133 213M57 204L117 225M76 184L61 216M102 187L90 221M127 194L118 225','iron',4)+
    leaf(63,188,-12)+leaf(89,190,18)+leaf(112,198,48)+leaf(71,211,160)+leaf(103,219,160))+
  [[46,188],[191,187],[62,216]].map(([x,y])=>path(`M${x} ${y+18}V${y-9}Q${x+5} ${y-18} ${x+10} ${y-9}V${y+18}Z`,'iron')+glint(`M${x+3} ${y-4}V${y+8}`)).join('')+
  group('flag',line('M205 219V140','ink',6)+path('M205 143Q214 138 226 145L221 156L227 169Q214 163 205 167Z','ascension')+path('M215 148L221 154L215 160L210 154Z','coal','stroke="none"'))+
  glint('M42 210Q49 221 66 223')+leaf(171,224,145);
}
const flag=(x,y,token='danger')=>line(`M${x} ${y+67}V${y}`,'rock-dark',5)+path(`M${x+2} ${y+3}Q${x+16} ${y-4} ${x+30} ${y+6}L${x+24} ${y+17}L${x+31} ${y+28}Q${x+16} ${y+19} ${x+2} ${y+27}Z`,token);
const target=(x,y,r)=>post(x-6,y+8,225-y-8,'iron')+circle(x,y,r,'paper')+circle(x,y,round(r*.6),'danger')+circle(x,y,round(r*.2),'paper','stroke="none"');
function barracks(tier){
 if(tier===1)return foot(
  group('flag',flag(180,67,'science'))+
  rect(43,123,125,102,'iron',14)+path('M147 126H165V214Q166 224 153 224H147Z','iron','stroke="none"',-.18)+
  line('M49 149H160M49 174H159M49 199H159','clay',3)+
  path('M34 126L83 88Q94 79 106 88L176 126Z','leaf')+path('M101 87L174 124H104Z','moss','stroke="none"')+glint('M52 116L86 92')+
  rect(84,176,38,49,'coal',12)+line('M91 182V218','iron',3)+
  rect(51,147,24,29,lit(),7)+line('M63 151V172','iron',3)+
  post(79,164,60,'iron')+post(133,164,60,'iron')+
  path('M72 142H142L153 165Q142 176 132 165Q121 176 111 165Q101 176 91 165Q80 176 70 165Z','paper')+
  path('M84 144H98L94 165Q87 172 80 166ZM116 144H129L135 166Q128 173 120 166Z','clay')+glint('M77 146H136')+
  group('training-dummy',post(191,174,50,'iron')+line('M174 178L220 178','ink',10)+line('M174 178L220 178','iron',4)+
    rect(183,170,29,30,'sand',10)+circle(197,155,13,'paper')+line('M191 178L203 190M203 178L191 190','iron',3)+glint('M188 177V184')));
 return foot(
  rect(57,70,61,153,'rock',12)+path('M102 73H116V221H102Z','rock-dark','stroke="none"')+
  path('M48 74Q48 67 56 61L78 36Q87 27 96 36L122 61Q128 68 127 74Z','clay')+glint('M63 60L84 40')+
  circle(87,100,22,'paper')+circle(87,100,17,'cream','stroke-width="3"')+
  line('M87 100V88M87 100L98 104','ink',4)+circle(87,100,3,'ink','stroke="none"')+
  line('M87 82V85M87 115V118M69 100H72M102 100H105','iron',3)+
  rect(41,151,174,74,'paper',13)+path('M197 156H212V215Q213 224 201 224H197Z','paper','stroke="none"',-.18)+
  path('M35 152L55 130H191L222 152Z','rock-dark')+glint('M53 143H103')+
  line('M47 174H111M160 175H210M51 197H108M63 155V173M91 176V196M175 155V175','rock',3)+
  path('M118 224V188Q118 173 134 173Q151 173 151 188V224Z','coal')+line('M134 182V222','iron',3)+
  group('banner',path('M165 147H191V185L178 196L165 185Z','science')+path('M178 155L184 165L178 176L172 165Z','paper'))+
  group('training-yard',ellipse(76,220,38,6,'sand')+target(60,191,14)+target(91,207,11))+
  group('flag',flag(202,78,'science')));
}

const definitions=[
 {id:'barracks.t1',draw:()=>barracks(1),parts:['flag','training-dummy']},
 {id:'barracks.t2',draw:()=>barracks(2),parts:['flag','banner','training-yard']},
 {id:'pitfall',draw:pitfall,parts:['camouflage','flag']},
];
const assets=[];
for(const def of definitions)for(const mode of ['idle','construction','off']){
 state=mode;
 let body=def.draw();
 state='idle';
 if(mode==='construction')body=`<g opacity="0.4">${body}</g>${scaffolding()}`;
 const suffix=mode==='idle'?'':`.${mode}`,stem=def.id.replaceAll('.','-')+(mode==='idle'?'':`-${mode}`);
 const src=`art/src/buildings/${stem}.svg`;
 write(src,svg(body,256));
 assets.push({id:`building.${def.id}${suffix}`,category:'buildings',src,out:`public/assets/sprites/buildings/${stem}.png`,viewBox:[256,256],anchor:[.5,.9375],frames:1,
  parts:[...(def.parts??[]),...(mode==='construction'?['scaffolding']:[])],tags:['defense',...def.id.split('.'),mode],phase:'P1',
  ...(def.pivot?{partPivots:{[def.parts[0]]:def.pivot}}:{})});
}
write('art/manifest/weapons.json',JSON.stringify({assets},null,2)+'\n');
console.log(`Defense art: ${definitions.length} buildings / ${assets.length} ids.`);
