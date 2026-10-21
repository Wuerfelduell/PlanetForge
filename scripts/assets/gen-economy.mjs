// Original PlanetForge economy art; no external images, fonts or dependencies.
// Run: node scripts/assets/gen-economy.mjs
import {C, svg, round, write} from './common.mjs';

// Every numbered delivery remains reproducible at its own commit.
const RELEASE = 1;
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

write('art/manifest/economy.json',JSON.stringify({assets},null,2)+'\n');
console.log(`Economy art: ${assets.length} ids generated (release ${RELEASE}).`);
