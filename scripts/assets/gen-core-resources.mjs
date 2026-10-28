// Original, deterministic deep-core art. No external assets or shared-generator edits.
// Run: node scripts/assets/gen-core-resources.mjs
// Then: npm --prefix scripts/assets run assets:gen && npm --prefix scripts/assets run assets:check
import { C, svg, write } from './common.mjs';

// Local helpers follow the ore/warp-resource generators and the shared palette.
const p=(d,token,extra='',tone=0)=>`<path d="${d}" fill="${token==='none'?'none':C(token,tone)}" ${extra}/>`;
const line=(d,token,width=1.5)=>p(d,'none',`stroke="${C(token)}" stroke-width="${width}"`);
const circle=(x,y,r,token,extra='')=>`<circle cx="${x}" cy="${y}" r="${r}" fill="${C(token)}" ${extra}/>`;
const rect=(x,y,w,h,r,token,extra='')=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="${C(token)}" ${extra}/>`;
const pipe=(d,token,width)=>line(d,'ink',width+3)+line(d,token,width);

function coreIron(mini){
  // A broad, low hot-metal chunk with a cleft shoulder, not an ingot or a cube.
  const shell='M14 71L26 48Q29 42 36 43L54 47L69 33Q73 29 79 32L104 44Q110 46 111 53L115 78Q116 84 111 88L92 105Q87 110 80 109L27 101Q21 100 19 94L13 80Q11 75 14 71Z';
  const crack=mini?'M34 49L43 70L65 76L71 103M65 76L92 62L108 66':
    'M34 49L40 63L37 72L62 77L69 103M62 77L79 64L92 63L99 48M79 64L86 84L105 89';
  return p(shell,'danger','',-.18)+
    p('M15 71L28 47L53 51L72 35L91 42L85 59L62 75L35 78Z','lava','stroke="none"',-.18)+
    p('M87 60L109 50L114 78Q116 84 110 89L90 106L79 107L75 85Z','danger','stroke="none"',-.18)+
    p('M15 81L36 89L78 94L108 86L91 105Q87 110 79 108L27 100Q21 99 19 93Z','coal','stroke="none"')+
    line(crack,'lava',mini?12:8)+line(crack,'ascension',mini?7:4)+
    (mini?'':line('M40 63L37 72L62 77M79 64L92 63','energy',1.5)+
      line('M29 81L32 84M89 49L93 51','coal',2)+circle(51,91,2,'lava','stroke="none"'))+
    p(shell,'none')+line('M28 51L34 48L49 53M72 37L81 40','clay',mini?4:3);
}

function emberCrystal(mini){
  // One tall, off-center blade with a stepped shoulder; the flame is inside the facets.
  const shell='M47 111L31 83Q28 78 32 70L45 48L62 19Q65 14 69 19L86 44L82 59L99 73Q104 77 101 83L86 108Q84 112 77 113Z';
  return p(shell,'lava')+
    p('M63 20L67 55L47 79L48 109L32 83Q29 78 33 70L47 47Z','ascension','stroke="none"')+
    p('M68 22L85 45L80 60L99 76L78 88L77 111L61 103L65 78L67 55Z','lava','stroke="none"',-.18)+
    line('M47 79L67 55L81 60M47 79L62 104L78 88L98 77','iron',mini?3:1.5)+
    // Flat nested flame shapes supply the inner glow without disallowed SVG filters.
    p('M59 102Q42 94 51 78Q57 69 57 60Q71 67 69 78L77 70Q88 91 72 101Q66 106 59 102Z','ascension','stroke="none"')+
    p('M61 99Q52 92 59 83L64 76Q65 87 72 86Q77 97 67 101Z','energy','stroke="none"')+
    (mini?'':p('M63 96Q60 91 65 87Q72 94 66 97Z','cream','stroke="none"')+
      line('M68 29L77 43','clay',2)+line('M84 94L89 86','danger',2))+
    p(shell,'none')+line('M43 63L58 35','cream',mini?5:3)+
    circle(20,55,mini?4:3,'ascension','stroke="none"')+
    p('M105 35Q110 40 108 46Q102 48 101 43Z','energy',mini?'stroke="none"':'stroke-width="1.5"')+
    (mini?'':circle(108,99,2.5,'lava','stroke="none"')+circle(26,105,2,'ascension','stroke="none"'));
}

function deepQuartz(mini){
  // Straight quartz prisms fan outward on a shared base, unlike the curved xenocrystal.
  const left='M40 110L19 79L17 55Q17 51 21 53L43 66L58 98Z';
  const right='M70 105L88 61L105 48Q109 46 110 51L110 78L89 112Z';
  const center='M47 99V39Q47 35 51 32L64 17Q67 14 70 18L81 35Q83 38 83 42V98L67 113Z';
  return (mini?'':
    p('M40 103L30 47L37 30Q39 27 42 31L54 47L58 100Z','glacier')+
    line('M38 38L43 66','snow',3)+
    p('M72 102L79 44L89 30Q92 27 94 32L99 51L89 105Z','glacier')+
    line('M89 38L86 69','snow',3))+
    p(left,'snow')+p('M21 57L39 73L52 100L41 109L31 87Z','glacier','stroke="none"')+
    line('M22 63L27 78','crystal',mini?3:1.5)+p(left,'none')+
    p(right,'glacier')+p('M106 52L97 78L79 105L88 110L108 77Z','science','stroke="none"',.18)+
    line('M105 57L98 75','ok',mini?3:1.5)+p(right,'none')+
    p(center,'snow')+p('M68 19L68 50L81 39V97L67 112L62 97L62 54L49 39Z','glacier','stroke="none"')+
    line('M49 39L62 54L81 39M62 54V99','science',mini?3:1.5)+
    p('M63 57Q66 52 68 58L73 78L67 100Q65 105 62 99L56 79Z','tint-white','stroke="none"')+
    (mini?'':line('M72 27L78 36','ascension',1.5)+line('M73 100L78 93','danger',1.5)+
      line('M52 45V62M94 84L86 99','tint-white',2.5))+
    p(center,'none')+line('M52 35L64 22','tint-white',mini?5:3);
}

function deepSuit(mini){
  // Wide insulated shoulders, short boots, a dark heat visor and a helmet-mounted lamp.
  // The ordinary suit has slender limbs, a blue window and a blue chest computer.
  return rect(31,60,66,40,15,'rock-dark')+
    p('M36 58Q23 55 18 67L13 84Q11 91 18 94L27 97Q34 98 37 90L42 76ZM92 58Q105 55 110 67L115 84Q117 91 110 94L101 97Q94 98 91 90L86 76Z','snow')+
    rect(15,77,23,18,7,'ascension')+rect(90,77,23,18,7,'ascension')+
    p('M39 84H60V104Q60 115 51 115H34Q29 115 30 109L36 99ZM68 84H89L92 99L98 109Q100 115 94 115H77Q68 115 68 104Z','rock')+
    rect(29,103,30,12,5,'ascension')+rect(69,103,30,12,5,'ascension')+
    rect(36,56,56,41,14,'snow')+
    p('M79 61Q90 62 90 74V88Q89 95 80 95H73V67Z','rock','stroke="none"')+
    rect(42,61,44,26,8,'ascension')+
    (mini?line('M52 72H76','rock-dark',5):
      line('M51 69V79M61 69V79M71 69V79','rock-dark',3)+
      line('M22 69L31 72M97 72L106 69M21 84L29 87M99 87L107 84','rock-dark',2)+
      line('M45 92H54M74 92H83','glacier',3))+
    rect(33,48,62,15,7,'ascension')+
    circle(64,38,26,'snow')+
    p('M81 17Q96 32 88 48Q84 59 72 63L73 53L80 39Z','rock','stroke="none"')+
    rect(39,25,50,28,12,'space-deep')+
    p('M44 32Q44 28 50 28H77L48 45Q43 41 44 32Z','coal','stroke="none"')+
    line('M47 32H59','rock',mini?5:3)+
    rect(52,12,24,14,6,'rock-dark')+circle(64,19,5,'energy',mini?'stroke="none"':'stroke-width="1.5"')+
    (mini?'':circle(62,17,1.5,'cream','stroke="none"')+line('M44 23L49 19','tint-white',3)+
      pipe('M35 54Q24 51 24 63V68Q24 74 34 74H40','rock',4));
}

const assets=[];
for(const [id,draw] of Object.entries({'core-iron':coreIron,'ember-crystal':emberCrystal,'deep-quartz':deepQuartz,'deep-suit':deepSuit})){
  for(const mini of [false,true]){
    const size=mini?64:128,stem=id+(mini?'-mini':''),src=`art/src/resources/${stem}.svg`;
    // A real 4 px mini outline, with fewer facets/embers/seams than the 128 px master.
    const body=mini?`<g transform="scale(0.5)" stroke-width="8">${draw(true)}</g>`:draw(false);
    write(src,svg(body,size,size,mini?4:3));
    assets.push({id:`resource.${id}${mini?'.mini':''}`,category:'resources',src,
      out:`public/assets/sprites/resources/${stem}.png`,viewBox:[size,size],anchor:[.5,.5],frames:1,parts:[],
      tags:['deep-core',id,id==='deep-suit'?'equipment':'rare-ore',...(mini?['mini']:[])],phase:'P1'});
  }
}
write('art/manifest/core-resources.json',JSON.stringify({assets},null,2)+'\n');
console.log(`Deep-core resources: ${assets.length} ids generated.`);
