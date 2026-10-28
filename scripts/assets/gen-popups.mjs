// Original PlanetForge celebration pictures and ascension medallions.
// Run node scripts/assets/gen-popups.mjs before assets:gen / assets:check.
// Geometry is authored here; reference vocabulary comes from gen-invaders/menu/ui.
import {C, svg, round, write} from './common.mjs';

const STAGE = 1;
const assets = [];
const p = (d, token, extra='') => `<path d="${d}" ${/\bfill=/.test(extra)?'':`fill="${token?C(token):'none'}"`} ${extra}/>`;
const circle = (x,y,r,token,extra='') => `<circle cx="${round(x)}" cy="${round(y)}" r="${round(r)}" ${/\bfill=/.test(extra)?'':`fill="${token?C(token):'none'}"`} ${extra}/>`;
const ellipse = (x,y,rx,ry,token,extra='') => `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="${C(token)}" ${extra}/>`;
const rect = (x,y,w,h,r,token,extra='') => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="${C(token)}" ${extra}/>`;
const g = (body,extra='') => `<g ${extra}>${body}</g>`;
const line = (d,token='ink',w=6) => p(d,null,`stroke="${C(token)}" stroke-width="${w}"`);
const shadow = (d,token) => p(d,null,`fill="${C(token,-.18)}" stroke="none"`);
const shine = (d,w=6) => line(d,'cream',w);
const star = (x,y,r,token='energy') => p(`M${x} ${y-r} Q${x+round(r*.2)} ${y-round(r*.2)} ${x+r} ${y} Q${x+round(r*.2)} ${y+round(r*.2)} ${x} ${y+r} Q${x-round(r*.2)} ${y+round(r*.2)} ${x-r} ${y} Q${x-round(r*.2)} ${y-round(r*.2)} ${x} ${y-r}Z`,token);
function emit(name,size,body,parts,tags,meta={}) {
  write(`art/src/ui/${name}.svg`,svg(body,size));
  assets.push({id:`ui.${name}`,category:'ui',src:`art/src/ui/${name}.svg`,out:`public/assets/sprites/ui/${name}.png`,viewBox:[size,size],anchor:[.5,.5],frames:1,parts,tags:['ui',...tags],phase:'P1',...meta});
}
const polar = (r,a) => [round(256+r*Math.sin(a*Math.PI/180)),round(245-r*Math.cos(a*Math.PI/180))].join(' ');
const arc = (r,a,b) => `M${polar(r,a)} A${r} ${r} 0 0 1 ${polar(r,b)}`;
function shieldPlate(a) {
  // Bevelled six-sided plates close the shell without angular gaps. Match the
  // built segment's grey rails, violet diamond inset and paired cream rivets.
  const mid=a+7.5;
  const d=`M${polar(161,a+1)} A161 161 0 0 1 ${polar(161,a+14)} L${polar(151,a+15)} L${polar(141,a+14)} A141 141 0 0 0 ${polar(141,a+1)} L${polar(151,a)}Z`;
  return p(d,'rock','stroke-width="3"')+line(arc(158,a+2,a+13),'snow',2)+line(arc(144,a+2,a+13),'rock-dark',2)+
    g(p('M0 -7 L5 0 L0 7 L-5 0Z','crystal','stroke-width="2"')+p('M0 -7 V7 L5 0Z','oil-sheen','stroke="none"'),`transform="translate(${polar(151,mid)}) rotate(${mid})"`)+
    [a+2.5,a+12.5].map(t=>circle(...polar(151,t).split(' ').map(Number),1.7,'cream','stroke-width="1"')).join('');
}
function smallPlanet(x,y,r,token,land) {
  return g(circle(0,0,r,token)+p(`M${-round(r*.9)} ${-round(r*.3)} Q${-round(r*.5)} ${-r} ${round(r*.2)} ${-round(r*.9)} L${round(r*.4)} ${-round(r*.4)} L0 0 L${-round(r*.4)} ${-round(r*.1)} L${-round(r*.6)} ${round(r*.3)}Z`,land,'stroke-width="3"')+
    p(`M${round(r*.4)} ${round(r*.2)} L${round(r*.9)} ${round(r*.3)} L${round(r*.6)} ${round(r*.8)} L0 ${round(r*.8)} L${-round(r*.1)} ${round(r*.4)}Z`,land,'stroke-width="3"')+
    shadow(`M${round(r*.7)} ${-round(r*.7)} A${r} ${r} 0 0 1 ${-round(r*.6)} ${round(r*.8)} Q${round(r*1.2)} ${round(r*.8)} ${round(r*.7)} ${-round(r*.7)}Z`,token)+
    shine(`M${-round(r*.7)} ${-round(r*.3)} Q${-round(r*.5)} ${-round(r*.7)} ${-round(r*.2)} ${-round(r*.7)}`,3),`transform="translate(${x} ${y})" stroke-width="6"`);
}
function savedSystem() {
  let b=`<defs><radialGradient id="sun-glow"><stop stop-color="${C('energy')}" stop-opacity="0.5"/><stop offset="0.7" stop-color="${C('energy')}" stop-opacity="0.2"/><stop offset="1" stop-color="${C('energy')}" stop-opacity="0"/></radialGradient><radialGradient id="sun-body" cx="32%" cy="28%" r="75%"><stop stop-color="${C('energy',.18)}"/><stop offset="0.6" stop-color="${C('energy')}"/><stop offset="1" stop-color="${C('energy',-.18)}"/></radialGradient></defs>`;
  b+=g(circle(256,245,213,null,'fill="url(#sun-glow)" stroke="none"'),'id="glow"');
  b+=g(Array.from({length:12},(_,i)=>g(p('M246 126 Q242 114 256 108 Q270 114 266 126Z','ascension','stroke-width="5"'),`transform="rotate(${i*30} 256 245)"`)).join('')+
    circle(256,245,108,null,'fill="url(#sun-body)"')+shine('M177 213 Q189 181 219 172',9),'id="sun"');
  b+=g(line('M217 239 Q227 226 237 239 M275 239 Q285 226 295 239','ink',7)+
    p('M234 267 Q256 287 278 267 Q275 295 256 295 Q237 295 234 267Z','ascension','stroke-width="6"')+
    ellipse(209,263,9,5,'ascension','stroke="none" opacity="0.6"')+ellipse(303,263,9,5,'ascension','stroke="none" opacity="0.6"'),'id="face"');
  // A real annulus leaves the sun and the transparent gap around it visible.
  b+=g(p('M256 81 A164 164 0 1 1 255.9 81Z M256 108 A137 137 0 1 0 256.1 108Z','rock-dark','fill-rule="evenodd"'),'id="shell-base"');
  b+=g(Array.from({length:24},(_,i)=>shieldPlate(i*15)).join(''),'id="shell"');
  b+=g(smallPlanet(76,367,37,'water','grass')+smallPlanet(426,125,28,'sand','clay')+
    smallPlanet(397,417,30,'water','snow'),'id="planets"');
  let confetti='';
  for(const [x,y,r,t] of [[74,116,15,'energy'],[394,61,12,'ascension'],[449,302,17,'energy'],[157,439,13,'energy'],[266,452,10,'ascension'],[38,244,10,'cream']])confetti+=star(x,y,r,t);
  for(const [x,y,a,t] of [[119,61,-28,'science'],[321,49,25,'clay'],[467,210,30,'crystal'],[51,437,-32,'clay'],[325,463,25,'science'],[173,82,-20,'ascension']])confetti+=g(rect(-5,-10,10,20,4,t),`transform="translate(${x} ${y}) rotate(${a})" stroke-width="3"`);
  confetti+=line('M51 175 Q35 162 44 150','ascension',5)+line('M444 369 Q466 370 466 352','science',5);
  return b+g(confetti,'id="confetti" stroke-width="4"');
}
if(STAGE>=1)emit('popup-system-saved',512,savedSystem(),['glow','sun','face','shell-base','shell','planets','confetti'],['popup','celebration','system-saved','sun-shield']);

write('art/manifest/popups.json',JSON.stringify({assets},null,2)+'\n');
console.log(`Popup art: stage ${STAGE}, ${assets.length} ids generated.`);
