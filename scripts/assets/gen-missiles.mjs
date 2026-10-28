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

function emp(frame){
  const coil=x=>ellipse(x,64,6,19,'clay')+
    ellipse(x,64,2.5,14,'deep-water','stroke-width="1.5"')+
    shine(`M${x-3} 55Q${x-3} 49 ${x} 48`,1.5);
  const spark=d=>line(d,'ink',4.5)+line(d,'energy',2);
  const hull=
    path('M40 49L38 37Q38 33 43 36L58 48M40 79L38 91Q38 95 43 92L58 80','energy')+
    rect(25,54,15,20,5,'rock-dark')+
    rect(34,46,54,36,12,'deep-water')+
    shadow('M35 69Q59 80 85 68V75Q85 82 76 82H46Q37 82 35 74Z','deep-water')+
    rect(59,46,16,36,4,'energy','stroke-width="1.5"')+
    shadow('M60 72H75V80H60Z','energy')+
    line('M44 61H52M44 68H52','science',2)+shine('M42 51H51',2)+
    // A rounded copper solenoid is the nose itself, with no glass cockpit.
    rect(79,55,33,18,7,'deep-water')+
    coil(84)+coil(92)+coil(100)+coil(108)+
    circle(114,64,4,'energy','stroke-width="1.5"')+
    spark('M96 32L92 38L100 40L97 46')+
    spark('M109 84L115 88L110 94')+
    spark('M119 48L116 53L122 55');
  return flight(hull,exhaust(frame));
}

function nuke(frame){
  const trefoil=[0,120,240].map(a=>`<g transform="rotate(${a} 73 64)">${
    path('M70 59L67 54Q66 52 69 52Q76 49 81 54Q83 56 81 57L77 61Q74 58 70 59Z','coal','stroke="none"')
  }</g>`).join('')+circle(73,64,2.5,'coal','stroke="none"');
  const hull=
    // A heavy pill with blunt fins, rather than the passenger rockets' swept wings.
    path('M39 47L38 36Q38 32 43 33L56 43M39 81L38 92Q38 96 43 95L56 85','rock-dark')+
    rect(25,53,18,22,6,'rock-dark')+
    rect(34,41,68,46,16,'moss')+
    shadow('M35 68Q60 85 99 71V81Q94 87 84 87H50Q37 87 35 74Z','moss')+
    rect(58,41,29,46,6,'energy','stroke-width="1.5"')+
    shadow('M59 77Q73 82 86 77V85H59Z','energy')+
    trefoil+
    path('M98 42Q115 45 120 59Q122 64 120 69Q115 83 98 86Q91 85 91 78V50Q91 43 98 42Z','rock')+
    shadow('M92 72Q110 81 120 64Q118 80 99 86Q92 85 92 78Z','rock')+
    line('M95 47Q91 64 95 81','rock-dark',2)+
    circle(44,59,2,'paper','stroke="none"')+circle(44,70,2,'rock-dark','stroke="none"')+
    shine('M44 47H51',2)+shine('M62 46H80',2)+shine('M101 48Q108 50 111 55',2);
  // Bright flat green tones provide the glow cue without SVG filters or gradients.
  return flight(hull,exhaust(frame,'uranium','toxic'));
}

function dropship(frame){
  const rivet=(x,y)=>circle(x,y,1.5,'paper','stroke="none"');
  const hull=
    // Two short rear pods and a tall slab-sided troop bay. The occupied hull
    // area is deliberately much larger than rocket-big's slender passenger tube.
    rect(24,31,29,23,7,'rock-dark')+rect(24,74,29,23,7,'rock-dark')+
    rect(24,36,10,13,4,'coal')+rect(24,79,10,13,4,'coal')+
    path('M44 29H91Q99 29 104 34L117 46Q122 50 122 57V77Q122 84 116 88L103 97Q99 100 91 100H44Q34 100 34 90V39Q34 29 44 29Z','rock')+
    shadow('M35 81Q63 94 98 89L121 77Q121 85 115 88L103 97Q99 100 91 100H44Q34 100 34 90Z','rock')+
    // Separate chunky armor plates, with small round fasteners and warm windows.
    path('M43 30H89Q97 30 102 36L106 41H43Q39 41 39 37V34Q39 30 43 30Z','deep-water')+
    rect(41,51,51,37,7,'deep-water')+
    shadow('M42 76H91V81Q91 88 84 88H49Q42 88 42 81Z','deep-water')+
    line('M48 68H84','science',2)+
    [48,61,74,87].map(x=>circle(x,46,4,'energy','stroke-width="2"')).join('')+
    [48,85].map(x=>[58,81].map(y=>rivet(x,y)).join('')).join('')+
    path('M45 91H91L103 96H45Z','rock-dark','stroke-width="1.5"')+
    shine('M44 33H83',2)+line('M46 55H79','science',2)+
    // The blunt right-hand face is a wide closed boarding ramp, never a cockpit.
    path('M98 40L115 47Q120 49 120 55V78Q120 83 115 86L98 93Z','rock-dark')+
    path('M102 49L114 54V79L102 84Z','rock','stroke-width="2"')+
    line('M104 57L112 59M104 66L112 68M104 75L112 77','rock-dark',2)+
    rect(95,49,5,12,2,'paper','stroke-width="1.5"')+
    rect(95,75,5,12,2,'paper','stroke-width="1.5"')+
    shine('M103 44L113 48',1.5)+rivet(118,55)+rivet(118,78);
  const flames=`<g transform="translate(0 -22)">${exhaust(frame)}</g>`+
    `<g transform="translate(0 22)">${exhaust(frame)}</g>`;
  return flight(hull,flames);
}

const ships=[
  {name:'missile-homing',draw:homing},
  {name:'missile-emp',draw:emp},
  {name:'missile-nuke',draw:nuke},
  {name:'dropship',draw:dropship},
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
