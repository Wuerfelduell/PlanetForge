// Original PlanetForge ores and metallurgy art. No external artwork or randomness.
// Run: node scripts/assets/gen-ores.mjs && npm --prefix scripts/assets run assets:gen
import { C, svg, round, write } from './common.mjs';

const assets=[];
let state='idle';
const paint=(token,tone=0)=>C(state==='off'&&!['ink','coal','rock','rock-dark','snow'].includes(token)
  ?(['cream','paper','sand'].includes(token)?'rock':'rock-dark'):token,tone);
const p=(d,token='none',extra='',tone=0)=>`<path d="${d}" fill="${token==='none'?'none':paint(token,tone)}" ${extra}/>`;
const rect=(x,y,w,h,token,r=8,extra='')=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="${paint(token)}" ${extra}/>`;
const circle=(x,y,r,token,extra='')=>`<circle cx="${x}" cy="${y}" r="${r}" fill="${paint(token)}" ${extra}/>`;
const ellipse=(x,y,rx,ry,token,extra='')=>`<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="${paint(token)}" ${extra}/>`;
const line=(d,token='ink',width=3,extra='')=>p(d,'none',`stroke="${paint(token)}" stroke-width="${width}" ${extra}`);
const group=(id,body,extra='')=>`<g id="${id}" ${extra}>${body}</g>`;
const shine=(d,width=4)=>line(d,'cream',width);
const star=(x,y,r,token='snow')=>p(`M${x} ${y-r}Q${x+2} ${y-2} ${x+r} ${y}Q${x+2} ${y+2} ${x} ${y+r}Q${x-2} ${y+2} ${x-r} ${y}Q${x-2} ${y-2} ${x} ${y-r}Z`,token,'stroke-width="3"');

function emit(id,category,stem,body,size=128,extra={}){
  const src=`art/src/${category}/${stem}.svg`;
  write(src,svg(body,size,size,extra.stroke??6*size/256));
  const {stroke,...meta}=extra;
  assets.push({id,category,src,out:`public/assets/sprites/${category}/${stem}.png`,viewBox:[size,size],anchor:[.5,.5],frames:1,parts:[],tags:['ores',stem],phase:'P1',...meta});
}

function resource(name,mini=false){
  const fine=mini?3:1.5;
  switch(name){
    case 'tin':{
      const slug=(x,y)=>`<g transform="translate(${x} ${y})">`+
        p('M0 19Q0 10 12 7L43 0Q54 -2 63 7L66 19V27Q65 33 55 36L20 44Q8 44 2 35Z','rock')+
        p('M1 19Q1 12 13 9L44 2Q54 0 61 9L63 19Q61 24 51 26L20 34Q8 34 1 26Z','rock','stroke="none"',.18)+
        line('M14 33L48 25','rock-dark',fine)+circle(49,12,3,'rock','stroke="none"')+'</g>';
      return slug(14,65)+slug(47,48)+slug(24,16);
    }
    case 'silver':{
      const bar=(x,y)=>`<g transform="translate(${x} ${y})">`+
        p('M0 21L62 0L83 8V20L19 42L0 34Z','snow')+
        p('M19 30L83 8V20L19 42Z','glacier')+line('M0 21L19 30','ink',fine)+
        line('M10 21L60 5','tint-white',mini?6:4)+'</g>';
      return bar(15,70)+bar(26,46)+bar(12,21)+star(108,25,9);
    }
    case 'bauxite':return p('M14 94L18 72Q22 61 35 64L44 56L65 68L70 88L60 111L31 110Z','iron')+
      p('M39 68L43 38L55 25L76 29L90 22L108 43L110 66L94 83L72 85Z','lava','',-.18)+
      p('M49 37L61 33L74 40L89 34L101 47L88 59L70 53L60 65L44 61Z','iron','stroke="none"')+
      p('M68 94L75 75L93 70L109 82L113 101L98 113L78 111Z','iron')+
      [[31,80],[44,92],[64,43],[84,48],[92,91]].map(([x,y])=>circle(x,y,mini?3:2.5,'coal','stroke="none"')).join('')+
      (mini?'':line('M25 70L32 68M79 81L86 78','clay',3)+circle(79,39,2,'clay','stroke="none"'));
    case 'ilmenite':return p('M15 78L29 34L72 17L107 38L114 76L90 107L43 113Z','coal')+
      p('M29 34L72 17L91 40L45 60L15 78Z','rock-dark','stroke="none"')+
      p('M91 40L107 38L114 76L90 107L75 87Z','oil-sheen','stroke="none"',-.18)+
      line('M35 42L69 28M26 65L76 43','rock',mini?5:3)+
      line('M36 82L70 65M48 99L80 81','oil-sheen',mini?5:3)+
      (mini?'':line('M39 41L53 35','snow',3)+line('M92 53L99 68','rock',2));
    case 'platinum':return p('M21 92Q9 75 25 66Q22 51 39 50Q47 40 61 52L67 79L54 105Q34 118 21 92Z','snow')+
      p('M50 63Q40 42 57 32Q57 15 76 20Q89 13 101 28Q113 39 103 53Q110 67 93 76L69 80Z','snow')+
      p('M76 24L88 35L83 54L103 52Q110 67 93 76L69 80L60 65L75 51Z','glacier','stroke="none"')+
      p('M62 101Q57 83 72 79Q78 66 92 77Q109 74 113 91Q118 107 100 112H78Z','snow')+
      p('M87 82L97 92L111 90Q117 108 100 112H79L71 104Z','glacier','stroke="none"')+
      line('M60 34L68 28M24 71L31 64','tint-white',mini?6:4)+star(26,28,10);
    case 'bronze':{
      const ingot=(x,y)=>`<g transform="translate(${x} ${y})">`+
        p('M0 20L12 5L65 0L82 16L79 34L19 43L1 34Z','wood')+
        p('M0 20L12 5L65 0L82 16L20 28Z','iron')+
        p('M20 28L82 16L79 34L19 43Z','iron','',-.18)+
        ellipse(44,14,10,4,'wood',`stroke-width="${fine}"`)+line('M17 11L29 9','clay',mini?4:3)+'</g>';
      return ingot(25,67)+ingot(13,25);
    }
    case 'aluminium':return p('M27 42L88 19L108 28V87L47 110L27 101Z','snow')+
      p('M47 52L108 28V87L47 110Z','glacier')+
      p('M15 60L77 37L91 43V80L80 84V56L40 71V99L29 104L15 98Z','snow')+
      p('M15 60L29 66L91 43M29 66V104','none',`stroke-width="${fine}"`)+
      line('M36 45L83 28M40 72V93','tint-white',mini?6:4)+
      (mini?'':line('M55 61L101 44M56 70L100 53','snow',3));
    case 'titanium':return p('M15 69L31 43L91 24L112 49V85L48 111L15 94Z','rock-dark')+
      p('M15 69L31 43L91 24L112 49L48 78Z','coal')+
      p('M48 78L112 49V62L48 91Z','oil-sheen','stroke="none"')+
      line('M48 79V109','ink',fine)+line('M34 49L84 33','rock',mini?5:4)+
      (mini?'':line('M57 84L99 66','crystal',2)+line('M22 75L36 81','rock',3));
    default:throw new Error(`Unknown ore ${name}`);
  }
}

const active=token=>state==='idle'?token:'coal';
const base=()=>rect(31,225,194,12,'rock',6)+line('M42 233H214','rock-dark',5);
const foot=body=>body+base();
const post=(x,y,h,token='iron')=>rect(x,y,12,h,token,6);
const pipe=(d,token='rock',width=8)=>line(d,'ink',width+6)+line(d,token,width);
const anchor=(id,x,y)=>group(id,'',`transform="translate(${x} ${y})"`);

function smelter(tier){
  if(tier===1)return foot(
    (state==='idle'?line('M98 119C78 105 113 96 94 81C86 74 91 66 96 60','rock',6,'opacity="0.5"'):'')+
    anchor('smoke-anchor',98,119)+rect(47,144,99,82,'clay',27)+
    p('M132 158V207Q132 216 118 217H65','none',`stroke="${paint('iron')}" stroke-width="10"`)+
    ellipse(97,144,50,17,'rock-dark')+ellipse(97,142,36,11,'coal')+
    line('M52 180H69M123 184H137M59 206H69','iron',4)+
    p('M75 224V198Q75 181 96 181Q117 181 117 198V224Z','coal')+
    group('glow',ellipse(97,142,27,6,active('ascension'))+
      p('M84 220Q78 207 92 197L101 205L107 198Q119 219 103 220Z',active('energy')))+
    // A separate tapered crucible and its broad pouring lip read at small sizes.
    post(156,192,31,'rock-dark')+post(192,192,31,'rock-dark')+
    p('M149 157H208L201 195Q177 211 156 193Z','rock-dark')+
    p('M150 157L143 149L163 152','rock-dark')+ellipse(179,157,29,9,'coal')+
    ellipse(179,157,20,5,active('ascension'))+line('M167 157H188',active('energy'),3)+
    shine('M159 171L163 184M61 158L68 155'));
  return foot(
    post(49,65,159,'rock-dark')+post(195,65,159,'rock-dark')+rect(44,57,168,19,'rock',7)+
    line('M64 66H101','cream',4)+
    p('M48 160Q48 136 128 136Q208 136 208 160V198Q208 225 128 225Q48 225 48 198Z','rock')+
    p('M192 175V199Q185 215 141 217','none',`stroke="${paint('rock-dark')}" stroke-width="10"`)+
    ellipse(128,160,80,24,'rock-dark')+ellipse(128,160,64,17,active('deep-water'))+
    [87,121,155].map((x,i)=>rect(x,71,16,78+(i===1?7:0),'coal',5)+rect(x-3,89,22,9,'rock-dark',4)).join('')+
    group('glow',state==='idle'?line('M94 151L88 161L99 164L94 172M129 159L123 168L133 172M163 151L170 160L159 165L164 172','science',4)+
      line('M99 177H155','snow',4):'')+
    rect(87,187,83,24,'paper',7)+circle(103,199,5,active('science'))+line('M120 198H157','rock-dark',4)+shine('M58 184V195'));
}

function bellTower(){return foot(
  rect(82,70,92,155,'rock',14)+p('M156 81V211H100','none',`stroke="${paint('rock-dark')}" stroke-width="10"`)+
  line('M87 176H110M145 189H168M89 211H104','paper',4)+
  p('M91 158V103Q91 78 128 78Q165 78 165 103V158Z','coal')+
  line('M128 85V106','rock-dark',6)+
  group('bell',p('M102 142Q111 134 109 118Q108 101 128 101Q148 101 147 118Q145 134 154 142L158 150H98Z','iron')+
    p('M133 104Q149 105 146 124Q146 138 156 148H136Z','wood','stroke="none"')+
    ellipse(128,150,30,7,'wood')+circle(128,157,8,'iron')+shine('M117 118Q116 110 124 109'))+
  p('M71 76L116 43Q128 34 140 43L185 76Q128 88 71 76Z','iron')+
  shine('M88 69L118 48')+rect(78,165,100,11,'paper',5)+
  p('M114 225V204Q114 192 128 192Q142 192 142 204V225Z','iron')+circle(134,212,2,'cream','stroke="none"'));
}

function powerTower(){
  const mirror=(x,y,s=1)=>`<g transform="translate(${x} ${y}) scale(${s})">`+
    post(19,28,16,'rock-dark')+p('M0 6L44 0L49 29L5 35Z','snow')+
    p('M27 3L44 0L49 29L22 33Z','glacier','stroke="none"')+line('M8 12L35 8','tint-white',4)+'</g>';
  return foot(mirror(54,152,.8)+mirror(164,152,.8)+
    p('M108 225L118 77H138L148 225Z','paper')+
    p('M131 80H138L148 225H133Z','rock','stroke="none"')+
    rect(106,43,44,41,'rock-dark',12)+
    group('glow',(state==='idle'?circle(128,62,29,'energy','stroke="none" opacity="0.2"'):'')+
      circle(128,62,16,active('energy'))+(state==='idle'?star(128,62,11,'tint-white'):''))+
    shine('M122 95L119 126')+
    (state==='idle'?line('M82 160L118 84M181 160L138 84','cream',2,'opacity="0.6"'):'')+
    mirror(34,190)+mirror(172,190)+rect(112,203,32,22,'rock-dark',7));
}

function deepDrill(){
  const rig=p('M54 225L91 62H105L76 225ZM151 62H165L202 225H180Z','rock')+
    line('M82 123H175M73 164H184M83 125L176 163M174 125L84 164','rock-dark',6)+
    rect(84,53,88,18,'rock-dark',6)+rect(111,76,34,44,'paper',10)+circle(128,97,10,'rock-dark')+
    line('M128 111V143','coal',12)+rect(165,182,47,43,'paper',9)+
    circle(180,195,5,active('science'))+line('M178 210H200','rock-dark',4)+shine('M91 76L86 100');
  return foot(rig)+ellipse(128,232,27,5,'coal','stroke="none"')+
    group('drill',p('M115 140H141V205L128 236L115 205Z','rock-dark')+
      p('M130 143H140V204L128 231Z','oil-sheen','stroke="none"')+
      [151,173,195].map(y=>p(`M111 ${y+4}L140 ${y-6}L145 ${y+5}L116 ${y+15}Z`,'rock')+
        line(`M118 ${y+5}L138 ${y-2}`,'oil-sheen',3)).join('')+shine('M119 144V150'));
}

function fuelcell(){return foot(
  // Slender gas bottles and low flat hall distinguish this from the dome plants.
  pipe('M47 122V95H104V140','science')+pipe('M72 107V81H142V139','rock')+
  rect(35,121,25,103,'snow',12)+rect(62,108,25,116,'science',12)+
  rect(32,150,31,8,'rock',4)+rect(59,139,31,8,'rock',4)+
  shine('M42 137V167M69 124V137')+
  rect(87,137,124,89,'paper',17)+p('M196 151V205Q196 216 182 216H105','none',`stroke="${paint('rock')}" stroke-width="9"`)+
  rect(81,129,135,16,'snow',7)+shine('M94 134H126')+
  [154,174,194].map(y=>rect(101,y,74,14,'rock-dark',5)+rect(106,y+4,47,6,state==='idle'?'science':'coal',3,'stroke="none"')+
    circle(166,y+7,2,state==='idle'?'ok':'coal','stroke="none"')).join('')+
  pipe('M189 175V211H212','rock',6)+
  p('M215 211Q205 223 215 224Q225 223 215 211Z','water')+
  line('M181 157H197','rock-dark',3));
}

// Copied from gen-buildings.mjs so construction sprites use identical scaffolds.
function scaffolding(){return group('scaffolding',post(38,78,159)+post(206,78,159)+rect(30,113,196,12,'sand',5)+rect(30,186,196,12,'sand',5)+
  line('M46 181L207 127M47 202L199 230','iron',5)+post(176,154,83,'sand')+post(196,154,83,'sand')+
  [166,186,206,226].map(y=>line(`M180 ${y}H200`,'iron',4)).join(''));}

for(const name of ['tin','silver','bauxite','ilmenite','platinum','bronze','aluminium','titanium']){
  emit(`resource.${name}`,'resources',name,resource(name));
  emit(`resource.${name}.mini`,'resources',`${name}-mini`,`<g transform="scale(0.5)" stroke-width="8">${resource(name,true)}</g>`,64,{stroke:4});
}

for(const def of [
  {id:'smelter.t1',file:'smelter-t1',draw:()=>smelter(1),parts:['glow','smoke-anchor']},
  {id:'smelter.t2',file:'smelter-t2',draw:()=>smelter(2),parts:['glow']},
  {id:'bell-tower',draw:bellTower,parts:['bell']},
  {id:'power-tower',draw:powerTower,parts:['glow']},
  {id:'deep-drill',draw:deepDrill,parts:['drill']},
  {id:'power-fuelcell',draw:fuelcell,parts:[]},
])for(const mode of ['idle','construction','off']){
  state=mode;
  let body=def.draw();
  state='idle';
  if(mode==='construction')body=`<g opacity="0.4">${body}</g>${scaffolding()}`;
  emit(`building.${def.id}${mode==='idle'?'':'.'+mode}`,'buildings',`${def.file??def.id}${mode==='idle'?'':'-'+mode}`,body,256,
    {anchor:[.5,.9375],parts:[...def.parts,...(mode==='construction'?['scaffolding']:[])]});
}

write('art/manifest/ores.json',JSON.stringify({assets},null,2)+'\n');
console.log(`Ore art: ${assets.length} ids generated.`);
