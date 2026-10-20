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
];
function emit(id,category,name,size,anchor,frames,fps,parts,tags,phase,draw,extra={}){
 const suffix=frames>1?'-f{f}':'';
 assets.push({id,category,src:`art/src/${category}/${name}${suffix}.svg`,out:`public/assets/sprites/${category}/${name}${suffix}.png`,viewBox:[size,size],anchor,frames,...(frames>1?{fps}:{}),parts,tags,phase,...extra});
 for(let f=0;f<frames;f++)write(`art/src/${category}/${name}${frames>1?`-f${f+1}`:''}.svg`,svg(draw(f),size,size));
}
function tail(p){
 if(p.tail==='paddle')return group('tail',path('M49 99 Q22 64 13 82 Q5 108 42 112Z',C('iron',-.18))+line('M16 86L37 108M14 98L29 82M22 105L36 92'));
 if(p.tail==='quills')return group('tail',path('M29 103 Q12 92 19 82 L12 72 Q11 69 16 68 L24 65 L17 53 Q16 49 22 50 L34 53 L32 40 Q32 35 37 39 L48 46 L55 35 Q58 32 60 38 L63 51 Q85 63 82 91Z',C('iron'))+path('M21 72L36 76L29 61M29 88L43 86L39 72',C('savanna'),flat));
 return group('tail','');
}
function ears(p){
 const fur=C(p.fur);
 if(p.ears==='round'||p.ears==='small'){
  const r=p.ears==='small'?7:9;
  return ellipse(49,47,r,r,fur)+ellipse(79,42,r,r,fur)+circle(48,46,r/2,C('clay'),flat)+circle(78,41,r/2,C('clay'),flat);
 }
 return '';
}
function face(p,expression,portrait){
 const x=portrait?65:78, y=62, second=portrait;
 const eye=(ex)=>expression==='happy'?path(`M${ex-3} ${y}Q${ex} ${y-5} ${ex+3} ${y}`):ellipse(ex,y,2.8,4.2,C('ink'),flat)+circle(ex-.7,y-1.5,.8,C('cream'),flat);
 let result=eye(x)+(second?eye(84):'');
 if(expression==='angry')result+=line(`M${x-4} 54L${x+3} 57`)+(second?line('M81 57L88 54'):'');
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
 return group('clothing','')+group('headwear','');
}
function rig(p,{state='idle',frame=0,expression='neutral',portrait=false}={}){
 const bob=state==='idle'?frame:state==='walk'?[0,-2,0,-2][frame]:frame?-1:1;
 const step=state==='walk'?[-5,0,5,0][frame]:0;
 const lift=state==='walk'&&frame%2?3:0;
 let feet=group('feet',ellipse(50-step,114.5-lift,11,4,C(p.fur))+ellipse(74+step,114.5,12,4,C(p.fur)));
 const body=group('body',ellipse(61,93,p.body==='round'?24:21,22,C(p.fur))+path('M51 79Q70 76 76 93Q77 109 64 112Q45 113 44 98Z',C('cream'),flat));
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
function emblem(p){
 const logs=group('symbol',group('log-a',rect(29,56,69,18,8,C('iron'))+ellipse(34,65,7,9,C('sand'))+line('M47 61H89M49 68H83'),'rotate(35 64 64)')+group('log-b',rect(29,56,69,18,8,C('iron'))+ellipse(34,65,7,9,C('sand'))+line('M47 61H89M49 68H83'),'rotate(-35 64 64)'));
 const berry=group('symbol',path('M36 80L30 62L43 65L44 40L58 52L69 32L77 56L96 49L91 72L101 78L82 91Z',C('iron'))+circle(58,72,13,C('danger'))+circle(77,78,13,C('clay'))+path('M66 60Q60 45 80 48Q80 61 66 60Z',C('leaf')));
 return `<g transform="scale(2)">${circle(64,64,55,C(p.color))}${path('M17 70Q30 113 74 109Q100 104 112 79Q107 118 65 119Q23 117 17 70Z',C(p.color,-.18),flat)}${path('M26 42Q34 24 54 21','none',`stroke="${C(p.color,.18)}" stroke-width="5"`)}${p.animal==='beaver'?logs:berry}</g>`;
}
for(const p of defs){
 emit(`people.${p.id}.portrait`,'peoples',`${p.id}-portrait`,512,[.5,.5],1,0,['head','clothing'],[p.id,p.animal,p.biome,'portrait'],p.phase,()=>portrait(p,'neutral'));
 for(const [state,frames,fps] of [['idle',2,2],['walk',4,8],['work',2,3]])emit(`people.${p.id}.citizen.${state}`,'peoples',`${p.id}-citizen-${state}`,128,[.5,.9375],frames,fps,['head','body','tail','feet','arm','clothing',...(state==='work'?['tool']:[])],[p.id,'citizen',state,'facing-right'],p.phase,f=>rig(p,{state,frame:f}));
 emit(`people.${p.id}.emblem`,'peoples',`${p.id}-emblem`,256,[.5,.5],1,0,['symbol'],[p.id,'emblem'],p.phase,()=>emblem(p));
}
emit('people.citizen-ring','peoples','citizen-ring',128,[.5,.9375],1,0,[],['coop','engine-tinted'],'P0',()=>ellipse(64,120,30,5,'none',`stroke="${C('tint-white')}" stroke-width="3"`));
write('art/manifest/peoples.json',JSON.stringify({assets},null,2)+'\n');
console.log(`Peoples: ${assets.length} ids / ${assets.reduce((n,a)=>n+a.frames,0)} SVGs.`);
