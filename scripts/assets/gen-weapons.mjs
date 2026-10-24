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

function sandbag(x,y,w=46){return rect(x,y,w,24,'sand',11)+
 path(`M${x+5} ${y+16}Q${x+w/2} ${y+23} ${x+w-4} ${y+14}V${y+17}Q${x+w-4} ${y+22} ${x+w-12} ${y+22}H${x+12}Z`,'sand','stroke="none"',-.18)+
 line(`M${x+w-9} ${y+7}Q${x+w-14} ${y+12} ${x+w-9} ${y+17}`,'iron',3)+glint(`M${x+8} ${y+7}H${x+22}`);}
function flak(){return ellipse(128,215,97,22,'sand')+
 [36,80,124,168].map((x,i)=>sandbag(x,185+(i===0||i===3?9:0))).join('')+
 ellipse(128,209,63,14,'rock-dark')+path('M99 208L107 166H148L159 208Z','rock')+
 path('M107 171V151Q107 135 123 135H136Q151 135 151 151V178Z','paper')+
 group('barrel',`<g transform="rotate(-68 128 162)">`+
  rect(115,131,34,62,'rock-dark',12)+
  [133,171].map(y=>rect(132,y,98,20,'rock',8)+path(`M141 ${y+14}H228V${y+19}H141Z`,'rock-dark','stroke="none"')+
    rect(161,y-3,12,26,'paper',5)+rect(206,y-3,12,26,'paper',5)+
    ellipse(231,y+10,7,13,'rock-dark')+ellipse(233,y+10,3,7,'coal','stroke-width="3"')+glint(`M143 ${y+5}H155M179 ${y+5}H199`)).join('')+
  '</g>')+
 circle(128,162,21,'iron')+circle(128,162,11,'paper')+circle(128,162,4,'rock-dark','stroke="none"')+
 line('M89 186L102 173','rock-dark',8)+rect(75,180,23,15,'iron',7)+
 [34,80,126,172].map((x,i)=>sandbag(x,210+(i===1||i===2?3:0))).join('');}

function missileLauncher(){return foot(
 rect(45,206,125,19,'rock-dark',8)+path('M76 207L91 166H148L164 207Z','rock')+
 path('M129 172H146L158 204H138Z','rock-dark','stroke="none"')+
 group('rack',`<g transform="rotate(24 128 165)">`+
  rect(63,102,126,73,'rock-dark',12)+
  [0,1,2,3].map(i=>{const x=70+i*28,token=['science','clay','energy','crystal'][i];return path(`M${x+1} 140L${x-4} 158L${x+10} 153L${x+24} 158L${x+19} 140Z`,'rock')+
   rect(x,77,20,78,'paper',9)+path(`M${x+14} 80H${x+19}V145Q${x+19} 153 ${x+11} 153V88Z`,'paper','stroke="none"',-.18)+
   path(`M${x} 81Q${x-1} 64 ${x+10} 55Q${x+21} 64 ${x+20} 81Z`,token)+
   glint(`M${x+6} 89V119`)+line(`M${x+3} 130H${x+17}`,'rock-dark',4);
  }).join('')+
  rect(61,145,130,13,'iron',5)+line('M70 151H180','clay',3)+
  circle(76,151,2,'paper','stroke="none"')+circle(177,151,2,'paper','stroke="none"')+'</g>')+
 circle(128,165,21,'rock')+circle(128,165,11,'iron')+glint('M114 159Q117 151 125 151')+
 rect(184,178,34,46,'clay',10)+ellipse(201,179,17,7,'paper')+rect(183,187,36,7,'rock-dark',3)+rect(183,212,36,7,'rock-dark',3)+
 circle(205,178,3,'coal','stroke-width="3"')+glint('M191 198V206')+
 pipe('M188 222H172V195Q172 184 160 184','rock-dark',4));}

