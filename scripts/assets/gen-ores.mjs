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

for(const name of ['tin','silver','bauxite','ilmenite','platinum','bronze','aluminium','titanium']){
  emit(`resource.${name}`,'resources',name,resource(name));
  emit(`resource.${name}.mini`,'resources',`${name}-mini`,`<g transform="scale(0.5)" stroke-width="8">${resource(name,true)}</g>`,64,{stroke:4});
}

write('art/manifest/ores.json',JSON.stringify({assets},null,2)+'\n');
console.log(`Ore art: ${assets.length} ids generated.`);
