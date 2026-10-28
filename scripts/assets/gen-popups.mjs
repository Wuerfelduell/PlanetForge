// Original PlanetForge celebration pictures and ascension medallions.
// Run node scripts/assets/gen-popups.mjs before assets:gen / assets:check.
// Geometry is authored here; reference vocabulary comes from gen-invaders/menu/ui.
import {C, svg, round, write} from './common.mjs';

const STAGE = 2;
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

function wreckHull() {
  // Copied/reworked from mothership(1,true) in gen-invaders.mjs. Keep its
  // cream dome, green oval viewport, violet rim and four underside lamps.
  return p('M34 133 Q40 161 71 174 Q101 184 115 178 Q127 189 140 178 Q183 182 219 144 L218 129Z','rock-dark')+
    shadow('M76 166 Q142 179 206 139 L217 145 Q189 183 140 178 Q127 189 115 178 Q94 184 76 166Z','rock-dark')+
    p('M20 133 C20 117 68 105 128 105 Q185 105 222 122 L210 129 L227 136 L214 144 L220 150 Q187 161 128 161 C68 161 20 149 20 133Z','crystal')+
    shadow('M23 137 Q120 157 215 134 L214 144 L220 150 Q187 161 128 161 Q46 160 23 137Z','crystal')+
    p('M69 119 Q71 70 103 64 Q126 56 146 64 L141 75 L153 72 L151 84 L165 79 Q187 91 188 118 Q133 139 69 119Z','paper')+
    shadow('M165 79 Q180 94 170 122 L186 118 Q191 96 165 79Z','paper')+
    ellipse(128,97,38,27,'coal')+ellipse(128,96,29,21,'toxic')+
    ellipse(139,97,9,17,'deep-water')+
    [61,103,151,193].map((x,i)=>ellipse(x,i===0||i===3?143:151,9,5,i===0?'uranium':'coal','stroke-width="4"')).join('')+
    line('M166 118 L159 135 L174 142 L163 154 M49 149 L63 155 L57 166 M108 73 L116 86 L109 98','ink',4)+
    p('M182 124 L194 128 L185 139 L195 146 L179 151 L177 138Z','coal','stroke-width="3"');
}
function salvageGear(x,y,r) {
  let b='';
  for(let i=0;i<8;i++)b+=g(rect(-round(r*.2),-r,round(r*.4),round(r*.5),4,'rock'),`transform="rotate(${i*45})"`);
  return g(b+circle(0,0,round(r*.7),'rock')+p(`M${round(r*.5)} ${-round(r*.5)} A${round(r*.7)} ${round(r*.7)} 0 0 1 ${-round(r*.5)} ${round(r*.5)}`,null,`stroke="${C('rock-dark')}" stroke-width="4"`)+circle(0,0,round(r*.3),'coal')+shine(`M${-round(r*.4)} ${-round(r*.3)} L${-round(r*.2)} ${-round(r*.4)}`,3),`transform="translate(${x} ${y})" stroke-width="5"`);
}
function lootPopup() {
  let b=`<defs><radialGradient id="salvage-glow"><stop stop-color="${C('crystal')}" stop-opacity="0.5"/><stop offset="1" stop-color="${C('crystal')}" stop-opacity="0"/></radialGradient></defs>`;
  b+=g(p('M308 165 Q287 148 302 131 Q288 114 307 99 Q301 76 326 71 Q345 50 361 70 Q389 68 390 90 Q419 104 399 126 Q415 146 393 160 Q359 177 337 163Z','rock-dark','stroke-width="6" opacity="0.8"')+
    circle(380,51,22,'rock','stroke-width="5" opacity="0.5"')+circle(420,27,13,'snow','stroke-width="4" opacity="0.3"')+
    line('M319 111 Q330 95 344 109 M362 137 Q378 140 381 125','rock',5),'id="smoke"');
  b+=g(g(wreckHull(),'transform="translate(249 231) rotate(29) scale(1.7) translate(-128 -128)" stroke-width="7"')+
    // Highlights are painted in screen coordinates after tilting the hull.
    shine('M234 120 Q249 110 262 113',7)+shine('M115 157 Q133 152 151 157',6)+ellipse(278,162,8,4,'cream','stroke="none" transform="rotate(29 278 162)"'),'id="wreck"');
  b+=g(p('M397 256 L420 247 L436 264 L418 279 L405 274Z','crystal','stroke-width="6"')+
    p('M61 256 L80 247 L91 268 L76 280 L60 272Z','rock','stroke-width="6"')+
    line('M79 305 L91 312 M437 300 L449 293','rock',5),'id="debris"');
  // Lid opens backwards, leaving a clear coal-colored mouth above the front.
  b+=g(g(rect(120,291,162,63,12,'clay')+rect(132,300,138,44,7,'sand')+
    line('M144 305 L255 337 M255 305 L144 337','iron',8)+shine('M136 300 H233',4),'transform="rotate(-12 201 351)" stroke-width="8"')+
    p('M120 353 L148 332 H283 L305 350 L277 378 H143Z','iron','stroke-width="8"')+
    p('M136 352 L153 341 H277 L290 352 L273 365 H151Z','coal','stroke-width="5"')+
    p('M120 353 L145 371 H277 V447 H146 Q128 447 126 431Z','clay','stroke-width="8"')+
    p('M277 371 L305 350 L298 421 Q298 432 277 447Z','iron','stroke-width="8"')+
    rect(142,378,120,54,7,'sand','stroke-width="5"')+
    line('M150 385 L253 425 M253 385 L150 425','iron',9)+
    rect(187,367,29,26,6,'rock','stroke-width="5"')+shine('M148 380 H178',4),'id="crate"');
  b+=g(p('M278 424 L345 404 L380 421 L318 448Z','rock','stroke-width="6"')+
    p('M278 424 V438 L318 461 L380 435 V421 L318 448Z','rock-dark','stroke-width="6"')+
    shine('M289 425 L342 411',3)+line('M318 448 V461','ink',3)+
    p('M84 413 L111 400 L128 414 L109 430 L85 425Z','rock','stroke-width="6"')+
    salvageGear(324,377,24)+salvageGear(423,427,28),'id="metal"');
  b+=g(circle(374,339,65,null,'fill="url(#salvage-glow)" stroke="none"')+
    p('M375 289 L398 318 L387 365 L366 382 L347 355 L353 317Z','crystal','stroke-width="7"')+
    shadow('M375 289 L371 334 L366 382 L387 365 L398 318 L371 334Z','crystal')+
    line('M353 317 L371 334 L398 318','oil-sheen',3)+shine('M360 318 L371 303',4)+
    star(418,328,10,'cream')+star(339,289,8,'crystal'),'id="crystal" stroke-width="3"');
  b+=g([[353,455,0],[381,441,-18],[401,468,12],[235,465,-8]].map(([x,y,a])=>g(ellipse(0,3,14,10,'ascension')+
    ellipse(0,0,14,10,'energy')+line('M-7 -2 Q-3 -6 3 -5','cream',3),`transform="translate(${x} ${y}) rotate(${a})"`)).join(''),'id="coins" stroke-width="5"');
  return b;
}
if(STAGE>=2)emit('popup-loot',512,lootPopup(),['smoke','wreck','debris','crate','metal','crystal','coins'],['popup','celebration','mothership-destroyed','salvage']);

write('art/manifest/popups.json',JSON.stringify({assets},null,2)+'\n');
console.log(`Popup art: stage ${STAGE}, ${assets.length} ids generated.`);
