// Original PlanetForge toy military craft; no external artwork or dependencies.
// Run: node scripts/assets/gen-missiles.mjs, then assets:gen and assets:check.
import {C, svg, round, write} from './common.mjs';

// Local copies of the menu/galaxy drawing conventions. Light stays top-left.
const path = (d,token=null,extra='') => `<path d="${d}" fill="${token?C(token):'none'}" ${extra}/>`;
const rect = (x,y,w,h,r,token,extra='') => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="${C(token)}" ${extra}/>`;
const circle = (x,y,r,token,extra='') => `<circle cx="${round(x)}" cy="${round(y)}" r="${round(r)}" fill="${C(token)}" ${extra}/>`;
const ellipse = (x,y,rx,ry,token,extra='') => `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="${C(token)}" ${extra}/>`;
const group = (id,body,extra='') => `<g id="${id}" ${extra}>${body}</g>`;
const line = (d,token='ink',width=1.5) => path(d,null,`stroke="${C(token)}" stroke-width="${width}"`);
const shadow = (d,token) => `<path d="${d}" fill="${C(token,-.18)}" stroke="none"/>`;
const shine = (d,width=2) => line(d,'cream',width);

// Same engine attachment as ship.rocket-big. Only this group changes per frame.
function exhaust(frame,outer='ascension',inner='energy'){
  const tip=frame===1?12:6;
  return path(`M28 57Q15 54 ${tip} 64Q15 75 28 71Z`,outer)+
    path(`M28 60Q19 58 ${tip+7} 64Q19 71 28 68Z`,inner,'stroke="none"')+
    path('M28 62L20 64L28 66Z','cream','stroke="none"');
}
function flight(hull,flame){
  return group('exhaust',flame)+group('hull',hull)+
    '<g id="engine-anchor" transform="translate(26.8 64)"/>';
}

function homing(frame){
  const hull=
    // Four small fins: rear pair and forward stabilizers, all rounded at the tips.
    path('M37 55L32 44Q31 40 36 42L54 54M37 73L32 84Q31 88 36 86L54 74','danger')+
    path('M77 55L74 48Q73 44 77 46L90 55M77 73L74 80Q73 84 77 82L90 73','danger')+
    rect(25,56,13,16,4,'rock-dark')+
    rect(33,53,69,22,9,'snow')+
    path('M45 53H55L48 75H38ZM68 53H78L71 75H61Z','danger','stroke="none"')+
    shadow('M34 69H99V75H42Q35 75 34 69Z','snow')+
    // Broad glassy cap with a tiny target eye, rather than a crew porthole.
    path('M96 51Q113 50 120 61Q123 64 120 67Q113 78 96 77Q90 64 96 51Z','science')+
    shadow('M94 69Q110 74 120 64Q119 73 107 77H96Z','science')+
    line('M97 53Q92 64 97 75','deep-water',2)+
    circle(112,64,4.5,'danger','stroke-width="1.5"')+circle(111,62.5,1.3,'snow','stroke="none"')+
    shine('M39 57H44M59 57H65',1.5)+shine('M101 55Q107 54 111 57',2);
  return flight(hull,exhaust(frame));
}

const ships=[
  {name:'missile-homing',draw:homing},
];
const assets=[];
for(const {name,draw} of ships){
  for(let f=1;f<=2;f++)write(`art/src/space/${name}-f${f}.svg`,svg(draw(f),128));
  assets.push({id:`ship.${name}`,category:'space',src:`art/src/space/${name}-f{f}.svg`,
    out:`public/assets/sprites/space/${name}-f{f}.png`,viewBox:[128,128],anchor:[.5,.5],
    frames:2,fps:6,parts:['hull','exhaust','engine-anchor'],
    tags:['star-map','ship','nose-right','flight','loop'],phase:'P1'});
}
write('art/manifest/missiles.json',JSON.stringify({assets},null,2)+'\n');
console.log(`Missiles and drop ship: ${assets.length} ids, ${assets.length*2} SVG frames generated.`);
