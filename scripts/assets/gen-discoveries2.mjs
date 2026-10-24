// Original late-game discovery overlays. Run directly before assets:gen.
// Keep the same design grid, placement and tags as gen-ui.mjs discovery().
import { C, svg, round, write } from './common.mjs';

const p=(d,token=null,extra='')=>`<path d="${d}" fill="${token?C(token):'none'}" ${extra}/>`;
const rect=(x,y,w,h,r,token,extra='')=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="${C(token)}" ${extra}/>`;
const circ=(x,y,r,token,extra='')=>`<circle cx="${x}" cy="${y}" r="${r}" fill="${C(token)}" ${extra}/>`;
const ellipse=(x,y,rx,ry,token,extra='')=>`<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="${C(token)}" ${extra}/>`;
const group=(body,transform,extra='')=>`<g transform="${transform}" ${extra}>${body}</g>`;
const line=(d,token='ink',width=3.8)=>p(d,null,`stroke="${C(token)}" stroke-width="${width}"`);
const detail=d=>p(d,null,'stroke-width="1.5"');
const shine=d=>line(d,'cream',4);
const shadow=(d,token)=>`<path d="${d}" fill="${C(token,-.18)}" stroke="none"/>`;
const star=(x,y,r,token='energy')=>p(`M${x} ${y-r}Q${x+3} ${y-3} ${x+r} ${y}Q${x+3} ${y+3} ${x} ${y+r}Q${x-3} ${y+3} ${x-r} ${y}Q${x-3} ${y-3} ${x} ${y-r}Z`,token);
const hex=(x,y,r,token,extra='')=>p(Array.from({length:6},(_,i)=>{
  const a=(i*60-90)*Math.PI/180;
  return `${i?'L':'M'}${round(x+Math.cos(a)*r)} ${round(y+Math.sin(a)*r)}`;
}).join('')+'Z',token,extra);
const tube=(d,token,width=7)=>line(d,'ink',width+4)+line(d,token,width);

function genetics(){
  const point=(t,side)=>[round(56+side*20*Math.cos(t*Math.PI*3)),round(18+90*t)];
  const strand=side=>Array.from({length:61},(_,i)=>`${i?'L':'M'}${point(i/60,side).join(' ')}`).join('');
  return Array.from({length:13},(_,i)=>line(`M${point(i/12,-1).join(' ')}L${point(i/12,1).join(' ')}`,'rock-dark',5)).join('')+
    tube(strand(-1),'crystal')+tube(strand(1),'science')+shine('M37 18L39 24M75 18L73 24')+
    line('M91 111V81','moss',5)+
    p('M90 96Q70 96 72 76Q91 76 90 96Z','leaf')+
    p('M91 85Q92 62 113 63Q112 85 91 85Z','grass')+detail('M95 81L105 71');
}

function nanotech(){
  return [[31,39],[96,39],[64,95]].map(([x,y])=>hex(x,y,23,'snow',`stroke="${C('rock')}" stroke-width="2.5"`)).join('')+
    line('M42 56L25 52L17 62M41 72H20M44 87L28 93L25 104M86 56L103 52L111 62M87 72H108M84 87L100 93L103 104','ink',6)+
    line('M53 39L45 24M75 39L83 24','rock-dark',4)+circ(43,20,5,'energy')+circ(85,20,5,'energy')+
    rect(39,50,50,48,19,'crystal')+shadow('M78 59Q94 94 64 98H58L64 89Q79 87 78 59Z','crystal')+
    rect(44,35,40,27,11,'paper')+rect(50,43,28,11,5,'deep-water')+
    circ(57,48,2.5,'snow','stroke="none"')+circ(71,48,2.5,'snow','stroke="none"')+
    line('M64 63V90','oil-sheen',3)+rect(49,69,9,13,3,'science')+rect(70,69,9,13,3,'science')+shine('M47 62V70');
}

function radar(){
  return p('M47 81L40 110H84L67 80Z','rock')+rect(32,105,61,10,5,'paper')+
    p('M19 46Q17 98 70 92Q90 76 79 49Q51 63 19 46Z','science')+
    shadow('M25 65Q34 91 69 86L79 78Q77 88 70 92Q31 98 25 65Z','science')+
    line('M48 76L73 38','ink',6)+circ(76,34,7,'energy')+
    line('M88 38Q97 47 94 58M93 27Q110 40 106 63','crystal',5)+
    star(99,17,10)+shine('M26 55Q27 69 37 76');
}

function arcology(){
  return p('M16 106V65Q16 12 64 12Q112 12 112 65V106Z','science')+
    shadow('M91 28Q112 43 112 68V106H96V65Q96 41 91 28Z','science')+
    p('M43 106V49Q43 43 49 43H54V23Q54 17 60 17H70Q76 17 76 23V43H82Q88 43 88 49V106Z','paper')+
    shadow('M75 23V48H85V106H72V23Z','paper')+
    [51,68,85].map(y=>rect(52,y,12,9,3,'energy')+rect(70,y,9,9,3,'deep-water')).join('')+
    rect(58,98,15,13,4,'deep-water')+
    p('M17 103V65Q17 27 48 18M89 27Q111 41 111 68V103',null,`stroke="${C('snow')}" stroke-width="4"`)+
    rect(13,105,102,11,5,'rock')+shine('M22 111H48M59 24V34');
}

function warpDrive(){
  const rocket=p('M54 69Q29 74 26 96L51 88M75 87Q77 111 101 110L96 86','crystal')+
    p('M45 82Q57 35 104 19Q111 66 75 94Z','paper')+
    p('M80 31Q91 23 104 19Q106 33 101 47Z','science')+
    shadow('M102 48Q98 76 75 94L64 87Q87 71 95 47Z','paper')+
    circ(78,57,12,'deep-water')+shine('M72 54Q74 50 78 50M56 67L61 56')+
    p('M45 86Q25 91 21 112Q42 112 59 99Z','ascension')+p('M45 94L32 106L51 99Z','energy','stroke="none"');
  return line('M16 35H53M10 52H41M13 70H30','science',5)+star(28,22,8,'crystal')+rocket;
}

function quantum(){
  return [35,54,73,92].map(x=>line(`M${x} 94V115`,'rock',6)).join('')+
    line('M15 85H28M15 99H28M100 85H113M100 99H113','rock',6)+
    rect(25,74,78,34,9,'deep-water')+rect(35,81,58,18,5,'science')+
    ellipse(64,49,43,17,'crystal','fill-opacity="0" transform="rotate(-30 64 49)"')+
    ellipse(64,49,43,17,'crystal','fill-opacity="0" transform="rotate(50 64 49)"')+
    circ(64,49,23,'crystal')+shadow('M76 31Q95 66 58 71Q85 78 87 51Q88 38 76 31Z','crystal')+
    shine('M49 45Q50 33 61 33')+circ(63,49,8,'snow')+
    p('M27 67Q51 83 91 34M42 17Q32 49 84 80',null,`stroke="${C('science')}" stroke-width="4"`)+
    circ(95,30,5,'energy')+circ(43,20,5,'snow')+line('M43 90H53M75 90H85','snow',3);
}

function forceFields(){
  const cells=[[64,64],[98,64],[81,93.4],[47,93.4],[30,64],[47,34.6],[81,34.6]];
  return '<defs><clipPath id="shield-grid-clip"><circle cx="64" cy="64" r="39"/></clipPath></defs>'+
    hex(64,64,51,'deep-water')+hex(64,64,42,'science')+
    p('M64 22L100.4 43V85L64 106V84L81 73V53Z','water','stroke="none"')+
    `<g clip-path="url(#shield-grid-clip)">${cells.map(([x,y])=>hex(x,y,19.6,'snow',`fill-opacity="0.1" stroke="${C('snow')}" stroke-width="2.5"`)).join('')}</g>`+
    shine('M29 56V44L53 30')+star(101,29,9,'cream');
}

function biosphere(){
  return p('M16 100V72Q16 25 64 25Q112 25 112 72V100Z','snow')+
    p('M22 96Q43 75 70 88Q93 78 106 93V105H22Z','grass')+
    ellipse(83,98,24,10,'water')+line('M73 96H87','snow',2)+
    p('M45 98L49 65H58L63 98Z','iron')+line('M53 78L38 65M55 71L67 58','iron',5)+
    p('M35 74Q17 68 27 52Q22 39 38 35Q47 20 61 33Q80 31 80 48Q96 63 79 72Q66 80 57 72Q46 83 35 74Z','leaf')+
    p('M29 54Q29 39 43 40Q48 30 59 38',null)+
    shine('M32 52Q33 41 44 42')+
    p('M17 100V71Q17 48 31 36M85 34Q111 46 111 76V100',null,`stroke="${C('science')}" stroke-width="4"`)+
    rect(14,104,100,10,5,'paper');
}

function goldenAge(){
  const leaves=p('M58 106Q27 95 27 65',null)+
    p('M30 87Q11 85 13 68Q31 68 30 87ZM37 99Q17 102 16 87Q34 82 37 99ZM50 107Q32 115 27 102Q42 93 50 107Z','energy');
  return [0,45,90,135].map(a=>group(line('M64 13V21M64 79V87','ascension',5),`rotate(${a} 64 50)`)).join('')+
    circ(64,50,26,'energy')+shadow('M80 30Q94 66 52 74Q77 83 89 60Q96 42 80 30Z','energy')+
    shine('M46 45Q48 33 60 32')+line('M40 78H88','ascension',4)+
    leaves+group(leaves,'translate(128 0) scale(-1 1)')+p('M55 103L64 109L73 103L76 114L64 110L52 114Z','ascension');
}

function replicator(){
  return rect(19,93,92,21,8,'rock')+rect(26,97,32,9,4,'science')+rect(77,97,27,9,4,'crystal')+
    p('M24 91V46Q24 35 35 35H92Q105 35 105 48V88H95V49Q95 46 90 46H39Q34 46 34 51V91Z','paper')+
    rect(52,30,27,20,7,'rock')+line('M60 45H71','energy',4)+
    p('M14 69L31 60L49 69V90L31 100L14 90Z','clay')+
    p('M14 69L31 79L49 69M31 79V100',null)+
    p('M56 69H67V61L81 75L67 88V80H56Z','energy')+
    circ(98,79,16,'crystal')+shadow('M106 67Q119 91 90 92Q111 102 114 82Q114 72 106 67Z','crystal')+
    shine('M89 76Q90 69 96 69M19 69L29 64')+star(90,20,9)+star(113,52,6,'science');
}

function cloning(){
  // Identical beaver faces: paired incisors and small round ears match our people.
  const vessel=x=>rect(x,26,36,82,16,'snow')+rect(x+4,40,28,61,12,'science')+
    circ(x+9,57,5,'iron')+circ(x+27,57,5,'iron')+ellipse(x+18,69,13,14,'clay')+
    circ(x+13,67,2,'ink','stroke="none"')+circ(x+23,67,2,'ink','stroke="none"')+
    ellipse(x+18,74,8,4,'sand','stroke-width="2"')+rect(x+14,76,8,6,2,'snow','stroke-width="2"')+
    detail(`M${x+18} 77V81`)+circ(x+18,72,2,'coal','stroke="none"')+
    circ(x+23,91,3,'snow','stroke="none"')+rect(x-3,20,42,12,5,'rock')+shine(`M${x+7} 36V46`);
  return vessel(19)+vessel(73)+line('M62 48H66M62 57H66','crystal',4);
}

function starForge(){
  return p('M16 77H84L109 66V82Q98 91 80 91L75 101L84 112H39L49 100L45 90Q24 90 16 77Z','rock')+
    shadow('M53 89H80L75 101L84 112H39L49 100Z','rock')+
    group(rect(45,35,12,45,5,'clay')+p('M28 20Q28 16 34 16H71Q77 16 77 22V38Q77 44 71 44H34Q28 44 28 38Z','rock')+shine('M35 23H60'),'rotate(-32 51 46)')+
    star(83,63,21)+shine('M79 59L82 53')+line('M96 40L102 32M107 53H115M71 35L70 28','ascension',4)+
    line('M29 81H58','snow',3);
}

function council(){
  return line('M36 91V109M92 91V109','rock-dark',7)+
    [30,64,98].map(x=>ellipse(x,73,9,6,'crystal')).join('')+
    ellipse(64,88,49,20,'iron')+ellipse(64,81,49,20,'paper')+
    ellipse(64,81,23,8,'science')+shine('M30 76Q38 70 48 70')+
    [26,64,102].map(x=>ellipse(x,106,9,6,'crystal')).join('')+
    p('M102 41Q99 12 65 14Q37 14 34 34Q31 48 54 51Q77 55 82 39Q86 25 67 25Q53 24 51 34Q49 42 61 42Q70 43 71 37',null,`stroke="${C('ink')}" stroke-width="10"`)+
    p('M102 41Q99 12 65 14Q37 14 34 34Q31 48 54 51Q77 55 82 39Q86 25 67 25Q53 24 51 34Q49 42 61 42Q70 43 71 37',null,`stroke="${C('crystal')}" stroke-width="6"`)+
    circ(66,35,5,'energy')+circ(23,30,3,'science','stroke="none"')+circ(109,53,3,'science','stroke="none"');
}

function transcendence(){
  const rays=Array.from({length:16},(_,i)=>{
    const a=(i*22.5-90)*Math.PI/180,r=i%2?34:(i%4?47:53);
    return `${i?'L':'M'}${round(64+Math.cos(a)*r)} ${round(64+Math.sin(a)*r)}`;
  }).join('')+'Z';
  return p(rays,'crystal')+shadow('M64 11L77 33L97 31L95 51L117 64L95 77L97 97L77 95L64 117V11Z','crystal')+
    p('M15 64Q37 36 64 39Q91 36 113 64Q91 92 64 89Q37 92 15 64Z','cream')+
    circ(64,64,22,'science')+shadow('M76 47Q94 77 53 84Q74 94 85 72Q91 57 76 47Z','science')+
    circ(64,64,11,'deep-water')+circ(58,57,5,'snow','stroke="none"')+
    shine('M35 56Q42 50 48 49')+line('M64 20V28M64 100V108','cream',3);
}

const discoveries={
  genetics,nanotech,'deep-space-radar':radar,arcology,'warp-drive':warpDrive,
  'quantum-computing':quantum,'force-fields':forceFields,biosphere,'golden-age':goldenAge,
  'matter-replicator':replicator,cloning,'star-forge':starForge,'galactic-council':council,transcendence,
};
const assets=[];
for(const [id,draw] of Object.entries(discoveries)){
  const body=group(draw(),'translate(13 13) scale(0.8)','stroke-width="3.8"');
  const src=`art/src/discoveries/${id}.svg`;
  write(src,svg(body));
  assets.push({id:`discovery.${id}`,category:'discoveries',src,out:`public/assets/sprites/discoveries/${id}.png`,viewBox:[128,128],anchor:[.5,.5],frames:1,parts:[],tags:['discoveries',id,'overlay-on-ui.discovery-badge'],phase:'P1'});
}
write('art/manifest/discoveries2.json',JSON.stringify({assets},null,2)+'\n');
console.log(`Late-game discoveries: ${assets.length} assets generated.`);
