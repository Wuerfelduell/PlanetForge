// Original powered upgrades. Run before assets:gen: node scripts/assets/gen-stage3.mjs
// Drawing helpers are local copies of the existing building/economy conventions.
import {C, svg, round, write} from './common.mjs';

let state = 'idle';
const paint = (token,tone=0) => C(state==='off'&&!['ink','coal','rock','rock-dark','snow'].includes(token)
  ? (['cream','paper','sand'].includes(token)?'rock':'rock-dark') : token,tone);
const path = (d,token='none',extra='') => `<path d="${d}" fill="${token==='none'?'none':paint(token)}" ${extra}/>`;
const rect = (x,y,w,h,token,r=8,extra='') => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="${paint(token)}" ${extra}/>`;
const circle = (x,y,r,token,extra='') => `<circle cx="${round(x)}" cy="${round(y)}" r="${r}" fill="${paint(token)}" ${extra}/>`;
const ellipse = (x,y,rx,ry,token,extra='') => `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="${paint(token)}" ${extra}/>`;
const group = (id,body,extra='') => `<g id="${id}" ${extra}>${body}</g>`;
const line = (d,token='ink',width=3) => path(d,'none',`stroke="${paint(token)}" stroke-width="${width}"`);
const glint = d => line(d,'cream',4);
const shade = (d,token,width=9) => line(d,token,width).replace(paint(token),paint(token,-.18));
const active = token => state==='idle'?token:'coal';
const post = (x,y,h,token='iron') => rect(x,y,12,h,token,6);
const base = () => rect(31,225,194,12,'rock',6)+line('M42 233H214','rock-dark',5);
const cable = d => line(d,'ink',8)+line(d,'coal',3);
const lamp = (x,y,w=22,h=16) => rect(x,y,w,h,'rock-dark',7)+
  rect(x+4,y+4,w-8,h-8,active('energy'),4,'stroke="none"')+
  (state==='idle'?line(`M${x+6} ${y+5}H${x+w-7}`,'cream',3):'');
const crate = (x,y,s=30) => rect(x,y,s,s,'sand',7)+line(`M${x+5} ${y+7}L${x+s-5} ${y+s-6}M${x+s-5} ${y+7}L${x+5} ${y+s-6}`,'iron',3);
const fish = (x,y) => path(`M${x} ${y}Q${x+10} ${y-11} ${x+22} ${y}Q${x+10} ${y+11} ${x} ${y}L${x-7} ${y-7}V${y+7}Z`,'science')+
  circle(x+16,y-2,1.5,'ink','stroke="none"');

function fishery(){
  return path('M119 206Q144 195 165 205Q192 195 222 207V226H116Z','water')+
    line('M124 218H141M198 220H214','cream',3)+
    // Same blue gable, left crane, fish crates and clay boat as the tier-two harbor.
    rect(116,103,104,94,'snow',15)+shade('M208 117V183Q208 188 198 188H129','snow',10)+
    path('M107 105L153 72Q166 63 180 73L223 105Z','deep-water')+glint('M124 98L157 77')+
    rect(173,50,35,29,'rock',8)+line('M181 59H200M181 68H200','rock-dark',3)+
    path('M185 78L190 85L195 78M199 78L203 85L207 78','snow','stroke-width="3"')+
    circle(158,126,18,'deep-water')+
    line('M158 114V138M148 120L168 132M148 132L168 120','snow',3)+
    line('M154 116L158 120L162 116M154 136L158 132L162 136','snow',2)+
    rect(129,154,45,27,'rock',8)+line('M137 163H166M137 172H166','deep-water',3)+
    path('M137 154L141 161L146 154M156 154L161 163L165 154','snow','stroke-width="3"')+
    rect(186,150,27,44,'paper',8)+line('M193 158V185','rock',3)+
    post(50,50,147,'rock')+shade('M59 63V184','rock',4)+
    path('M42 49H151Q159 49 155 60L151 72H42Z','science')+glint('M52 56H137')+
    line('M62 99L112 72M62 81L82 70','rock-dark',5)+
    rect(38,99,37,32,'rock',9)+circle(56,115,9,'deep-water','stroke-width="3"')+
    line('M108 73V96','ink',3)+path('M108 96Q119 107 108 113Q99 115 99 106')+
    cable('M38 222V151Q38 140 49 140H55V131M62 137H92Q102 137 102 151V192H116')+
    lamp(77,119,26,21)+
    post(44,195,30,'rock')+post(109,195,30,'rock')+
    rect(33,191,190,16,'rock',7)+line('M42 196H211','snow',3)+
    line('M48 209L103 222M107 209L52 222','rock-dark',4)+
    crate(37,160)+crate(77,160)+fish(44,159)+fish(84,159)+
    rect(166,183,34,19,'paper',7)+lamp(173,187,20,12)+
    path('M130 204H223L213 220Q176 232 144 220Z','clay')+line('M149 212H208','cream',4)+
    base();
}

function scaffolding(){
  return group('scaffolding',post(38,57,180)+post(206,57,180)+
    rect(31,108,194,12,'sand',5)+rect(31,186,194,12,'sand',5)+
    line('M46 181L207 122M47 202L199 230','iron',5)+
    post(176,154,83,'sand')+post(196,154,83,'sand')+
    [166,186,206,226].map(y=>line(`M180 ${y}H200`,'iron',4)).join(''));
}

const buildings = [
  {name:'fishery',draw:fishery,parts:[]},
];
const assets=[];
for(const def of buildings){
  for(const mode of ['idle','construction','off']){
    state=mode;
    const stem=`${def.name}-t3${mode==='idle'?'':`-${mode}`}`;
    const body=def.draw();
    write(`art/src/buildings/${stem}.svg`,svg(mode==='construction'?`<g opacity="0.4">${body}</g>${scaffolding()}`:body,256));
    assets.push({id:`building.${def.name}.t3${mode==='idle'?'':`.${mode}`}`,category:'buildings',
      src:`art/src/buildings/${stem}.svg`,out:`public/assets/sprites/buildings/${stem}.png`,
      viewBox:[256,256],anchor:[.5,.9375],frames:1,
      parts:[...def.parts,...(mode==='construction'?['scaffolding']:[])],
      tags:[def.name,'tier3','powered',mode],phase:'P1'});
  }
}
write('art/manifest/stage3.json',JSON.stringify({assets},null,2)+'\n');
console.log(`Powered stage three: ${assets.length} assets generated.`);
