import {C, svg, round, write} from './common.mjs';

// Original PlanetForge paper-toy rig. All coordinates below use a 128-unit stage.
// Feet touch y=120; portraits reuse the head/gear at an independent bust scale.
const assets=[];
const group=(id,body,transform='')=>`<g id="${id}"${transform?` transform="${transform}"`:''}>${body}</g>`;
const path=(d,color='none',extra='')=>`<path d="${d}" fill="${color}" ${extra}/>`;
const ellipse=(x,y,rx,ry,color,extra='')=>`<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="${color}" ${extra}/>`;
const circle=(x,y,r,color,extra='')=>ellipse(x,y,r,r,color,extra);
const rect=(x,y,w,h,r,color,extra='')=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="${color}" ${extra}/>`;
const line=(d,color=C('ink'))=>path(d,'none',`stroke="${color}" stroke-width="1.5"`);
const flat='stroke="none"';
const defs=[
 {id:'burrowbeavers',animal:'beaver',color:'clay',fur:'iron',gear:'helmet',ears:'round',tail:'paddle',body:'pear',biome:'forest',phase:'P0'},
 {id:'quillfolk',animal:'hedgehog',color:'savanna',fur:'sand',gear:'basket',ears:'small',tail:'quills',body:'round',biome:'savanna',phase:'P0'},
 {id:'axolings',animal:'axolotl',color:'crystal',fur:'crystal',gear:'healer',ears:'gills',tail:'fin',body:'pear',biome:'swamp',phase:'P1'},
 {id:'shellguards',animal:'armadillo',color:'rock',fur:'rock',gear:'miner',ears:'small',tail:'shell',body:'round',biome:'mountains',phase:'P1'},
 {id:'dunehoppers',animal:'jerboa',color:'sand',fur:'sand',gear:'runner',ears:'tall',tail:'long',body:'hopper',biome:'desert',phase:'P1'},
 {id:'starowls',animal:'owl',color:'science',fur:'rock-dark',gear:'goggles',ears:'tufts',tail:'taper',body:'round',biome:'mountains',phase:'P1'},
 {id:'tideotters',animal:'otter',color:'water',fur:'iron',gear:'vest',ears:'small',tail:'taper',body:'pear',biome:'ocean',phase:'P1'},
 {id:'hornbeetles',animal:'beetle',color:'iron',fur:'iron',gear:'smith',ears:'horn',tail:'none',body:'insect',biome:'savanna',phase:'P1'},
 {id:'frostseals',animal:'seal',color:'snow',fur:'snow',gear:'scarf',ears:'none',tail:'none',body:'flipper',biome:'tundra',phase:'P1'},
 {id:'swapcoons',animal:'raccoon',color:'coal',fur:'rock',gear:'trader',ears:'round',tail:'striped',body:'pear',biome:'forest',phase:'P1'},
 {id:'glowsnails',animal:'snail',color:'toxic',fur:'grass',gear:'satchel',ears:'antennae',tail:'spiral',body:'slug',biome:'swamp',phase:'P1'},
 {id:'echobats',animal:'bat',color:'crystal',fur:'oil-sheen',gear:'crystal-miner',ears:'bat',tail:'wings',body:'pear',biome:'crystal',phase:'P1'},
];
function emit(id,category,name,size,anchor,frames,fps,parts,tags,phase,draw,extra={}){
 const suffix=frames>1?'-f{f}':'';
 assets.push({id,category,src:`art/src/${category}/${name}${suffix}.svg`,out:`public/assets/sprites/${category}/${name}${suffix}.png`,viewBox:[size,size],anchor,frames,...(frames>1?{fps}:{}),parts,tags,phase,...extra});
 for(let f=0;f<frames;f++)write(`art/src/${category}/${name}${frames>1?`-f${f+1}`:''}.svg`,svg(draw(f),size,size));
}
function tail(p){
 if(p.tail==='paddle')return group('tail',path('M49 99 Q22 64 13 82 Q5 108 42 112Z',C('iron',-.18))+line('M16 86L37 108M14 98L29 82M22 105L36 92'));
 if(p.tail==='quills')return group('tail',path('M29 103 Q12 92 19 82 L12 72 Q11 69 16 68 L24 65 L17 53 Q16 49 22 50 L34 53 L32 40 Q32 35 37 39 L48 46 L55 35 Q58 32 60 38 L63 51 Q85 63 82 91Z',C('iron'))+path('M21 72L36 76L29 61M29 88L43 86L39 72',C('savanna'),flat));
 if(p.tail==='fin')return group('tail',path('M46 107Q12 108 18 77Q26 63 30 75Q27 92 51 90Z',C(p.fur))+path('M22 78Q20 96 38 99','none',`stroke="${C(p.fur,.18)}" stroke-width="3"`));
 if(p.tail==='shell')return group('tail',ellipse(39,80,26,30,C(p.color))+path('M20 76Q26 53 45 56Q64 61 60 82Q55 104 36 96',C(p.color,-.18),flat)+line('M23 65Q43 61 58 76M18 77Q40 72 61 87M19 90Q38 84 57 98'));
 if(p.tail==='long')return group('tail',path('M49 100C17 125 5 106 12 87Q22 68 13 57','none',`stroke="${C('ink')}" stroke-width="5"`)+path('M49 100C17 125 5 106 12 87Q22 68 13 57','none',`stroke="${C(p.fur)}" stroke-width="2"`)+ellipse(12,54,5,7,C('tint-white'),'transform="rotate(-22 12 54)"'));
 if(p.tail==='taper')return group('tail',path('M47 103Q25 119 12 100Q37 100 37 82Z',C(p.fur)));
 if(p.tail==='striped')return group('tail',path('M44 109Q9 113 12 85Q14 71 24 77Q27 93 48 93Z',C('rock'))+path('M12 88L28 87L32 97L16 99M26 108L29 98L39 99L40 109Z',C('coal'),flat));
 if(p.tail==='spiral')return group('tail',circle(39,84,28,C('toxic'))+path('M16 83Q16 58 39 58Q62 61 64 83Q61 107 40 110Q61 99 54 78Q50 64 36 68Z',C('toxic',-.18),flat)+path('M36 102Q17 94 23 78Q30 65 44 73Q57 86 43 94Q34 98 32 87Q30 82 38 81', 'none',`stroke="${C('ink')}" stroke-width="3"`)+ellipse(29,65,7,3,C('toxic',.18),flat));
 if(p.tail==='wings')return group('tail',path('M48 81Q26 60 10 58Q10 78 17 92Q28 83 32 101Q42 88 51 100Z',C('crystal'))+line('M48 91L17 66M31 98L17 66'));
 return group('tail','');
}
function ears(p){
 const fur=C(p.fur);
 if(p.ears==='round'||p.ears==='small'){
  const r=p.ears==='small'?7:9;
  return ellipse(49,47,r,r,fur)+ellipse(79,42,r,r,fur)+circle(48,46,r/2,C('clay'),flat)+circle(78,41,r/2,C('clay'),flat);
 }
 if(p.ears==='gills')return [-1,1].map(sign=>`<g transform="translate(${sign===1?126:0} 0) scale(${sign===1?-1:1} 1)">${path('M45 61L27 42Q24 35 29 36L45 49L28 52Q20 51 23 58L42 64L29 70Q21 73 28 77L47 70Z',C('crystal'))}</g>`).join('');
 if(p.ears==='tall')return ellipse(48,38,11,16,fur,'transform="rotate(-18 48 38)"')+ellipse(77,35,12,17,fur,'transform="rotate(12 77 35)"')+ellipse(48,37,7,11,C('cream'),flat)+ellipse(77,34,8,12,C('cream'),flat);
 if(p.ears==='tufts')return path('M41 59L37 36Q37 32 42 35L59 44L77 42L90 33Q94 31 92 38L88 61Z',fur);
 if(p.ears==='horn')return path('M69 51Q83 41 78 27L85 32L91 27Q101 48 85 60Z',C('iron'));
 if(p.ears==='antennae')return path('M60 52L53 34M82 51L89 30','none',`stroke="${C('ink')}" stroke-width="8"`)+path('M60 52L53 34M82 51L89 30','none',`stroke="${C(p.fur)}" stroke-width="5"`)+circle(53,32,6,C(p.fur))+circle(89,29,6,C(p.fur));
 if(p.ears==='bat')return path('M45 60Q28 45 36 25Q43 23 58 48M76 48Q84 22 91 24Q103 45 88 60',fur)+path('M44 46L39 31L52 49M83 47L89 30L91 47',C('clay'),flat);
 return '';
}
function face(p,expression,portrait){
 const x=p.animal==='snail'?53:portrait?65:78, y=p.animal==='snail'?32:62, second=portrait||p.animal==='snail';
 const eye=(ex)=>expression==='happy'?path(`M${ex-3} ${y}Q${ex} ${y-5} ${ex+3} ${y}`):ellipse(ex,y,2.8,4.2,C('ink'),flat)+circle(ex-.7,y-1.5,.8,C('cream'),flat);
 let result='';
 if(p.animal==='raccoon')result+=path('M48 58Q63 48 74 56Q86 48 94 58L94 68Q82 73 73 65Q59 74 48 66Z',C('coal'),flat);
 if(p.animal==='owl')result+=ellipse(62,63,14,16,C('cream'),flat)+ellipse(84,63,12,15,C('cream'),flat);
 result+=eye(x)+(second?eye(p.animal==='snail'?89:84):'');
 if(expression==='angry')result+=line(`M${x-4} ${y-(p.animal==='owl'?5:8)}L${x+3} ${y-(p.animal==='owl'?2:5)}`)+(second?line(p.animal==='snail'?'M86 27L93 24':p.animal==='owl'?'M81 60L88 57':'M81 57L88 54'):'');
 if(p.animal==='owl')return result+path('M73 72Q79 69 84 73L79 80Z',C('sand'))+line('M55 84L59 87M65 86L69 89');
 if(p.animal==='snail'||p.animal==='beetle')return result+(expression==='angry'?line('M76 79Q83 75 90 79'):line('M76 76Q84 86 92 76'));
 result+=ellipse(portrait?78:88,73,14,10,C('cream'),flat);
 result+=ellipse(portrait?82:99,68,4,3,C('ink'),flat);
 result+=expression==='angry'?line(portrait?'M73 80Q80 76 87 80':'M83 80Q89 77 94 80'):line(portrait?'M73 77Q80 85 87 77':'M82 77Q88 82 94 76');
 if(p.animal==='seal'||p.animal==='otter')result+=line('M75 74L66 71M75 78L65 79M93 74L103 72M93 78L103 80');
 if(p.animal==='beaver')result+=rect(portrait?76:85,79,9,7,2,C('snow'))+line(portrait?'M80.5 80V85':'M89.5 80V85');
 return result;
}
function head(p,expression='neutral',portrait=false){
 if(bodyVariants[p.body]?.head)return group('head',bodyVariants[p.body].head(p,expression,portrait));
 const fur=C(p.fur);
 return group('head',ears(p)+path(p.animal==='hedgehog'?'M45 51Q59 37 77 47Q88 53 92 64L102 69Q106 77 97 82Q83 91 59 85Q37 80 40 63Z':'M43 49Q58 37 78 44Q96 48 96 65Q108 73 96 82Q77 94 55 84Q37 77 41 61Z',fur)+path('M44 65Q43 83 69 85Q87 88 97 78Q84 86 70 80Q51 80 49 65Z',C(p.fur,-.18),flat)+ellipse(57,52,8,4,C(p.fur,.18),flat)+face(p,expression,portrait));
}
function clothing(p,portrait=false){
 if(bodyVariants[p.body]?.clothing)return group('clothing',bodyVariants[p.body].clothing(p))+group('headwear','');
 const color=C(p.color);
 if(p.gear==='helmet')return group('clothing',path('M43 93Q65 103 81 89L84 108Q63 117 44 107Z',color)+line('M53 95V107M73 95V107')+rect(55,102,15,9,3,C('paper')))+group('headwear',path('M39 48Q36 29 59 27Q83 25 91 45Z',C('energy'))+path('M40 46Q62 39 94 45L96 50Q66 48 39 53Z',C('energy'))+path('M60 29L62 42','none',`stroke="${C('energy',-.18)}" stroke-width="5"`));
 if(p.gear==='basket')return group('clothing',path('M43 89Q60 99 80 87L80 95Q61 106 43 98Z',color)+line('M49 93L65 111'))+group('headwear','')+group('basket',path('M21 88Q30 78 40 88','none')+rect(17,88,28,22,5,C('savanna'))+line('M19 96H43M20 103H42M26 90V108M35 90V108')+circle(24,88,5,C('danger'))+circle(34,87,5,C('clay'))+path('M29 84Q27 75 36 79Q37 84 29 84Z',C('leaf')));
 let gear='';
 if(p.gear==='healer')gear=path('M44 90L61 99L80 88L82 102L60 110L43 101Z',C('cream'))+path('M59 96Q53 90 50 96Q48 101 60 106Q72 99 66 95Q62 92 59 96Z',C('danger'),flat);
 if(p.gear==='miner')gear=path('M47 89L69 104L79 96L80 109L68 114L44 99Z',color)+rect(44,91,11,12,3,C('iron'));
 if(p.gear==='runner')gear=path('M43 84Q63 91 82 83L84 90L61 98L43 91Z',C('clay'))+path('M45 87L26 86L28 94L45 95Z',C('clay'));
 if(p.gear==='goggles')gear=path('M40 51Q64 41 91 49','none',`stroke="${C('iron')}" stroke-width="7"`)+circle(60,48,9,C('science'))+circle(80,47,9,C('science'))+line('M56 47L60 43M77 46L81 42',C('snow'))+path('M49 92L63 99L78 91L81 109L43 109Z',color);
 if(p.gear==='vest')gear=path('M44 82L58 87L58 111L41 107Z',C('ascension'))+path('M66 87L78 81L84 106L66 111Z',C('ascension'))+line('M43 97H81')+rect(57,95,10,7,2,C('cream'));
 if(p.gear==='smith')gear=path('M48 84L74 83L83 108Q63 118 42 108Z',C('coal'))+path('M48 85L52 96M73 84L70 96','none',`stroke="${C('sand')}" stroke-width="3"`)+rect(55,99,17,11,3,color);
 if(p.gear==='scarf')gear=path('M43 81Q64 92 84 81L84 91Q65 103 42 91Z',C('danger'))+rect(45,92,12,19,3,C('danger'))+line('M46 96L55 99M46 103L55 106',C('cream'));
 if(p.gear==='trader')gear=rect(20,77,24,32,6,C('savanna'))+rect(18,73,28,12,4,C('iron'))+rect(24,66,9,10,3,C('crystal'))+circle(38,72,6,C('grass'))+path('M44 88L76 108','none',`stroke="${C('savanna')}" stroke-width="5"`);
 if(p.gear==='satchel')gear=path('M61 87L83 108','none',`stroke="${C('iron')}" stroke-width="4"`)+rect(70,99,18,12,4,C('iron'))+circle(80,104,2,C('toxic'),flat);
 if(p.gear==='crystal-miner')gear=path('M43 86Q64 95 83 84L83 92L66 102L44 94Z',C('science'))+path('M64 95L70 88L77 96L70 107Z',C('crystal'));
 return group('clothing',gear)+group('headwear','');
}
// Optional anatomy hooks keep the shared animation, palette, gear and part ids.
// They replace only body geometry; the default rig remains byte-for-byte stable.
function roundEyes(expression,positions,y,r=4.5){
 return positions.map(x=>(expression==='happy'?path(`M${x-r} ${y}Q${x} ${y-6} ${x+r} ${y}`):circle(x,y,r,C('ink'),flat)+circle(x-1.5,y-1.5,1.3,C('cream'),flat))+(expression==='angry'?line(`M${x-r} ${y-r-3}L${x+r} ${y-r}`):'')).join('');
}
function heldTool(){
 return group('tool',rect(89,65,5,33,2,C('iron'))+rect(82,64,22,10,3,C('rock'))+path('M85 65H99','none',`stroke="${C('rock',.18)}" stroke-width="2"`));
}
const bodyVariants={
 hopper:{
  bounce:({state,frame,bob})=>state==='walk'?[1,-6,-8,-2][frame]:bob,
  head:(p,expression,portrait)=>ears(p)+ellipse(69,65,24,22,C(p.fur))+path('M48 70Q54 91 78 84L91 75Q78 85 61 77Z',C('savanna'),flat)+ellipse(60,52,8,4,C('sand',.18),flat)+ellipse(portrait?77:88,75,10,8,C('cream'),flat)+roundEyes(expression,portrait?[62,81]:[81],62)+ellipse(portrait?79:96,72,2.5,2,C('ink'),flat)+line(portrait?'M79 75V78M72 78Q79 84 86 78':'M91 77Q95 82 100 77')+line(portrait?'M67 74L56 71M67 78L56 80M90 74L100 71M90 78L101 80':'M88 74L102 70M89 78L104 79'),
  body:p=>ellipse(59,88,19,18,C(p.fur))+ellipse(65,90,11,14,C('cream'),flat),
  feet:(p,{state,frame})=>{
   const lift=state==='walk'?[0,5,8,0][frame]:0;
   const leg=(x,near)=>ellipse(x,94,near?10:9,12,C(near?'sand':'savanna'))+path(`M${x+2} 98L${x+17} 108L${x+3} 115`,'none',`stroke="${C('ink')}" stroke-width="8"`)+path(`M${x+2} 98L${x+17} 108L${x+3} 115`,'none',`stroke="${C(near?'sand':'savanna')}" stroke-width="5"`)+ellipse(x+14,115,18,3.5,C(near?'sand':'savanna'));
   return `<g transform="translate(0 ${-lift})">${leg(40,false)}${leg(63,true)}</g>`;
  },
  arms:(p,{state,angle})=>group('arm',path('M69 87Q75 81 81 86M70 93Q77 87 84 91','none',`stroke="${C('ink')}" stroke-width="5"`)+path('M69 87Q75 81 81 86M70 93Q77 87 84 91','none',`stroke="${C(p.fur)}" stroke-width="2"`)+(state==='work'?heldTool():'')+ellipse(state==='work'?88:81,86,3.5,3,C('sand'))+ellipse(state==='work'?90:84,93,3.5,3,C('sand')),state==='work'?`rotate(${angle} 78 91)`:''),
  portraitBody:p=>tail(p)+group('bust',group('body',bodyVariants.hopper.body(p))+group('feet',bodyVariants.hopper.feet(p,{state:'idle',frame:0}))),
 },
 insect:{
  head:(p,expression,portrait)=>{
   const horns=path('M59 52Q54 43 60 32Q64 29 64 34Q63 43 74 46Z',C('iron',-.18))+path('M77 48Q94 42 96 29Q95 20 99 22Q111 43 90 55Z',C('iron'))+path('M86 45Q99 39 99 29','none',`stroke="${C('iron',.18)}" stroke-width="2"`);
   const antennae=path('M62 57L53 48L49 49M91 57L100 48L104 49','none',`stroke="${C('ink')}" stroke-width="3"`)+circle(49,48,2,C('iron'))+circle(104,48,2,C('iron'));
   return antennae+horns+ellipse(78,62,21,17,C('iron'))+path('M59 65Q66 82 88 75Q99 70 98 61Q90 76 69 70Z',C('iron',-.18),flat)+ellipse(69,51,7,3,C('iron',.18),flat)+roundEyes(expression,portrait?[70,87]:[86],61,4)+(expression==='angry'?line('M79 72Q86 68 92 72'):line('M79 69Q86 78 93 69'));
  },
  body:()=>ellipse(52,87,29,24,C('iron'))+path('M53 64Q81 67 81 88Q78 111 53 111Z',C('iron',-.18),flat)+path('M53 65Q48 87 53 110','none',`stroke="${C('ink')}" stroke-width="2"`)+ellipse(38,76,8,4,C('iron',.18),flat)+path('M62 76Q71 80 73 86','none',`stroke="${C('iron')}" stroke-width="3"`),
  feet:(p,{state,frame,step=0})=>{
   // Four planted limbs plus the two foreground arms = six insect legs.
   // Alternating diagonal pairs lift, while the other pair remains at y=120.
   const shifts=state==='walk'?[step,-step,-step,step]:[0,0,0,0];
   return [
    'M36 90L24 104L24 115L17 118.5',
    'M66 91L82 103L88 115L96 118.5',
    'M43 100L34 109L40 118.5L48 118.5',
    'M65 100L72 109L67 118.5L76 118.5',
   ].map((d,i)=>{
    const lift=state==='walk'&&((frame===1&&[0,3].includes(i))||(frame===3&&[1,2].includes(i)))?3:0;
    // Endpoints at 117 keep the 3px outer radius on the 120px ground line.
    d=d.replaceAll('118.5','117');
    return `<g transform="translate(${shifts[i]} ${-lift})">${path(d,'none',`stroke="${C('ink')}" stroke-width="6"`)}${path(d,'none',`stroke="${C('iron',i<2?-.18:0)}" stroke-width="3"`)}</g>`;
   }).join('');
  },
  arms:(p,{state,angle})=>{
   const limbs='M74 82L85 79L93 86M72 92L83 99L94 93';
   return group('arm',path(limbs,'none',`stroke="${C('ink')}" stroke-width="6"`)+path(limbs,'none',`stroke="${C('iron')}" stroke-width="3"`)+(state==='work'?heldTool():'')+path('M92 83Q98 84 95 89M93 90Q99 92 94 96','none',`stroke="${C('ink')}" stroke-width="3"`),state==='work'?`rotate(${angle} 78 91)`:state==='walk'?`rotate(${round(angle/3)} 78 91)`:'');
  },
  clothing:()=>path('M30 96Q51 103 76 96L76 101Q53 108 31 102Z',C('coal'))+rect(52,99,8,6,2,C('rock'))+rect(33,98,9,9,2,C('rock-dark'))+line('M36 99V104',C('rock',.18)),
  portraitBody:p=>group('tail','')+group('bust',group('feet',bodyVariants.insect.feet(p,{state:'idle',frame:0}))+group('body',bodyVariants.insect.body(p))),
 },
};
function rig(p,{state='idle',frame=0,expression='neutral',portrait=false}={}){
 let bob=state==='idle'?frame:state==='walk'?[0,-2,0,-2][frame]:frame?-1:1;
 const variant=bodyVariants[p.body];
 if(variant?.bounce)bob=variant.bounce({state,frame,bob});
 const step=state==='walk'?[-5,0,5,0][frame]:0;
 const lift=state==='walk'&&frame===1?3:0;
 const frontLift=state==='walk'&&frame===3?3:0;
 let feet=group('feet',ellipse(50-step,114.5-lift,11,4,C(p.fur))+ellipse(74+step,114.5-frontLift,12,4,C(p.fur)));
 if(p.body==='flipper')feet=group('feet',ellipse(43-step,114.5-lift,16,4,C(p.fur))+ellipse(80+step,114.5-frontLift,16,4,C(p.fur)));
 if(p.body==='hopper')feet=group('feet',ellipse(49-step,114.5-lift,17,4,C(p.fur))+ellipse(78+step,114.5-frontLift,18,4,C(p.fur)));
 if(p.body==='slug')feet=group('feet',path(`M21 113Q32 ${state==='walk'?[103,105,107,104][frame]:103} 55 108Q82 107 99 112Q104 118.5 91 118.5H27Q18 118.5 21 113Z`,C(p.fur)));
 if(variant?.feet)feet=group('feet',variant.feet(p,{state,frame,step}));
 const body=group('body',variant?.body?variant.body(p):ellipse(p.body==='slug'?76:61,93,['round','flipper'].includes(p.body)?27:21,22,C(p.fur))+path('M51 79Q70 76 76 93Q77 109 64 112Q45 113 44 98Z',C('cream'),flat));
 const angle=state==='work'?(frame===0?-40:22):state==='walk'?-step*3:0;
 let arm=group('arm',ellipse(80,94,8,6,C(p.fur)),`rotate(${angle} 77 89)`);
 if(state==='work')arm=group('arm',ellipse(82,92,8,6,C(p.fur))+group('tool',rect(89,65,5,33,2,C('iron'))+rect(82,64,22,10,3,C('rock'))+path('M85 65H99', 'none',`stroke="${C('rock',.18)}" stroke-width="2"`)),`rotate(${angle} 78 91)`);
 if(variant?.arms)arm=variant.arms(p,{state,frame,angle});
 const upper=tail(p)+body+head(p,expression,portrait)+clothing(p,portrait)+arm;
 return feet+group('pose',upper,`translate(0 ${bob})`);
}
function portrait(p,expression){
 // A 3/4 face with two eyes; bust expands toward the bottom, without a background tile.
 const variant=bodyVariants[p.body];
 if(variant?.portraitBody)return `<g transform="translate(-30 -70) scale(4.8)" stroke-width="2.5">${variant.portraitBody(p)}${head(p,expression,true)}${clothing(p,true)}${variant.arms(p,{state:'idle',frame:0,angle:0})}</g>`;
 return `<g transform="translate(-30 -70) scale(4.8)" stroke-width="2.5">${['quills','shell','spiral','wings','striped'].includes(p.tail)?tail(p):''}${group('bust',path('M35 113Q37 84 65 83Q92 80 102 113Q69 124 35 113Z',C(p.color)))}${head(p,expression,true)}${clothing(p,true)}</g>`;
}
function symbol(p){
 const f=C(p.color,-.18), gold=C('sand');
 const shapes={
 axolotl:path('M38 73L24 53L44 61L41 38L58 55Q64 48 72 55L87 38L84 61L104 53L90 76Q66 96 38 73Z',C('crystal'))+path('M59 61Q49 53 46 63Q44 72 65 83Q87 67 78 60Q70 54 65 62Z',C('cream')),
 armadillo:path('M28 76Q26 37 64 33Q101 39 100 77L90 93H38Z',C('rock'))+line('M38 53Q64 43 91 54M32 68Q65 56 98 69M34 82Q65 71 94 82'),
 jerboa:path('M54 85Q20 109 24 70Q26 60 21 53','none',`stroke="${C('ink')}" stroke-width="4"`)+ellipse(20,51,4,6,C('tint-white'))+ellipse(59,76,16,17,gold)+ellipse(51,44,10,14,gold)+ellipse(77,40,11,15,gold)+ellipse(68,63,22,19,gold)+ellipse(76,70,11,7,C('cream'),flat)+circle(78,59,4,C('ink'),flat)+ellipse(87,67,2,2,C('ink'),flat)+line('M82 71L98 69M82 74L98 77')+path('M55 85L69 94L57 102','none',`stroke="${C('ink')}" stroke-width="7"`)+ellipse(74,102,19,4,C('clay')),
 owl:circle(64,66,31,C('science'))+circle(51,64,16,C('cream'))+circle(78,64,16,C('cream'))+circle(53,64,5,C('ink'),flat)+circle(76,64,5,C('ink'),flat)+path('M58 78L70 78L64 87Z',gold),
 otter:circle(64,65,32,C('ascension'))+circle(64,65,16,C('water'))+path('M29 62H45M83 62H99M61 31V47M61 83V99','none',`stroke="${C('cream')}" stroke-width="9"`),
 beetle:path('M46 71L31 76L24 91M47 88L36 98L38 107M81 87L93 98L92 107M83 68L98 74L105 89M45 62L31 54L25 62M86 59L99 51L105 60','none',`stroke="${C('ink')}" stroke-width="4"`)+ellipse(64,79,25,28,C('iron'))+path('M64 52Q91 53 89 81Q85 106 64 107Z',C('iron',-.18),flat)+line('M64 53V106')+ellipse(53,67,6,3,C('iron',.18),flat)+path('M58 53Q47 43 53 32Q56 41 66 43M68 44Q82 37 80 22Q94 34 80 49Z',C('iron'))+path('M54 52L44 42M80 51L92 41','none',`stroke="${C('ink')}" stroke-width="3"`)+ellipse(68,54,19,13,C('iron'))+circle(61,53,3,C('ink'),flat)+circle(76,53,3,C('ink'),flat)+line('M62 61Q68 66 74 61'),
 seal:path('M36 73Q21 63 22 52Q38 48 50 68Q47 39 64 30Q83 38 79 68Q92 49 107 54Q104 72 84 79L80 96L44 96Z',C('snow'))+path('M47 80Q64 88 82 79L80 90H46Z',C('danger')),
 raccoon:rect(33,50,63,48,8,C('savanna'))+path('M32 51L64 32L97 51L65 69Z',C('iron'))+path('M35 48Q43 37 53 46L49 56L39 56Z',C('coal'))+path('M77 45Q88 36 95 47L90 57L80 55Z',C('coal')),
 snail:circle(64,66,32,C('toxic'))+path('M63 91Q36 86 43 61Q50 39 73 50Q94 67 73 81Q59 88 54 73Q51 62 65 62','none',`stroke="${C('ink')}" stroke-width="5"`),
 bat:path('M61 59Q39 32 20 43L25 74Q39 62 42 89Q53 74 64 94Q78 74 89 89Q92 63 105 73L108 43Q88 32 67 59Z',C('crystal'))+path('M64 48L78 67L64 91L50 67Z',C('science')),
 };
 return shapes[p.animal]??circle(64,64,22,f);
}
function emblem(p){
 const logs=group('symbol',group('log-a',rect(29,56,69,18,8,C('iron'))+ellipse(34,65,7,9,C('sand'))+line('M47 61H89M49 68H83'),'rotate(35 64 64)')+group('log-b',rect(29,56,69,18,8,C('iron'))+ellipse(34,65,7,9,C('sand'))+line('M47 61H89M49 68H83'),'rotate(-35 64 64)'));
 const berry=group('symbol',path('M36 80L30 62L43 65L44 40L58 52L69 32L77 56L96 49L91 72L101 78L82 91Z',C('iron'))+circle(58,72,13,C('danger'))+circle(77,78,13,C('clay'))+path('M66 60Q60 45 80 48Q80 61 66 60Z',C('leaf')));
 return `<g transform="scale(2)" stroke-width="3">${circle(64,64,55,C(p.color))}${path('M17 70Q30 113 74 109Q100 104 112 79Q107 118 65 119Q23 117 17 70Z',C(p.color,-.18),flat)}${path('M26 42Q34 24 54 21','none',`stroke="${C(p.color,.18)}" stroke-width="5"`)}${p.animal==='beaver'?logs:p.animal==='hedgehog'?berry:group('symbol',symbol(p))}</g>`;
}
for(const p of defs){
 emit(`people.${p.id}.portrait`,'peoples',`${p.id}-portrait`,512,[.5,.5],1,0,['head','clothing'],[p.id,p.animal,p.biome,'portrait'],p.phase,()=>portrait(p,'neutral'));
 for(const [state,frames,fps] of [['idle',2,2],['walk',4,8],['work',2,3]])emit(`people.${p.id}.citizen.${state}`,'peoples',`${p.id}-citizen-${state}`,128,[.5,.9375],frames,fps,['head','body','tail','feet','arm','clothing',...(state==='work'?['tool']:[])],[p.id,'citizen',state,'facing-right'],p.phase,f=>rig(p,{state,frame:f}));
 for(const expression of ['happy','angry'])emit(`people.${p.id}.portrait.${expression}`,'peoples',`${p.id}-portrait-${expression}`,512,[.5,.5],1,0,['head','clothing'],[p.id,'portrait',expression],'P1',()=>portrait(p,expression));
 emit(`people.${p.id}.emblem`,'peoples',`${p.id}-emblem`,256,[.5,.5],1,0,['symbol'],[p.id,'emblem'],p.phase,()=>emblem(p));
}
emit('people.citizen-ring','peoples','citizen-ring',128,[.5,.9375],1,0,[],['coop','engine-tinted'],'P0',()=>ellipse(64,120,30,5,'none',`stroke="${C('tint-white')}" stroke-width="3"`));
// Monsters use the same outline / palette vocabulary, with independent silhouettes.
function monster(id,frame=0){
 const bob=frame?-1:1;
 if(id==='rockmunch'){
  const feet=group('feet',[27,47,68,90].map(x=>rect(x-5,99,10,16,4,C('moss'))+ellipse(x,114.5,8,4,C('rock-dark'))).join(''));
  const segments=group('body',[27,43,60].map((x,i)=>ellipse(x,94-i*5,16,17+i*2,C('moss'))).join('')+path('M15 94Q13 81 27 80M32 84Q33 73 43 72','none',`stroke="${C('moss',.18)}" stroke-width="4"`));
  const head=group('head',path('M62 47Q91 24 108 50Q121 78 107 101Q90 117 66 100Q50 82 62 47Z',C('moss'))+path('M102 46Q121 80 101 100Q82 111 66 95Q95 102 103 82Z',C('moss',-.18),flat)+ellipse(74,48,9,5,C('moss',.18),flat)+ellipse(78,64,4,6,C('ink'),flat)+ellipse(101,61,4,6,C('ink'),flat)+line('M71 54L82 57M97 54L106 51')+path('M68 80Q90 69 110 78Q108 104 87 102Q69 99 68 80Z',C('ink'))+[72,85,98].map((x,i)=>rect(x,78-i%2*2,9,11,3,C('rock'))).join('')+rect(82,94,10,7,3,C('rock')));
  const snack=group('snack',path('M98 108L105 99L117 101L120 113L107 117Z',C('rock'))+line('M106 103L109 110L116 110'));
  return feet+group('idle',segments+head+snack,`translate(0 ${bob})`);
 }
 if(id==='stormjelly'){
  const tendrils=group('tentacles',path(frame?'M37 76Q29 90 43 102Q51 113 40 116.5M62 78Q77 93 60 103Q52 112 62 116.5M86 77Q94 94 83 102Q79 110 91 116.5':'M37 76Q47 90 34 102Q27 113 40 116.5M62 78Q47 93 65 103Q73 112 62 116.5M86 77Q74 94 88 102Q98 110 91 116.5','none',`stroke="${C('ink')}" stroke-width="7"`)+path(frame?'M37 76Q29 90 43 102Q51 113 40 116.5M62 78Q77 93 60 103Q52 112 62 116.5M86 77Q94 94 83 102Q79 110 91 116.5':'M37 76Q47 90 34 102Q27 113 40 116.5M62 78Q47 93 65 103Q73 112 62 116.5M86 77Q74 94 88 102Q98 110 91 116.5','none',`stroke="${C('science')}" stroke-width="4"`));
  const head=group('head',path('M17 70Q7 52 23 44Q19 26 37 27Q48 11 64 23Q80 15 88 31Q108 27 107 48Q124 61 109 76Q96 89 82 81Q66 94 52 82Q32 94 17 70Z',C('science'))+path('M17 65Q26 80 43 72Q53 86 68 76Q80 84 91 73Q107 81 115 65Q118 80 105 82Q91 89 82 81Q66 94 52 82Q32 94 17 70Z',C('science',-.18),flat)+path('M25 45Q26 33 40 36Q48 22 60 29','none',`stroke="${C('science',.18)}" stroke-width="5"`)+ellipse(50,59,4,5,C('ink'),flat)+ellipse(79,58,4,5,C('ink'),flat)+line('M45 50L54 53M75 52L83 49')+path('M58 72Q65 66 72 71')+path('M66 31L55 48L66 46L61 58L79 38L68 40Z',C('energy')));
  return tendrils+group('idle',head,`translate(0 ${bob})`);
 }
 const feet=group('feet',rect(37,98,12,18,4,C('leaf'))+rect(87,98,12,18,4,C('leaf'))+ellipse(43,114.5,13,4,C('leaf'))+ellipse(93,114.5,14,4,C('leaf')));
 const tail=group('tail',path('M43 100Q18 112 9 93Q27 95 30 75Z',C('leaf')));
 const shell=group('shell',path('M28 97L22 76Q20 72 27 71L34 71L30 55Q30 51 35 54L46 61L49 41Q50 35 55 42L62 56L74 42Q79 38 78 45L77 62L93 55Q98 54 95 61L88 76L103 85Q107 89 100 91L86 96Z',C('savanna'))+ellipse(57,85,29,23,C('moss'))+path('M36 84L46 68L64 67L77 79L71 99L48 103Z',C('moss',-.18))+line('M46 68L51 84L36 84M51 84L71 99M51 84L77 79'));
 const head=group('head',path('M79 67Q97 52 109 67L111 78Q125 82 119 95Q113 109 88 104Q74 102 76 87Z',C('leaf'))+path('M82 96Q101 108 119 92Q116 108 91 106Q81 105 82 96Z',C('leaf',-.18),flat)+ellipse(91,69,6,3,C('leaf',.18),flat)+ellipse(101,80,4,5,C('ink'),flat)+line('M96 73L104 75')+line('M96 95Q104 100 114 93')+path('M101 97L105 104L109 97Z',C('cream'))+circle(116,86,1.5,C('ink'),flat));
 return feet+tail+group('idle',shell+head,`translate(0 ${bob})`);
}
for(const id of ['rockmunch','stormjelly','thornback']){
 emit(`monster.${id}.portrait`,'monsters',`${id}-portrait`,512,[.5,.5],1,0,['head'],[id,'portrait'],'P1',()=>`<g transform="translate(-5 -18) scale(4.1)" stroke-width="2.9">${monster(id)}</g>`);
 emit(`monster.${id}.sprite`,'monsters',`${id}-sprite`,256,[.5,.9375],2,2,['head',...(id==='stormjelly'?['tentacles']:['feet'])],[id,'planet','idle'],'P1',f=>`<g transform="scale(2)" stroke-width="3">${monster(id,f)}</g>`);
}
const pipFaces=[[[64,64]],[[44,44],[84,84]],[[44,44],[64,64],[84,84]],[[44,44],[84,44],[44,84],[84,84]],[[44,44],[84,44],[64,64],[44,84],[84,84]],[[44,40],[84,40],[44,64],[84,64],[44,88],[84,88]]];
emit('monster.dice','monsters','fx-dice',128,[.5,.5],6,10,['pips'],['battle','dice','faces-1-to-6'],'P1',f=>rect(18,18,92,92,18,C('cream'))+path('M20 84Q20 106 40 106H88Q107 106 107 88V39Q101 90 87 94H39Q27 94 20 84Z',C('paper'),flat)+path('M29 48V38Q29 29 41 29H58','none',`stroke="${C('cream',.18)}" stroke-width="5"`)+group('pips',pipFaces[f].map(([x,y])=>circle(x,y,6,C('ink'),flat)).join('')),{frameNames:['one','two','three','four','five','six']});

// Four discrete tutorial poses, ordered neutral / point / happy / worried.
function guide(frame){
 const happy=frame===2, worried=frame===3, pointing=frame===1;
 const antenna=group('antenna',path(worried?'M64 36Q72 20 86 24':'M64 36Q61 18 48 17','none',`stroke="${C('ink')}" stroke-width="4"`)+circle(worried?87:47,worried?24:16,6,C(worried?'danger':'energy'))+circle(worried?85:45,worried?22:14,2,C('cream'),flat));
 const thruster=group('thruster',path('M52 93L76 93L73 101Q64 107 55 101Z',C('rock-dark'))+path('M56 103Q55 113 63 117Q73 111 71 103Z',C('science'))+path('M60 104Q60 110 64 112Q68 108 67 104Z',C('cream'),flat));
 const arms=group('arms',path('M27 65Q14 64 14 79','none',`stroke="${C('ink')}" stroke-width="5"`)+circle(14,82,7,C('paper'))+line('M11 81L16 84')+(pointing?path('M99 64L110 47L111 31','none',`stroke="${C('ink')}" stroke-width="5"`)+path('M108 48L108 32Q108 24 113 27L114 38Q122 37 120 45L117 51Z',C('cream')):path(worried?'M99 64Q104 68 99 78':'M99 64Q111 65 113 78','none',`stroke="${C('ink')}" stroke-width="5"`)+circle(worried?99:113,81,7,C('paper'))+line(worried?'M97 80L102 83':'M110 80L115 83')));
 const shell=group('shell',rect(25,34,77,62,22,C('cream'))+path('M27 74Q31 88 49 88H79Q96 86 100 68V77Q100 96 80 96H47Q27 93 27 74Z',C('paper'),flat)+path('M35 48Q37 41 47 41H56','none',`stroke="${C('cream',.18)}" stroke-width="4"`)+rect(34,46,60,34,13,C('space'))+circle(57,87,2,C('science'),flat)+circle(65,87,2,C('energy'),flat)+circle(73,87,2,C('science'),flat));
 const eyes=group('eyes',happy?path('M44 61Q49 52 54 61M73 61Q78 52 83 61','none',`stroke="${C('science')}" stroke-width="4"`):rect(44,55,9,worried?9:13,4,C('science'),flat)+rect(74,55,9,worried?13:13,4,C('science'),flat));
 const mouth=group('mouth',path(worried?'M60 71Q65 66 70 71':happy?'M58 68Q65 78 72 68':'M60 70Q65 74 70 70','none',`stroke="${C('science')}" stroke-width="2"`)+(worried?path('M43 52L52 49M74 48L84 51','none',`stroke="${C('science')}" stroke-width="2"`):''));
 const cheeks=group('cheeks',ellipse(41,71,3,2,C('clay'),flat)+ellipse(86,71,3,2,C('clay'),flat));
 return `<g transform="scale(4)" stroke-width="3">${antenna}${thruster}${arms}${shell}${eyes}${mouth}${cheeks}</g>`;
}
emit('character.guide-mascot','characters','guide-mascot',512,[.5,.5],4,2,['antenna','thruster','arms','shell','eyes','mouth'],['tutorial','robot','drone'],'P1',guide,{frameNames:['neutral','point','happy','worried']});

write('art/manifest/peoples.json',JSON.stringify({assets},null,2)+'\n');
console.log(`Peoples: ${assets.length} ids / ${assets.reduce((n,a)=>n+a.frames,0)} SVGs.`);
