// Original PlanetForge menu and star-map additions. No external artwork.
// Run: node scripts/assets/gen-menu.mjs
import {C, svg, round, write} from './common.mjs';

// Each release checkpoint remains independently reproducible.
const RELEASE = 5;
const assets = [];
const p = (d, token, extra = '') => `<path d="${d}" ${/\bfill=/.test(extra) ? '' : `fill="${token ? C(token) : 'none'}"`} ${extra}/>`;
const circle = (x,y,r,token,extra='') => `<circle cx="${round(x)}" cy="${round(y)}" r="${round(r)}" ${/\bfill=/.test(extra) ? '' : `fill="${token ? C(token) : 'none'}"`} ${extra}/>`;
const ellipse = (x,y,rx,ry,token,extra='') => `<ellipse cx="${round(x)}" cy="${round(y)}" rx="${round(rx)}" ry="${round(ry)}" ${/\bfill=/.test(extra) ? '' : `fill="${token ? C(token) : 'none'}"`} ${extra}/>`;
const rect = (x,y,w,h,r,token,extra='') => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="${C(token)}" ${extra}/>`;
const g = (body,transform='',extra='') => `<g ${transform ? `transform="${transform}"` : ''} ${extra}>${body}</g>`;
const shade = (d,token) => `<path d="${d}" fill="${C(token,-.18)}" stroke="none"/>`;
const shine = (d,w=3) => p(d,null,`stroke="${C('cream')}" stroke-width="${w}"`);
const star = (x,y,r,token='cream') => p(`M${x} ${y-r} Q${x+2} ${y-2} ${x+r} ${y} Q${x+2} ${y+2} ${x} ${y+r} Q${x-2} ${y+2} ${x-r} ${y} Q${x-2} ${y-2} ${x} ${y-r}Z`,token,'stroke="none"');
function emit(id,category,body,w=128,h=w,extra={}) {
  const name=id.replaceAll('.','-'),frames=extra.frames??1;
  for(let f=1;f<=frames;f++)write(`art/src/${category}/${name}${frames>1?`-f${f}`:''}.svg`,svg(typeof body==='function'?body(f):body,w,h,round(extra.stroke??6*w/256)));
  const {stroke,...meta}=extra,stem=`${name}${frames>1?'-f{f}':''}`;
  assets.push({id,category,src:`art/src/${category}/${stem}.svg`,out:`public/assets/sprites/${category}/${stem}.png`,viewBox:[w,h],anchor:[.5,.5],frames,parts:[],tags:[category,'menu'],phase:'P1',...meta});
}
function glow(id,token,alpha=.3) {
  return `<radialGradient id="${id}"><stop stop-color="${C(token)}" stop-opacity="${alpha}"/><stop offset="0.5" stop-color="${C(token)}" stop-opacity="0.1"/><stop offset="1" stop-color="${C(token)}" stop-opacity="0"/></radialGradient>`;
}
function homeHouse() {
  return rect(-23,-46,46,45,7,'cream')+shade('M10 -43 H23 V-8 Q23 -1 16 -1 H10Z','cream')+
    p('M-29 -43 Q-34 -46 -27 -52 L-5 -70 Q0 -74 5 -70 L29 -52 Q35 -46 28 -43Z','clay')+
    rect(-6,-23,13,22,4,'iron')+rect(-17,-36,10,10,3,'science')+shine('M-23 -50 L-5 -65',2);
}
function citizen(kind='beaver',wave=true) {
  const hedgehog=kind==='hedgehog';
  let b=hedgehog?p('M-28 -20 L-32 -36 L-22 -40 L-28 -53 L-13 -54 L-14 -67 L0 -61 L10 -72 L17 -58 L30 -60 L27 -46 L36 -40 L28 -28Z','iron'):
    ellipse(23,-10,10,18,'iron','transform="rotate(30 23 -10)"')+p('M18 -19 L29 -9 M15 -12 L25 -2',null,'stroke-width="1.5"');
  b+=ellipse(0,-18,18,19,hedgehog?'savanna':'clay')+rect(-15,-24,30,23,7,hedgehog?'leaf':'science')+
    ellipse(-11,0,9,4,'iron')+ellipse(12,0,9,4,'iron');
  if(!hedgehog)b+=circle(-19,-48,8,'iron')+circle(19,-48,8,'iron');
  b+=ellipse(0,-40,23,21,hedgehog?'sand':'clay')+ellipse(1,-33,14,10,'sand')+
    circle(-9,-43,2.5,'ink')+circle(9,-43,2.5,'ink')+ellipse(0,-34,5,3,'ink');
  b+=hedgehog?p('M-5 -27 Q0 -23 5 -27',null,'stroke-width="2"'):rect(-6,-28,12,9,2,'cream')+p('M0 -27 V-20',null,'stroke-width="1.5"');
  if(!hedgehog)b+=p('M-20 -53 Q-17 -69 0 -69 Q18 -69 20 -53Z','energy')+rect(-24,-54,48,6,3,'ascension')+shine('M-13 -59 L-5 -63',2);
  if(wave)b+=p('M17 -23 Q33 -25 32 -45',null,`stroke="${C('ink')}" stroke-width="12"`)+p('M17 -23 Q33 -25 32 -45',null,`stroke="${C(hedgehog?'savanna':'clay')}" stroke-width="7"`)+circle(32,-46,5,hedgehog?'savanna':'clay')+shine('M41 -54 L45 -58 M44 -44 H49',2);
  return b;
}
const polar=(r,a)=>[round(r*Math.sin(a*Math.PI/180)),round(-r*Math.cos(a*Math.PI/180))].join(' ');
const sector=(inner,outer,a,b)=>`M${polar(outer,a)} A${outer} ${outer} 0 0 1 ${polar(outer,b)} L${polar(inner,b)} A${inner} ${inner} 0 0 0 ${polar(inner,a)}Z`;
function homePlanet() {
  let b=circle(0,0,144,'clay')+circle(0,0,124,null,`stroke="${C('iron')}" stroke-width="8" opacity="0.3"`)+
    p('M-90 -38 Q-64 -96 9 -87 M73 47 Q57 88 -14 89',null,`stroke="${C('clay',-.18)}" stroke-width="6" opacity="0.4"`);
  for(let i=0;i<12;i++) {
    const a=i*30-15,token=[0,1,4,5,6,9,10,11].includes(i)?'grass':'water';
    b+=p(sector(143,169,a,a+30),token,'stroke-width="2"')+p(sector(162,169,a,a+30),null,`fill="${C(token,.18)}" stroke="none"`);
    b+=g(token==='water'?p('M-12 -154 Q-6 -148 0 -154 Q6 -160 12 -154',null,`stroke="${C('snow')}" stroke-width="2"`):p('M-10 -153 L-6 -157 L-1 -152 M4 -154 L8 -158 L12 -154',null,`stroke="${C('leaf')}" stroke-width="2"`),`rotate(${i*30})`);
  }
  b+=p('M121 -118 A169 169 0 0 1 -62 157 Q145 138 121 -118Z','ink','stroke="none" opacity="0.2"')+shine('M-148 -56 Q-134 -99 -104 -122',4);
  const tree=rect(-4,-39,8,39,3,'clay')+ellipse(0,-39,18,23,'leaf')+ellipse(-6,-47,7,6,'grass','stroke="none"');
  b+=g(tree,'rotate(-57) translate(0 -168)')+g(tree,'rotate(53) translate(0 -168)')+
    g(homeHouse(),'rotate(-25) translate(0 -169)')+g(homeHouse(),'rotate(25) translate(0 -169) scale(0.8)')+
    g(citizen(),'translate(-4 -167) scale(0.7)','stroke-width="3"')+
    g(citizen('hedgehog'),'rotate(82) translate(0 -168) scale(0.7)','stroke-width="3"');
  return b;
}
function distantPlanet(token,land) {
  return circle(0,0,32,token)+p('M-29 -13 Q-18 -32 3 -32 L13 -19 L8 -9 L-5 -12 L-13 -3Z',land)+
    p('M15 4 L30 10 L25 25 L12 29 L5 19Z',land)+p('M18 -26 A32 32 0 0 1 -19 26 Q37 17 18 -26Z','ink','stroke="none" opacity="0.2"')+shine('M-25 -10 Q-21 -21 -14 -24',2);
}
function menuScene(landscape=false) {
  const w=landscape?1920:1080,h=landscape?1080:1920;
  let b=`<defs><linearGradient id="sky" x2="0.6" y2="1"><stop stop-color="${C('space')}"/><stop offset="1" stop-color="${C('space-deep')}"/></linearGradient>${glow('violet','crystal',.2)}${glow('blue','science',.2)}${glow('sun-halo','energy',.5)}<radialGradient id="sun-body" cx="32%" cy="28%" r="75%"><stop stop-color="${C('energy',.18)}"/><stop offset="0.6" stop-color="${C('energy')}"/><stop offset="1" stop-color="${C('energy',-.18)}"/></radialGradient></defs>`;
  b+=p(`M0 0 H${w} V${h} H0Z`,null,'fill="url(#sky)" stroke="none"');
  b+=ellipse(landscape?1670:920,landscape?840:1500,landscape?650:500,480,null,'fill="url(#violet)" stroke="none"')+
    ellipse(landscape?200:70,landscape?1040:1780,600,390,null,'fill="url(#blue)" stroke="none"');
  // The upper-middle has no focal objects; its tiny stars are deliberately dim.
  for(let i=0;i<58;i++) {
    const x=(i*337+79)%w,y=(i*i*61+i*97+41)%h,quiet=x>w*.22&&x<w*.78&&y<h*.64;
    b+=circle(x,y,i%7===0?2.5:1.5,i%3?'cream':'science',`stroke="none" opacity="${quiet?'0.2':'0.5'}"`);
  }
  const sx=landscape?12:-18,sy=landscape?200:345;
  b+=g(circle(0,0,330,null,'fill="url(#sun-halo)" stroke="none"')+
    Array.from({length:12},(_,i)=>g(p('M-13 -130 Q-23 -155 0 -177 Q22 -157 13 -130Z','energy','stroke="none" opacity="0.4"'),`rotate(${i*30})`)).join('')+
    circle(0,0,118,null,'fill="url(#sun-body)" stroke-width="5"')+shine('M-80 -45 Q-65 -82 -29 -88',8),`translate(${sx} ${sy})`);
  b+=g(distantPlanet('water','snow'),`translate(${landscape?1740:965} ${landscape?155:610}) scale(0.8)`,'stroke-width="3"')+
    g(distantPlanet('sand','clay'),`translate(${landscape?220:96} ${landscape?770:1120}) scale(0.6)`,'stroke-width="3"');
  // Local object outlines scale with the object, not the panoramic canvas.
  b+=g(homePlanet(),landscape?'translate(1470 820) scale(1.2)':'translate(540 1490) scale(1.5)','stroke-width="4"');
  for(const [x,y] of landscape?[[1560,390],[366,954],[1790,700]]:[[190,1690],[923,1320],[160,850]])b+=star(x,y,5);
  return b;
}
function parallaxStars() {
  let b='';
  // Wrap every star in both axes, including two intentional edge-crossers.
  for(let i=0;i<29;i++) {
    const x=i===0?1:(i*353+91)%1024,y=i===1?1022:(i*i*43+i*137+61)%1024,r=i%5===0?6:2;
    const body=i%5===0?star(0,0,r,i%2?'science':'cream'):circle(0,0,r,'cream','stroke="none" opacity="0.7"');
    for(const dx of [-1024,0,1024])for(const dy of [-1024,0,1024])if(x+dx+r>=0&&x+dx-r<=1024&&y+dy+r>=0&&y+dy-r<=1024)b+=g(body,`translate(${x+dx} ${y+dy})`);
  }
  return g(b,'','id="stars"');
}
emit('menu.bg','brand',menuScene(),1080,1920,{stroke:6,tags:['menu','background','portrait','quiet-upper-middle']});
emit('menu.bg-landscape','brand',menuScene(true),1920,1080,{stroke:6,tags:['menu','background','landscape','quiet-upper-middle']});
emit('menu.bg-parallax-stars','brand',parallaxStars(),1024,1024,{parts:['stars'],tags:['menu','parallax','tileable','transparent']});

function menuButton(state) {
  const pressed=state==='pressed',token=state==='disabled'?'rock':'ascension',top=pressed?20:8;
  return rect(8,20,624,132,36,token)+
    `<rect x="8" y="20" width="624" height="132" rx="36" fill="${C(token,-.18)}"/>`+
    rect(8,top,624,132,36,token)+
    p(`M44 ${top+12} H596`,null,`stroke="${C(token,.18)}" stroke-width="4"`);
}
if(RELEASE>=2)for(const state of ['normal','pressed','disabled'])emit(`ui.button-menu${state==='normal'?'':'-'+state}`,'ui',menuButton(state),640,160,{stroke:6,sliceInsets:[48,48,48,48],tags:['ui','menu','button',state]});

function iconPlanet() {
  return circle(64,64,40,'water')+p('M26 51 Q34 28 57 25 L70 35 L65 47 L49 43 L41 55Z','grass')+
    p('M68 67 L91 57 L103 69 L93 87 L75 98 L65 83Z','leaf')+
    p('M86 31 A40 40 0 0 1 41 97 Q107 85 86 31Z','ink','stroke="none" opacity="0.2"')+shine('M32 51 Q36 39 46 34');
}
function iconRocket(token='clay') {
  return p('M40 52 L42 29 Q43 24 49 28 L69 43 M40 76 L42 99 Q43 104 49 100 L69 85',token)+
    rect(22,52,22,24,5,'rock')+p('M33 46 Q73 36 105 64 Q73 92 33 82Z','cream')+
    p('M84 50 Q96 55 105 64 Q96 73 84 78Z',token)+shade('M33 73 Q67 80 88 73 L84 78 Q60 91 33 82Z','cream')+
    circle(60,64,12,'deep-water')+circle(60,64,8,'science')+shine('M39 51 L48 49',2)+shine('M57 60 L61 59',2);
}
function menuIcon(name) {
  switch(name) {
    case 'new-game':return iconPlanet()+circle(96,94,22,'ok')+p('M96 82 V106 M84 94 H108',null,`stroke="${C('cream')}" stroke-width="6"`);
    case 'continue':return iconPlanet()+p('M53 40 Q49 38 49 44 V85 Q49 91 55 87 L86 68 Q91 64 85 60Z','cream')+shine('M56 48 L73 59',2);
    case 'load':return p('M34 14 H82 L108 39 V88 L76 115 H34 L17 90 V36Z','crystal')+
      shade('M82 15 L76 56 L108 39 V88 L76 115 V56Z','crystal')+rect(36,18,43,27,5,'paper')+rect(57,22,12,19,3,'rock-dark')+
      g(iconPlanet(),'translate(22 27) scale(0.7)','stroke-width="4.3"')+shine('M25 40 V66',3);
    case 'join':return g(iconRocket(),'translate(-1 26) scale(0.6) rotate(-25 64 64)','stroke-width="5"')+
      g(iconRocket('crystal'),'translate(129 26) scale(-0.6 0.6) rotate(-25 64 64)','stroke-width="5"')+
      star(64,36,9,'energy')+p('M43 100 Q64 111 85 100',null,`stroke="${C('science')}" stroke-width="4"`);
    case 'mode-coop':return g(citizen('beaver',false),'translate(34 111) scale(0.8)','stroke-width="3.8"')+
      g(citizen('hedgehog',false),'translate(87 111) scale(0.8)','stroke-width="3.8"')+
      p('M64 47 Q39 32 46 20 Q54 10 64 23 Q75 10 83 20 Q90 32 64 47Z','danger')+shine('M49 24 Q51 20 55 22',2);
    case 'mode-versus':return g(iconRocket('crystal'),'rotate(-45 64 64)','stroke-width="3"')+
      g(iconRocket(),'rotate(-135 64 64)','stroke-width="3"');
    case 'slot-empty':return circle(64,64,43,null,`stroke="${C('rock')}" stroke-width="4" stroke-dasharray="10 10.8"`)+
      p('M42 43 Q64 30 86 43 M35 73 Q63 86 93 73',null,`stroke="${C('rock')}" stroke-width="2" stroke-dasharray="5 8"`);
    case 'trash':return p('M29 40 H99 L94 103 Q93 113 82 113 H46 Q35 113 34 103Z','rock')+
      shade('M81 41 H98 L93 103 Q93 113 81 113 H71Z','rock')+rect(23,28,82,14,6,'paper')+
      p('M49 28 V21 Q49 15 56 15 H73 Q80 15 80 21 V28',null,'stroke-width="6"')+
      p('M50 56 L52 96 M77 56 L75 96',null,'stroke-width="5"')+shine('M40 51 L42 76');
    case 'copy':return rect(20,14,67,82,10,'paper')+shade('M72 16 H80 Q87 16 87 24 V86 Q87 96 77 96 H71Z','paper')+
      rect(43,35,65,80,10,'cream')+p('M53 52 H92',null,`stroke="${C('clay')}" stroke-width="5"`)+
      [59,75,91].map(x=>circle(x,77,3,'rock-dark','stroke="none"')).join('')+shine('M51 43 H81');
    case 'profile':return circle(64,64,49,'cream')+circle(39,44,10,'ink')+circle(88,44,10,'ink')+
      p('M33 60 Q31 36 64 36 Q97 36 96 60 V75 Q95 98 64 98 Q33 98 33 75Z','ink')+
      rect(54,79,20,13,3,'cream','stroke="none"')+p('M64 80 V90',null,'stroke-width="2"')+shine('M28 43 Q32 32 41 28');
    case 'credits':return g(star(42,63,31,'energy'),'','stroke-width="3"')+
      p('M42 32 Q45 60 73 63 Q45 66 42 94 Q39 66 11 63 Q39 60 42 32Z',null)+
      p('M87 83 V29 L112 21 V42 L87 50',null,'stroke-width="6"')+ellipse(77,88,13,10,'crystal','transform="rotate(-20 77 88)"')+
      p('M87 29 L112 21 V38 L87 46Z','crystal')+shine('M88 29 L105 25',2);
    case 'quit':return rect(24,14,77,100,9,'rock')+rect(34,24,57,88,5,'space')+
      p('M35 25 L69 16 Q75 14 75 21 V107 Q75 114 69 112 L35 104Z','paper')+
      shade('M65 20 L73 18 V109 L65 107Z','paper')+circle(63,66,4,'iron')+shine('M41 32 V86')+
      p('M86 75 H114 M103 64 L114 75 L103 86',null,`stroke="${C('ascension')}" stroke-width="6"`);
    default:throw new Error(`Unknown menu icon ${name}`);
  }
}
if(RELEASE>=3)for(const name of ['new-game','continue','load','join','mode-coop','mode-versus','slot-empty','trash','copy','profile','credits','quit'])emit(`ui.icon-${name}`,'ui',menuIcon(name));

function exhaust(frame,base=28) {
  const tip=frame===1?12:6;
  return g(p(`M${base} 54 Q${base-14} 51 ${tip} 64 Q${base-13} 78 ${base} 74Z`,'ascension')+
    p(`M${base} 58 Q${base-9} 57 ${tip+7} 64 Q${base-8} 71 ${base} 70Z`,'energy','stroke="none"')+
    p(`M${base} 61 L${base-9} 64 L${base} 67Z`,'cream','stroke="none"'),'','id="exhaust"');
}
function flightRocket(big,frame) {
  // Preserve the project's building.rocket-* geometry and proportions. Rotate
  // only the hull; repaint highlights in screen coordinates for top-left light.
  const token=big?'crystal':'clay';
  const fins=big?p('M91 123 Q48 151 41 224 Q60 222 86 203Z',token)+p('M165 123 Q208 151 215 224 Q196 222 170 203Z',token):
    p('M91 157 Q62 171 59 231 L92 212Z',token)+p('M165 157 Q194 171 197 231 L164 212Z',token);
  const hull=fins+p('M102 205 H154 L161 236 Q128 238 95 236Z','rock-dark')+
    p(`M88 201 V${big?91:106} Q88 59 128 ${big?18:34} Q168 59 168 ${big?91:106} V201 Q128 220 88 201Z`,'cream')+
    p(`M128 ${big?18:34} Q151 40 161 ${big?67:80} Q128 95 95 ${big?67:80} Q105 44 128 ${big?18:34}Z`,token)+
    p('M157 104 V192 Q153 201 142 203',null,`stroke="${C('paper')}" stroke-width="11"`)+
    circle(128,121,24,'rock-dark')+circle(128,121,17,'science')+
    (big?p('M128 159 L144 180 L128 210 L112 180Z','crystal'):rect(115,178,26,24,9,'clay'));
  return exhaust(frame)+g(g(hull,'translate(70 64) scale(0.4) rotate(90) translate(-128 -128)','stroke-width="7.5"')+
    shine('M53 52 H64',2)+shine('M70 61 Q72 58 75 59',1.5),'','id="hull"')+
    '<g id="engine-anchor" transform="translate(26.8 64)"/>';
}
function cargoShip(frame) {
  const b=p('M40 47 L43 27 Q48 23 54 29 L66 42 M40 81 L43 101 Q48 105 54 99 L66 86','clay')+
    rect(25,52,20,24,5,'rock-dark')+rect(36,34,67,60,25,'paper')+
    shade('M39 76 Q69 93 101 76 V79 Q98 94 79 94 H60 Q40 94 39 76Z','paper')+
    p('M91 42 Q116 45 117 64 Q116 83 91 86Z','cream')+
    p('M101 49 Q111 52 112 63 Q109 67 100 67Z','science')+
    rect(44,45,39,38,9,'sand')+p('M57 45 V83 M70 45 V83',null,`stroke="${C('iron')}" stroke-width="5"`)+
    circle(88,72,3,'energy')+shine('M48 39 H77',2)+shine('M104 53 L107 56',1.5);
  return exhaust(frame)+g(b,'','id="hull"')+'<g id="engine-anchor" transform="translate(26.8 64)"/>';
}
if(RELEASE>=4)for(const kind of ['rocket-small','rocket-big','cargo'])emit(`ship.${kind}`,'space',frame=>kind==='cargo'?cargoShip(frame):flightRocket(kind==='rocket-big',frame),128,128,{frames:2,fps:6,parts:['hull','exhaust','engine-anchor'],tags:['star-map','ship','nose-right','flight','loop']});

function planetRing(kind) {
  // Exact geometric inner edge r=100 for all states; glows stay outside it.
  let b='';
  if(kind==='hover')b=circle(128,128,104,null,`stroke="${C('tint-white')}" stroke-width="8" opacity="0.2"`)+
    circle(128,128,102,null,`stroke="${C('tint-white')}" stroke-width="4" opacity="0.6"`);
  if(kind==='selected')b=circle(128,128,105,null,`stroke="${C('energy')}" stroke-width="10"`)+
    p('M34 86 A103 103 0 0 1 85 34',null,`stroke="${C('cream')}" stroke-width="2"`)+
    Array.from({length:4},(_,i)=>g(p('M128 13 V6',null,`stroke="${C('energy')}" stroke-width="4"`),`rotate(${i*90} 128 128)`)).join('');
  if(kind==='target')for(let i=0;i<20;i++) {
    const d=`M${polar(104,-5)} A104 104 0 0 1 ${polar(104,5)}`;
    b+=g(p(d,null,`stroke="${C('danger')}" stroke-width="8"`)+p(d,null,`stroke="${C('ascension')}" stroke-width="2"`),`translate(128 128) rotate(${i*18})`);
  }
  return g(b,'','id="ring"');
}
function ownedFlag() {
  return g(p('M33 12 Q47 5 58 13 L55 35 Q45 29 33 35Z','tint-white')+
    `<path d="M49 10 Q54 10 58 13 L55 35 Q52 33 48 32Z" fill="${C('rock',.18)}" stroke="none"/>`+
    p('M37 14 L44 12',null,`stroke="${C('tint-white')}" stroke-width="1.5"`),'','id="flag"')+
    rect(30,9,4,54,2,'tint-white')+circle(32,7,3,'tint-white');
}
function beltRock(variant) {
  const shape=variant%2?'M-26 -5 Q-22 -19 -9 -15 L1 -27 Q12 -32 19 -16 Q34 -10 29 7 Q26 18 11 16 Q3 32 -10 23 L-14 13 Q-29 14 -26 -5Z':
    'M-26 -13 Q-20 -28 -3 -27 L15 -23 Q28 -19 29 -3 L24 16 Q18 29 1 28 L-18 20 Q-32 13 -26 -13Z';
  return p(shape,'rock')+p('M19 -19 Q32 -6 24 16 Q18 29 1 28 L-9 24 Q18 20 19 -19Z','rock-dark','stroke="none"')+
    ellipse(-8,-7,6,4,'rock-dark','stroke-width="1.5"')+ellipse(7,10,8,6,'rock-dark','stroke-width="1.5"')+
    p('M-12 -4 Q-8 0 -3 -4 M1 13 Q7 17 13 13',null,`stroke="${C('rock',.18)}" stroke-width="1.5"`)+
    p('M-17 -18 Q-10 -23 -4 -21',null,`stroke="${C('rock',.18)}" stroke-width="2"`);
}
function asteroidBelt() {
  let dust='',rocks='';
  // Repeat all edge-crossing shapes at +/-1024. No background rectangle:
  // alpha remains zero above and below the gently irregular orbital band.
  for(let i=0;i<83;i++) {
    const x=(i*263+3)%1024,y=76+(i*i*13+i*7)%108,r=i%7===0?2:1;
    for(const dx of [-1024,0,1024])if(x+dx+r>=0&&x+dx-r<=1024)dust+=circle(x+dx,y,r,'rock',`stroke="none" opacity="${i%3===0?'0.5':'0.3'}"`);
  }
  for(let i=0;i<25;i++) {
    const x=(i*157+2)%1024,y=77+(i*i*31+i*19)%102,s=[.4,.6,.8,.5,.7][i%5];
    for(const dx of [-1024,0,1024])if(x+dx+34*s>=0&&x+dx-34*s<=1024)rocks+=g(beltRock(i),`translate(${x+dx} ${y}) scale(${s})`,'stroke-width="3"');
  }
  return g(dust,'','id="dust"')+g(rocks,'','id="asteroids"');
}
if(RELEASE>=5) {
  for(const kind of ['hover','selected','target'])emit(`space.planet-ring-${kind}`,'space',planetRing(kind),256,256,{parts:['ring'],tags:['star-map','ring',kind,'inner-radius-100']});
  emit('space.planet-owned-flag','space',ownedFlag(),64,64,{anchor:[.5,1],tintable:true,parts:['flag'],tags:['star-map','owned','tintable']});
  emit('space.asteroid-belt-tile','space',asteroidBelt(),1024,256,{stroke:3,parts:['asteroids','dust'],tags:['star-map','asteroid-belt','tileable-x','transparent']});
}

write('art/manifest/menu.json',JSON.stringify({assets},null,2)+'\n');
console.log(`Menu art: ${assets.length} ids generated (release ${RELEASE}).`);
