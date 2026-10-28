// Original PlanetForge utility art; all colors come from the shared palette.
// Run this generator before assets:gen (which merges fragments and splits parts).
import { C, svg, write } from './common.mjs';

const assets=[];
let state='idle';
// State and shape helpers copied from gen-buildings/gen-ores to keep this isolated.
const paint=(token,tone=0)=>C(state==='off'&&!['ink','coal','rock','rock-dark','snow'].includes(token)
  ?(['cream','paper','sand'].includes(token)?'rock':'rock-dark'):token,tone);
const p=(d,token='none',extra='',tone=0)=>`<path d="${d}" fill="${token==='none'?'none':paint(token,tone)}" ${extra}/>`;
const rect=(x,y,w,h,token,r=8,extra='')=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="${paint(token)}" ${extra}/>`;
const circle=(x,y,r,token,extra='')=>`<circle cx="${x}" cy="${y}" r="${r}" fill="${paint(token)}" ${extra}/>`;
const ellipse=(x,y,rx,ry,token,extra='')=>`<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="${paint(token)}" ${extra}/>`;
const line=(d,token='ink',width=3,extra='')=>p(d,'none',`stroke="${paint(token)}" stroke-width="${width}" ${extra}`);
const group=(id,body)=>`<g id="${id}">${body}</g>`;
const shine=d=>line(d,'cream',4);
const pipe=(d,token='rock',width=8)=>line(d,'ink',width+6)+line(d,token,width);
const base=()=>rect(31,225,194,12,'rock',6)+line('M42 233H214','rock-dark',5);
const post=(x,y,h,token='iron')=>rect(x,y,12,h,token,6);
const active=token=>state==='idle'?token:'coal';
const leaf=(x,y,s=1)=>`<g transform="translate(${x} ${y}) scale(${s})">`+
  p('M0 0Q-22 -30 4 -34Q22 -16 0 0Z','leaf')+line('M0 -4L4 -25','moss')+'</g>';
const sprout=(x,y)=>leaf(x,y,.7)+
  p(`M${x} ${y-7}Q${x-22} ${y-8} ${x-17} ${y-25}Q${x-4} ${y-27} ${x+1} ${y-14}Q${x+9} ${y-30} ${x+20} ${y-24}Q${x+22} ${y-8} ${x} ${y-7}Z`,'grass','stroke-width="3"')+
  circle(x-5,y-7,5,'danger','stroke-width="3"')+circle(x+7,y-5,5,'clay','stroke-width="3"');

function farm(){
  // The tier-2 greenhouse profile, cream ribs, snowy door and berry plants remain.
  // Taller glass and a third bed make the upgrade fuller without widening its feet.
  const rows=[159,185,211].map(y=>rect(40,y,176,15,'iron',7)+
    [58,94,158,194].map(x=>sprout(x,y)).join('')).join('');
  return p('M39 222V118Q39 57 128 57Q217 57 217 118V222Z','science')+
    line('M191 90Q209 114 209 211H199','deep-water',9)+rows+
    line('M42 120H213M128 60V220M84 66Q72 96 73 137M172 66Q184 97 184 137','cream',7)+
    shine('M51 115Q49 82 76 77')+rect(108,153,41,71,'snow',10)+line('M128 164V213','science',4)+
    // Fixed riser and hose sit behind the pivoting arm, never inside its group.
    pipe('M206 201V131Q206 122 197 122H159V43','deep-water',8)+
    group('sprinkler',
      pipe('M105 49V43H194V49','rock',8)+circle(159,43,10,'sand')+shine('M155 39H161')+
      (state==='idle'?line('M105 54Q90 38 77 55M101 64Q84 52 72 69M194 54Q210 38 222 55M198 64Q214 52 225 70','water',5)+
        line('M75 64L72 69M69 78L67 82M224 64L227 69M227 80V84','science',4):''))+
    // A prominent powered pump remains legible beside the greenhouse door.
    line('M185 211Q171 231 155 217V205','ink',7)+rect(149,194,12,14,'rock-dark',4)+
    rect(179,176,40,48,'paper',10)+line('M209 190V213H193','rock',5)+
    group('pump-light',(state==='idle'?circle(193,187,12,'energy','stroke="none" opacity="0.3"'):'')+
      circle(193,187,6,active('energy')))+line('M190 204H202M190 212H202','rock-dark',3)+
    shine('M185 194V201')+base();
}

function scaffolding(){return group('scaffolding',post(38,78,159)+post(206,78,159)+rect(30,113,196,12,'sand',5)+rect(30,186,196,12,'sand',5)+
  line('M46 181L207 127M47 202L199 230','iron',5)+post(176,154,83,'sand')+post(196,154,83,'sand')+
  [166,186,206,226].map(y=>line(`M180 ${y}H200`,'iron',4)).join(''));}

function treasury(){
  const column=x=>rect(x,132,22,85,'paper',9)+line(`M${x+16} 144V207`,'rock',4)+
    rect(x-5,129,32,13,'snow',6)+rect(x-5,208,32,15,'snow',6)+shine(`M${x+6} 150V180`);
  const coin=(x,y)=>ellipse(x,y,11,5,'energy','stroke-width="3"')+line(`M${x-6} ${y-1}H${x}`,'cream',2);
  const silver=(x,y)=>p(`M${x} ${y}L${x+6} ${y-11}H${x+29}L${x+35} ${y}V${y+7}H${x}Z`,'snow','stroke-width="3"')+
    p(`M${x} ${y}H${x+35}V${y+7}H${x}Z`,'rock','stroke-width="3"')+
    line(`M${x+8} ${y-8}H${x+23}`,'cream',3);
  return rect(48,113,160,111,'rock',18)+line('M194 132V212H62','rock-dark',10)+
    // Tall stone cupola on a low, wide colonnade; no book roof or palace spires.
    rect(118,40,20,15,'sand',7)+
    p('M66 102Q66 53 128 51Q190 53 190 102Z','rock')+
    p('M128 54Q179 55 187 99H153Q157 72 128 54Z','rock-dark','stroke="none"')+
    shine('M79 86Q86 65 108 63')+line('M128 55Q105 76 105 99','snow',4)+
    rect(59,97,138,17,'sand',8)+
    rect(43,112,170,23,'paper',9)+line('M54 129H202','rock',4)+
    // Star is fixed in the lintel rather than floating like the monument emblem.
    p('M128 108L133 117L143 119L136 126L137 137L128 132L119 137L120 126L113 119L123 117Z','energy','stroke-width="3"')+
    p('M87 222V164Q87 141 128 141Q169 141 169 164V222Z','coal')+
    // Both heavy door leaves swing out, exposing a broad dark treasure opening.
    p('M88 151L101 161V217L83 225V164Q83 155 88 151Z','iron')+
    p('M168 151L155 161V217L173 225V164Q173 155 168 151Z','iron')+
    line('M91 168V204M164 168V204','sand',4)+
    group('treasure-glow',(state==='idle'?ellipse(139,190,23,29,'crystal','stroke="none" opacity="0.2"'):'')+
      p('M126 183L138 163L151 179L146 202L133 204Z',state==='off'?'rock-dark':'crystal','stroke-width="3"')+
      p('M138 165L140 184L134 201L128 183Z',state==='off'?'rock':'crystal','stroke="none"',.18)+
      line('M140 184L148 180',state==='off'?'rock':'oil-sheen',3))+
    silver(126,213)+silver(130,201)+
    [[109,216],[117,211],[106,205],[113,199],[105,192],[119,219]].map(([x,y])=>coin(x,y)).join('')+
    column(54)+column(180)+rect(71,220,114,9,'paper',4)+base();
}

function emit(id,category,stem,body,size=128,extra={}){
  const src=`art/src/${category}/${stem}.svg`;
  write(src,svg(body,size,size,extra.stroke??6*size/256));
  const {stroke,...meta}=extra;
  assets.push({id,category,src,out:`public/assets/sprites/${category}/${stem}.png`,viewBox:[size,size],
    anchor:[.5,.5],frames:1,parts:[],tags:['usefulness',stem],phase:'P1',...meta});
}

for(const def of [
  {id:'farm.t3',file:'farm-t3',draw:farm,parts:['sprinkler','pump-light']},
  {id:'treasury',file:'treasury',draw:treasury,parts:['treasure-glow']},
])for(const mode of ['idle','construction','off']){
  state=mode;
  let body=def.draw();
  state='idle';
  if(mode==='construction')body=`<g opacity="0.4">${body}</g>${scaffolding()}`;
  emit(`building.${def.id}${mode==='idle'?'':'.'+mode}`,'buildings',`${def.file}${mode==='idle'?'':'-'+mode}`,body,256,
    {anchor:[.5,.9375],parts:[...def.parts,...(mode==='construction'?['scaffolding']:[])]});
}

write('art/manifest/usefulness.json',JSON.stringify({assets},null,2)+'\n');
console.log(`Usefulness art: ${assets.length} ids generated.`);
