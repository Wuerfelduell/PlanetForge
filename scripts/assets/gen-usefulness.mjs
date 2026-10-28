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

function emit(id,category,stem,body,size=128,extra={}){
  const src=`art/src/${category}/${stem}.svg`;
  write(src,svg(body,size,size,extra.stroke??6*size/256));
  const {stroke,...meta}=extra;
  assets.push({id,category,src,out:`public/assets/sprites/${category}/${stem}.png`,viewBox:[size,size],
    anchor:[.5,.5],frames:1,parts:[],tags:['usefulness',stem],phase:'P1',...meta});
}

for(const def of [
  {id:'farm.t3',file:'farm-t3',draw:farm,parts:['sprinkler','pump-light']},
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
