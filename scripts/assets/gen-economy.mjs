// Original PlanetForge economy art; no external images, fonts or dependencies.
// Run: node scripts/assets/gen-economy.mjs
import {C, svg, round, write} from './common.mjs';

// Every numbered delivery remains reproducible at its own commit.
const RELEASE = 2;
const assets = [];
let state = 'idle';
const paint = (token,tone=0) => C(state==='off'&&!['ink','coal','rock','rock-dark','snow'].includes(token)
  ? (['cream','paper','sand'].includes(token)?'rock':'rock-dark') : token,tone);
const p = (d,token=null,extra='') => `<path d="${d}" fill="${token?paint(token):'none'}" ${extra}/>`;
const rect = (x,y,w,h,r,token,extra='') => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="${paint(token)}" ${extra}/>`;
const circle = (x,y,r,token,extra='') => `<circle cx="${round(x)}" cy="${round(y)}" r="${round(r)}" fill="${paint(token)}" ${extra}/>`;
const ellipse = (x,y,rx,ry,token,extra='') => `<ellipse cx="${round(x)}" cy="${round(y)}" rx="${round(rx)}" ry="${round(ry)}" fill="${paint(token)}" ${extra}/>`;
const g = (body,transform,extra='') => `<g transform="${transform}" ${extra}>${body}</g>`;
const part = (id,body,extra='') => `<g id="${id}" ${extra}>${body}</g>`;
const line = (d,token='ink',width=1.5) => p(d,null,`stroke="${paint(token)}" stroke-width="${width}"`);
const shadow = (d,token) => `<path d="${d}" fill="${paint(token,-.18)}" stroke="none"/>`;
const shine = (d,width=4) => line(d,'cream',width);
const star = (x,y,r,token='cream') => p(`M${x} ${y-r} Q${x+2} ${y-2} ${x+r} ${y} Q${x+2} ${y+2} ${x} ${y+r} Q${x-2} ${y+2} ${x-r} ${y} Q${x-2} ${y-2} ${x} ${y-r}Z`,token);
function emit(id,category,name,body,size=128,extra={}) {
  const src=`art/src/${category}/${name}.svg`;
  write(src,svg(body,size,size,round(extra.stroke??6*size/256)));
  const {stroke,...meta}=extra;
  assets.push({id,category,src,out:`public/assets/sprites/${category}/${name}.png`,viewBox:[size,size],anchor:[.5,.5],frames:1,parts:[],tags:[category,'economy'],phase:'P1',...meta});
}
function hammer() {
  return p('M63 45 L79 58 L42 108 Q38 113 32 109 L24 102 Q21 98 25 93Z','clay')+
    p('M43 24 Q56 16 67 20 L91 37 L105 53 Q109 58 103 63 L94 70 L74 50 L62 56 L43 40Z','rock')+
    shadow('M74 45 L101 62 L94 70 L74 50 L62 56 L56 49Z','rock')+shine('M48 28 Q56 24 64 27',3);
}
function pliers(mini=false) {
  return p('M60 59 Q69 73 89 106 Q94 113 101 106 Q106 102 101 96 L76 56Z','science')+
    p('M65 62 Q53 80 57 108 Q57 114 65 113 Q71 111 70 105 Q68 86 79 69Z','science')+
    p('M63 65 L37 43 L29 21 Q30 17 34 20 L50 35 L60 32 L60 18 Q61 13 65 18 L75 40 L76 59Z','rock')+
    circle(68,60,8,'paper')+(mini?'':circle(68,60,2,'rock-dark','stroke="none"'));
}
function resource(name,mini=false) {
  const detail=d=>mini?'':line(d);
  switch(name) {
    case 'copper':return p('M17 84 Q11 68 27 58 L33 43 Q38 32 51 39 L65 47 Q79 33 92 45 L105 66 Q119 77 108 94 Q97 109 72 108 L37 106 Q18 103 17 84Z','clay')+
      shadow('M94 48 L105 66 Q119 77 108 94 Q97 109 72 108 L37 106 L28 98 Q70 104 83 80Z','clay')+
      p('M25 72 L38 59 L49 64 L44 78 L30 82Z','moss','stroke-width="2"')+
      p('M69 83 L83 74 L95 80 L89 95 L74 97Z','ok','stroke-width="2"')+
      (mini?'':p('M64 52 L72 48 L77 55 L69 63Z','leaf','stroke-width="1.5"'))+shine('M38 46 L46 43 L56 50',mini?5:4)+detail('M47 84 L55 90 L62 85');
    case 'gold':return p('M20 80 Q16 62 32 57 Q26 34 45 31 Q59 22 70 38 Q88 30 99 45 Q111 58 102 72 Q120 87 104 101 Q91 112 73 104 Q55 116 42 105 Q22 108 20 80Z','energy')+
      shadow('M96 42 Q108 58 99 71 Q118 86 102 99 Q91 109 73 101 Q56 115 43 103 L25 98 Q64 102 75 85 Q99 85 96 42Z','energy')+
      p('M35 59 L48 43 L62 49 L54 66 L40 72Z','sand','stroke="none"')+shine('M37 45 Q43 35 51 40',mini?6:4)+
      (mini?star(91,29,11):star(96,24,10)+star(18,48,6))+detail('M54 82 L67 89 L82 78');
    case 'fiber':return p('M27 24 Q37 16 44 25 L54 67 L45 104 L28 110 Q34 83 35 68Z','savanna')+
      p('M48 18 Q56 12 62 19 L67 68 L67 110 H48 L52 66Z','sand')+
      p('M78 18 Q86 15 91 24 L79 69 L92 106 L74 113 L65 69Z','paper')+
      p('M99 27 Q105 25 108 32 L89 72 L107 101 L96 111 L78 70Z','savanna')+
      (mini?'':line('M36 29 L44 63 M57 24 L59 62 M84 26 L73 63 M96 39 L85 65','iron',2))+
      p('M39 64 Q65 73 88 64 L91 80 Q65 88 39 80Z','clay')+p('M61 71 L71 68 L77 77 L68 84 L59 79Z','iron')+
      (mini?'':line('M66 84 L58 101 M72 83 L82 98','iron',3))+shine('M44 70 L54 72',3);
    case 'planks':return p('M17 83 L78 57 L111 67 V87 L48 114 L17 102Z','sand')+
      p('M17 83 L48 95 L111 67 M48 95 V114',null)+shadow('M49 97 L110 71 V86 L49 112Z','sand')+
      p('M18 58 L81 32 L110 42 V61 L48 88 L18 77Z','paper')+
      p('M18 58 L48 69 L110 42 M48 69 V88',null)+shadow('M49 71 L109 46 V60 L49 86Z','paper')+
      p('M19 35 L79 13 L107 24 V40 L47 63 L19 52Z','sand')+
      p('M19 35 L47 46 L107 24 M47 46 V63',null)+shadow('M48 48 L106 28 V39 L48 61Z','sand')+
      (mini?'':line('M35 34 L77 20 M30 60 L43 64 M61 81 L96 66 M61 106 L94 92','iron',2))+shine('M27 35 L39 39',3);
    case 'tools':return g(pliers(mini),'translate(-8 0)')+g(hammer(),'translate(8 2)');
    case 'wire':return ellipse(87,59,20,39,'paper')+rect(27,29,61,64,9,'clay')+
      shadow('M28 73 Q61 85 87 73 V91 H28Z','clay')+
      [38,mini?60:50,...(mini?[]:[62,74])].map(x=>line(`M${x} 31 Q${x+13} 59 ${x} 91`,'iron',mini?5:4)).join('')+
      ellipse(29,61,16,39,'sand')+ellipse(29,61,6,13,'iron')+
      p('M87 81 Q112 81 109 100 Q107 111 91 108',null,`stroke="${paint('ink')}" stroke-width="${mini?10:8}"`)+
      line('M87 81 Q112 81 109 100 Q107 111 91 108','clay',mini?5:4)+shine('M23 39 Q25 31 29 30',3)+(!mini?shine('M48 35 L52 47',3):'');
    case 'cloth':return p('M22 46 L80 21 Q86 18 92 22 L110 37 V94 Q110 101 103 103 L50 116 L20 99 Q16 96 17 89 L20 50Z','science')+
      p('M22 46 L50 61 L110 37 M50 61 V116',null)+shadow('M51 62 L109 40 V96 Q109 102 101 103 L51 115Z','science')+
      p('M22 47 L80 23 L93 29 L36 54 V88 Q36 93 44 96 L50 99 V109 L25 96 Q21 94 21 87Z','snow')+
      line('M61 78 L100 66 M61 95 L100 83','deep-water',mini?4:2)+
      (mini?'':line('M29 63 V85 M58 108 L101 96','science',2))+shine('M34 44 L73 28',3);
    case 'bricks':{
      const brick=(x,y)=>g(p('M0 11 L21 1 Q24 0 28 2 L49 9 V29 L26 40 L0 29Z','clay')+
        p('M0 11 L26 21 L49 9 M26 21 V40',null)+shadow('M27 23 L48 12 V28 L27 38Z','clay')+
        (mini?'':line('M7 13 L22 7','sand',2)),`translate(${x} ${y})`);
      return brick(14,68)+brick(64,68)+brick(39,35);
    }
    default:throw new Error(`Unknown resource ${name}`);
  }
}
for(const name of ['copper','gold','fiber','planks','tools','wire','cloth','bricks']) {
  emit(`resource.${name}`,'resources',name,resource(name));
  emit(`resource.${name}.mini`,'resources',`${name}-mini`,g(resource(name,true),'scale(0.5)','stroke-width="8"'),64,{stroke:4,tags:['resources',name,'mini']});
}

const lit = () => state==='idle'?'energy':'coal';
const base = () => rect(31,225,194,12,6,'rock')+line('M42 233 H214','rock-dark',5);
const post = (x,y,h,token='iron') => rect(x,y,12,h,6,token);
const anchor = (id,x,y) => part(id,'',`transform="translate(${x} ${y})"`);
function roof(top,wide=false,token='clay') {
  const left=wide?31:41,right=wide?225:215,bottom=top+55;
  return p(`M${left} ${bottom} Q${left-7} ${bottom-4} ${left+1} ${bottom-12} L115 ${top+3} Q128 ${top-5} 141 ${top+3} L${right-1} ${bottom-12} Q${right+7} ${bottom-4} ${right} ${bottom} Q128 ${bottom+11} ${left} ${bottom}Z`,token)+
    shadow(`M${right-1} ${bottom-12} Q${right+7} ${bottom-4} ${right} ${bottom} Q128 ${bottom+11} ${left} ${bottom} L${left+13} ${bottom-8} Q128 ${bottom+3} ${right-1} ${bottom-12}Z`,token)+
    shine(`M${left+18} ${bottom-17} L115 ${top+11}`,4);
}
function logOnBench(y) {
  return p(`M65 ${y-16} H184 Q201 ${y-16} 201 ${y} Q201 ${y+16} 184 ${y+16} H65Z`,'iron')+
    shadow(`M66 ${y+6} H198 Q197 ${y+16} 184 ${y+16} H65Z`,'iron')+
    line(`M92 ${y-9} H132 M150 ${y-7} H185 M109 ${y+6} H171`,'clay',3)+
    ellipse(65,y,19,16,'sand')+ellipse(65,y,11,9,'paper','stroke-width="3"')+
    line(`M59 ${y} Q63 ${y-6} 69 ${y} Q66 ${y+6} 61 ${y+3}`,'iron',2);
}
function sawBlade(x,y,r) {
  const at=(radius,angle)=>`${round(x+radius*Math.cos(angle*Math.PI/180))} ${round(y+radius*Math.sin(angle*Math.PI/180))}`;
  let d='';
  for(let i=0;i<16;i++) {
    const a=i*22.5;
    d+=`${i?'L':'M'}${at(r-6,a)} L${at(r,a+5)} L${at(r,a+13)} L${at(r-6,a+17)} `;
  }
  return part('blade',p(d+'Z','rock')+circle(x,y,r-12,'snow','stroke-width="3"')+
    [0,120,240].map(a=>g(line(`M${x+12} ${y-4} Q${x+22} ${y} ${x+22} ${y+9}`,'rock-dark',3),`rotate(${a} ${x} ${y})`)).join('')+
    circle(x,y,8,'rock-dark','stroke-width="3"')+circle(x-2,y-2,2,'snow','stroke="none"')+
    shine(`M${x-r+13} ${y-13} Q${x-r+18} ${y-24} ${x-11} ${y-26}`,3));
}
function sawmill(tier) {
  const big=tier===2,top=big?39:65,bottom=top+55;
  let b=rect(53,bottom-8,150,112,12,'sand')+
    line(`M70 ${bottom+8} V214 M99 ${bottom+8} V213 M127 ${bottom+8} V214 M156 ${bottom+8} V214 M185 ${bottom+8} V214`,'iron',3)+
    post(47,bottom,225-bottom)+post(197,bottom,225-bottom)+roof(top,big,'clay')+
    rect(67,bottom+12,30,30,8,'iron')+rect(72,bottom+17,20,20,5,lit())+
    line(`M82 ${bottom+17} V${bottom+37}`,'clay',3);
  if(big)b+=rect(40,158,35,36,9,'science')+circle(58,176,9,'rock-dark','stroke-width="3"')+
    line('M60 169 L138 145 M61 183 L146 159','coal',5)+rect(186,127,26,38,7,'rock')+circle(199,139,5,lit(),'stroke-width="3"');
  // Blade comes before the log/conveyor so the generated front layer masks its
  // lower half while it turns. Pivot equals the exact center in both tiers.
  b+=sawBlade(big?145:152,big?151:166,big?43:40);
  if(big) {
    b+=post(46,210,15,'rock-dark')+post(196,210,15,'rock-dark')+
      rect(35,199,186,22,11,'rock-dark')+
      [49,75,101,127,153,179,205].map(x=>circle(x,210,7,'rock','stroke-width="3"')).join('')+
      line('M48 201 H207','paper',3)+logOnBench(182);
  } else b+=post(48,209,16)+post(190,209,16)+rect(37,204,181,14,6,'clay')+logOnBench(188);
  return b+base();
}
function anvil(x,y) {
  return g(p('M6 0 H83 Q91 0 86 7 L69 17 H58 V29 H72 V39 H17 V29 H31 V17 L17 16 L-6 6 Q-11 0 6 0Z','rock')+
    shadow('M60 17 H69 L57 21 V29 H71 V38 H48 V30 H42 V17Z','rock')+
    shine('M5 5 H66',3),`translate(${x} ${y})`);
}
function toolRack(x,y) {
  return g(rect(0,0,79,9,4,'iron')+rect(13,14,7,25,3,'clay')+rect(5,9,27,10,4,'rock')+
    line('M53 10 L58 22 L50 39 M67 10 L61 22 L69 39','rock',5)+circle(60,22,4,'paper','stroke-width="2"')+
    [11,62].map(xx=>circle(xx,4,2,'cream','stroke="none"')).join(''),`translate(${x} ${y})`);
}
function workshop(tier) {
  const big=tier===2,chimneyY=big?27:59;
  let b=rect(171,chimneyY,30,108,10,'rock')+rect(164,chimneyY-7,44,14,6,'clay')+
    line(`M175 ${chimneyY+23} H197 M175 ${chimneyY+44} H197`,'rock-dark',3)+
    anchor('chimney-smoke-anchor',186,chimneyY-7)+
    rect(big?43:51,big?98:116,big?170:154,big?127:109,22,big?'clay':'paper')+
    shadow(big?'M195 111 Q213 112 213 130 V207 Q213 225 195 225 H70 V216 H185 Q195 216 195 205Z':'M188 129 Q205 131 205 146 V207 Q205 225 187 225 H70 V216 H178 Q188 216 188 205Z',big?'clay':'paper')+
    roof(big?44:65,big,'clay')+toolRack(big?55:61,big?118:133);
  if(big) {
    b+=p('M145 224 V169 Q145 143 174 143 Q203 143 203 169 V224Z','rock')+
      p('M154 222 V171 Q154 152 174 152 Q194 152 194 171 V222Z','coal')+
      part('forge-glow',p('M158 220 Q151 199 166 186 L173 198 Q177 177 185 188 Q198 208 189 220Z',state==='idle'?'ascension':'coal')+
        p('M168 220 Q162 210 177 201 Q190 215 181 220Z',lit()))+
      line('M149 169 H154 M195 169 H200 M147 190 H153 M195 190 H201','rock-dark',3)+rect(143,220,63,9,4,'rock-dark');
  } else b+=rect(155,143,30,27,8,'iron')+rect(160,148,20,17,4,lit())+
    line('M170 149 V164','clay',3)+rect(152,179,38,46,10,'iron')+circle(181,203,3,'cream','stroke="none"');
  b+=post(big?52:60,211,14,'iron')+post(big?119:127,211,14,'iron')+
    rect(big?43:51,207,99,11,5,'sand')+anvil(big?51:59,168)+base();
  return b;
}
function nurserySprout(x,y,s=1,branchy=false) {
  const leaves=branchy?p('M0 -31 Q-21 -25 -24 -44 Q-7 -51 0 -31Z','leaf')+
    p('M0 -46 Q8 -66 26 -58 Q25 -40 0 -46Z','grass'):
    p('M0 -34 Q-21 -30 -22 -49 Q-4 -52 0 -34Z','leaf')+
    p('M0 -34 Q1 -57 22 -53 Q25 -32 0 -34Z','grass');
  return g(ellipse(0,-5,25,5,'clay')+rect(10,-55,4,50,2,'sand')+
    line(branchy?'M0 -7 Q-4 -32 1 -61':'M0 -7 V-40','clay',5)+leaves+
    line('M-4 -24 L14 -26','paper',3)+shine(branchy?'M9 -53 L17 -55':'M8 -45 L15 -46',2),`translate(${x} ${y}) scale(${s})`,'stroke-width="3"');
}
function wateringCan() {
  return line('M172 195 Q150 171 155 196 Q157 205 171 207','ink',8)+
    line('M172 195 Q150 171 155 196 Q157 205 171 207','science',4)+
    p('M190 203 L211 186 L216 190 L200 213Z','science')+
    ellipse(216,186,7,4,'rock','transform="rotate(-35 216 186)" stroke-width="3"')+
    rect(168,191,33,32,9,'science')+ellipse(184.5,192,16.5,5,'deep-water','stroke-width="3"')+
    shine('M174 202 V213',3);
}
function forester() {
  return nurserySprout(164,182,.7,true)+nurserySprout(207,178,.7)+
    rect(48,119,96,106,17,'sand')+shadow('M130 131 Q144 133 144 147 V212 Q144 225 131 225 H66 V216 H126Z','sand')+
    line('M56 150 H136 M56 175 H136 M56 200 H136','iron',3)+
    p('M35 126 Q28 123 35 115 L83 69 Q95 59 107 69 L154 115 Q161 123 154 126 Q95 140 35 126Z','leaf')+
    shadow('M150 111 L154 115 Q161 123 154 126 Q95 140 35 126 L46 118 Q98 128 150 111Z','leaf')+
    shine('M49 111 L85 77',4)+rect(60,144,33,34,8,'iron')+rect(65,149,23,24,5,lit())+
    line('M76.5 150 V172','clay',3)+rect(103,178,29,47,9,'iron')+circle(124,201,2.5,'cream','stroke="none"')+
    wateringCan()+nurserySprout(153,224,.5)+nurserySprout(211,225,.5,true)+base();
}
function scaffolding() {
  return part('scaffolding',post(38,78,159)+post(206,78,159)+rect(30,113,196,12,5,'sand')+rect(30,186,196,12,5,'sand')+
    line('M46 181 L207 127 M47 202 L199 230','iron',5)+post(176,154,83,'sand')+post(196,154,83,'sand')+
    [166,186,206,226].map(y=>line(`M180 ${y} H200`,'iron',4)).join(''));
}
if(RELEASE>=2) {
  const definitions=[['sawmill.t1',()=>sawmill(1),['blade']],['sawmill.t2',()=>sawmill(2),['blade']],
    ['workshop.t1',()=>workshop(1),['chimney-smoke-anchor']],['workshop.t2',()=>workshop(2),['chimney-smoke-anchor','forge-glow']],['forester',forester,[]]];
  for(const [name,draw,parts] of definitions)for(const mode of ['idle','construction','off']) {
    state=mode;
    const body=draw(),suffix=mode==='idle'?'':`.${mode}`;
    emit(`building.${name}${suffix}`,'buildings',(name+suffix).replaceAll('.','-'),mode==='construction'?`<g opacity="0.4">${body}</g>${scaffolding()}`:body,256,
      {anchor:[.5,.9375],parts:[...parts,...(mode==='construction'?['scaffolding']:[])],tags:['buildings','economy',name,mode]});
  }
  state='idle';
}

write('art/manifest/economy.json',JSON.stringify({assets},null,2)+'\n');
console.log(`Economy art: ${assets.length} ids generated (release ${RELEASE}).`);