function shieldGenerator(){
 const ringBack=angle=>`<g transform="rotate(${angle} 128 82)">${path('M69 82A59 18 0 1 0 187 82A59 18 0 1 0 69 82','none',`stroke="${paint('ink')}" stroke-width="10"`)}${path('M69 82A59 18 0 1 0 187 82A59 18 0 1 0 69 82','none',`stroke="${paint('rock')}" stroke-width="4"`)}</g>`;
 const ringFront=angle=>`<g transform="rotate(${angle} 128 82)">${line('M69 82A59 18 0 0 0 187 82','ink',10)}${line('M69 82A59 18 0 0 0 187 82',state==='idle'?'science':'rock-dark',4)}${circle(177,92,5,lit('science'),'stroke-width="3"')}</g>`;
 return foot(
  group('shield-field',state==='idle'?path('M128 18L208 58V132L128 172L48 132V58Z','science',`fill-opacity="0.1" stroke="${paint('science')}" stroke-width="3" opacity="0.5"`)+
    line('M48 58L72 70L72 94L48 106M208 58L184 70V94L208 106M104 30V56L128 70L152 56V30','science',2,'opacity="0.4"'):'')+
  path('M63 221L80 207L111 141H145L176 207L193 221Z','rock')+
  path('M137 142H145L176 207L192 220H168L140 162Z','rock-dark','stroke="none"')+
  path('M104 222L114 111Q128 99 142 111L152 222Z','paper')+
  path('M135 113L141 115L150 221H139Z','paper','stroke="none"',-.18)+
  rect(119,145,18,54,lit('science'),8)+line('M123 152V178',state==='idle'?'snow':'rock-dark',3)+
  rect(84,211,88,14,'rock-dark',6)+glint('M116 125L113 164')+
  group('orb',[0,60,-60].map(ringBack).join('')+
    circle(128,82,34,'paper')+circle(128,82,27,lit('science'))+
    path('M149 68Q160 99 131 107Q109 108 104 89Q124 107 141 91Q153 81 149 68Z',state==='idle'?'deep-water':'rock-dark','stroke="none"')+
    ellipse(118,72,10,6,state==='idle'?'snow':'rock','stroke="none" transform="rotate(-35 118 72)"')+
    [0,60,-60].map(ringFront).join('')));
}

function ionCannon(){return foot(
 rect(39,191,176,34,'rock-dark',12)+path('M38 223L48 186H76L83 223ZM174 223L180 186H206L220 223Z','rock')+
 line('M51 210L56 194M189 210L194 194','paper',5)+
 path('M74 195L76 148Q77 122 101 124Q124 126 129 147L148 195Z','paper')+
 path('M111 133Q125 139 129 154L146 193H125L111 151Z','paper','stroke="none"',-.18)+
 rect(92,198,70,24,'coal',8)+[104,122,140].map(x=>rect(x,204,10,12,lit('science'),3,'stroke="none"')).join('')+
 group('barrel',`<g transform="rotate(-28 92 151)">`+
  rect(72,125,51,52,'rock-dark',17)+rect(99,134,132,34,'rock-dark',13)+
  rect(111,138,116,26,'paper',10)+path('M118 155H226V163H118Z','rock','stroke="none"')+
  [127,155,183].map((x,i)=>rect(x,123,16,56,lit(i===1?'science':'crystal'),7)+
    line(`M${x+5} 132V160`,state==='idle'?'snow':'rock',3)+
    line(`M${x+11} 144V171`,state==='idle'?(i===1?'deep-water':'oil-sheen'):'coal',3)).join('')+
  rect(211,121,22,60,'rock',9)+ellipse(235,151,11,29,'paper')+ellipse(237,151,6,19,lit('science'))+
  line('M237 139V160',state==='idle'?'snow':'rock-dark',3)+glint('M82 133H103M116 143H120')+
  pipe('M104 170Q112 190 142 185Q157 181 156 175','oil-sheen',6)+
  line('M116 181Q132 187 144 179',state==='idle'?'science':'rock-dark',3)+'</g>')+
 group('energy-cables',pipe('M86 157Q52 153 52 184Q51 206 84 207H104V218','oil-sheen',7)+
  line('M60 178Q57 199 84 199H96',state==='idle'?'science':'rock-dark',3))+
 circle(92,151,25,'rock-dark')+circle(92,151,17,'rock')+circle(92,151,8,lit('crystal'))+
 glint('M78 143Q81 137 88 136')+circle(62,217,3,'coal','stroke="none"')+circle(196,217,3,'coal','stroke="none"'));
}

const definitions=[
 {id:'ion-cannon',draw:ionCannon,parts:['barrel','energy-cables'],pivot:[92,151]},
 {id:'shield-generator',draw:shieldGenerator,parts:['orb','shield-field'],pivot:[128,82]},
 {id:'missile-launcher',draw:missileLauncher,parts:['rack'],pivot:[128,165]},
 {id:'flak',draw:flak,parts:['barrel'],pivot:[128,162]},
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
