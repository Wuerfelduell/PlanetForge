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
 if(p.tail==='long')return group('tail',path('M49 106Q9 113 12 83Q11 75 19 74','none',`stroke="${C(p.fur)}" stroke-width="6"`)+ellipse(19,72,5,7,C('cream')));
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
 if(p.ears==='tall')return ellipse(49,39,7,16,fur,'transform="rotate(-16 49 39)"')+ellipse(76,35,7,16,fur,'transform="rotate(12 76 35)"')+ellipse(49,38,3,10,C('clay'),flat)+ellipse(76,34,3,10,C('clay'),flat);
 if(p.ears==='tufts')return path('M41 59L37 36Q37 32 42 35L59 44L77 42L90 33Q94 31 92 38L88 61Z',fur);
 if(p.ears==='horn')return path('M69 51Q83 41 78 27L85 32L91 27Q101 48 85 60Z',C('iron'));
 if(p.ears==='antennae')return path('M60 52L53 34M82 51L89 30','none',`stroke="${C(p.fur)}" stroke-width="5"`)+circle(53,32,6,C(p.fur))+circle(89,29,6,C(p.fur));
 if(p.ears==='bat')return path('M45 60Q28 45 36 25Q43 23 58 48M76 48Q84 22 91 24Q103 45 88 60',fur)+path('M44 46L39 31L52 49M83 47L89 30L91 47',C('clay'),flat);
 return '';
}
function face(p,expression,portrait){
 const x=portrait?65:78, y=62, second=portrait;
 const eye=(ex)=>expression==='happy'?path(`M${ex-3} ${y}Q${ex} ${y-5} ${ex+3} ${y}`):ellipse(ex,y,2.8,4.2,C('ink'),flat)+circle(ex-.7,y-1.5,.8,C('cream'),flat);
 let result='';
 if(p.animal==='raccoon')result+=path('M48 58Q63 48 74 56Q86 48 94 58L94 68Q82 73 73 65Q59 74 48 66Z',C('coal'),flat);
 if(p.animal==='owl')result+=ellipse(62,63,14,16,C('cream'),flat)+ellipse(84,63,12,15,C('cream'),flat);
 result+=eye(x)+(second?eye(84):'');
 if(expression==='angry')result+=line(`M${x-4} 54L${x+3} 57`)+(second?line('M81 57L88 54'):'');
 if(p.animal==='owl')return result+path('M73 72Q79 69 84 73L79 80Z',C('sand'))+line('M55 84L59 87M65 86L69 89');
 if(p.animal==='snail'||p.animal==='beetle')return result+(expression==='angry'?line('M76 79Q83 75 90 79'):line('M76 76Q84 86 92 76'));
 result+=ellipse(portrait?78:88,73,14,10,C('cream'),flat);
 result+=ellipse(portrait?82:99,68,4,3,C('ink'),flat);
 result+=expression==='angry'?line(portrait?'M73 80Q80 76 87 80':'M83 80Q89 77 94 80'):line(portrait?'M73 77Q80 85 87 77':'M82 77Q88 82 94 76');
 if(p.animal==='beaver')result+=rect(portrait?76:85,79,9,7,2,C('snow'))+line(portrait?'M80.5 80V85':'M89.5 80V85');
 return result;
}
function head(p,expression='neutral',portrait=false){
 const fur=C(p.fur);
 return group('head',ears(p)+path(p.animal==='hedgehog'?'M45 51Q59 37 77 47Q88 53 92 64L102 69Q106 77 97 82Q83 91 59 85Q37 80 40 63Z':'M43 49Q58 37 78 44Q96 48 96 65Q108 73 96 82Q77 94 55 84Q37 77 41 61Z',fur)+path('M44 65Q43 83 69 85Q87 88 97 78Q84 86 70 80Q51 80 49 65Z',C(p.fur,-.18),flat)+ellipse(57,52,8,4,C(p.fur,.18),flat)+face(p,expression,portrait));
}
function clothing(p,portrait=false){
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
function rig(p,{state='idle',frame=0,expression='neutral',portrait=false}={}){
 const bob=state==='idle'?frame:state==='walk'?[0,-2,0,-2][frame]:frame?-1:1;
 const step=state==='walk'?[-5,0,5,0][frame]:0;
 const lift=state==='walk'&&frame%2?3:0;
 let feet=group('feet',ellipse(50-step,114.5-lift,11,4,C(p.fur))+ellipse(74+step,114.5,12,4,C(p.fur)));
 if(p.body==='flipper')feet=group('feet',ellipse(43-step,114.5,16,4,C(p.fur))+ellipse(80+step,114.5,16,4,C(p.fur)));
 if(p.body==='hopper')feet=group('feet',ellipse(49-step,114.5-lift,17,4,C(p.fur))+ellipse(78+step,114.5,18,4,C(p.fur)));
 if(p.body==='slug')feet=group('feet',path(`M21 113Q32 103 55 108Q82 107 99 112Q104 118.5 91 118.5H27Q18 118.5 21 113Z`,C(p.fur)));
 const body=group('body',ellipse(61,93,['round','flipper'].includes(p.body)?27:21,22,C(p.fur))+path('M51 79Q70 76 76 93Q77 109 64 112Q45 113 44 98Z',C('cream'),flat));
 const angle=state==='work'?(frame===0?-40:22):state==='walk'?-step*3:0;
 let arm=group('arm',ellipse(80,94,8,6,C(p.fur)),`rotate(${angle} 77 89)`);
 if(state==='work')arm=group('arm',ellipse(82,92,8,6,C(p.fur))+group('tool',rect(89,65,5,33,2,C('iron'))+rect(82,64,22,10,3,C('rock'))+path('M85 65H99', 'none',`stroke="${C('rock',.18)}" stroke-width="2"`)),`rotate(${angle} 78 91)`);
 const upper=tail(p)+body+head(p,expression,portrait)+clothing(p,portrait)+arm;
 return feet+group('pose',upper,`translate(0 ${bob})`);
}
function portrait(p,expression){
 // A 3/4 face with two eyes; bust expands toward the bottom, without a background tile.
 return `<g transform="translate(-30 -70) scale(4.8)" stroke-width="2.5">${p.tail==='quills'?tail(p):''}${group('bust',path('M28 113Q30 84 60 83Q92 80 102 113Q69 124 28 113Z',C(p.color)))}${head(p,expression,true)}${clothing(p,true)}</g>`;
}
function symbol(p){
 const f=C(p.color,-.18), gold=C('sand');
 const shapes={
 axolotl:path('M38 73L24 53L44 61L41 38L58 55Q64 48 72 55L87 38L84 61L104 53L90 76Q66 96 38 73Z',C('crystal'))+path('M59 61Q49 53 46 63Q44 72 65 83Q87 67 78 60Q70 54 65 62Z',C('cream')),
 armadillo:path('M28 76Q26 37 64 33Q101 39 100 77L90 93H38Z',C('rock'))+line('M38 53Q64 43 91 54M32 68Q65 56 98 69M34 82Q65 71 94 82'),
 jerboa:ellipse(47,49,9,23,gold,'transform="rotate(-20 47 49)"')+ellipse(79,49,9,23,gold,'transform="rotate(20 79 49)"')+ellipse(45,90,21,9,C('clay'))+ellipse(83,90,21,9,C('clay')),
 owl:circle(64,66,31,C('science'))+circle(51,64,16,C('cream'))+circle(78,64,16,C('cream'))+circle(53,64,5,C('ink'),flat)+circle(76,64,5,C('ink'),flat)+path('M58 78L70 78L64 87Z',gold),
 otter:circle(64,65,32,C('ascension'))+circle(64,65,16,C('water'))+path('M29 62H45M83 62H99M61 31V47M61 83V99','none',`stroke="${C('cream')}" stroke-width="9"`),
 beetle:ellipse(64,77,25,27,C('iron'))+path('M54 53Q69 43 61 25L69 31L78 26Q88 46 73 59Z',C('iron'))+line('M64 62V101'),
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
 return `<g transform="scale(2)">${circle(64,64,55,C(p.color))}${path('M17 70Q30 113 74 109Q100 104 112 79Q107 118 65 119Q23 117 17 70Z',C(p.color,-.18),flat)}${path('M26 42Q34 24 54 21','none',`stroke="${C(p.color,.18)}" stroke-width="5"`)}${p.animal==='beaver'?logs:p.animal==='hedgehog'?berry:group('symbol',symbol(p))}</g>`;
}
for(const p of defs){
 emit(`people.${p.id}.portrait`,'peoples',`${p.id}-portrait`,512,[.5,.5],1,0,['head','clothing'],[p.id,p.animal,p.biome,'portrait'],p.phase,()=>portrait(p,'neutral'));
 for(const [state,frames,fps] of [['idle',2,2],['walk',4,8],['work',2,3]])emit(`people.${p.id}.citizen.${state}`,'peoples',`${p.id}-citizen-${state}`,128,[.5,.9375],frames,fps,['head','body','tail','feet','arm','clothing',...(state==='work'?['tool']:[])],[p.id,'citizen',state,'facing-right'],p.phase,f=>rig(p,{state,frame:f}));
 emit(`people.${p.id}.emblem`,'peoples',`${p.id}-emblem`,256,[.5,.5],1,0,['symbol'],[p.id,'emblem'],p.phase,()=>emblem(p));
}
emit('people.citizen-ring','peoples','citizen-ring',128,[.5,.9375],1,0,[],['coop','engine-tinted'],'P0',()=>ellipse(64,120,30,5,'none',`stroke="${C('tint-white')}" stroke-width="3"`));
write('art/manifest/peoples.json',JSON.stringify({assets},null,2)+'\n');
console.log(`Peoples: ${assets.length} ids / ${assets.reduce((n,a)=>n+a.frames,0)} SVGs.`);
