// Original PlanetForge HUD art. Run: node scripts/assets/gen-hud-icons.mjs
// The shared assets:gen merges fragments; this standalone generator owns only
// hud-icons.json and the SVGs listed there. No runtime or shared generator edits.
import {C, svg, write} from './common.mjs';

const assets = [];
// Small primitives follow gen-ui.mjs; illustrations below are authored here.
const p = (d, color, extra = '') => `<path d="${d}" fill="${color ? C(color) : 'none'}" ${extra}/>`;
const rect = (x,y,w,h,r,color) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="${C(color)}"/>`;
const circ = (x,y,r,color) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${C(color)}"/>`;
const ellipse = (x,y,rx,ry,color) => `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="${C(color)}"/>`;
const group = (body, transform) => `<g transform="${transform}">${body}</g>`;
const detail = d => p(d,null,'stroke-width="1.5"');
const shine = d => p(d,null,`stroke="${C('cream')}" stroke-width="4"`);
const shadow = (d,color) => `<path d="${d}" fill="${C(color,-.18)}" stroke="none"/>`;
const sparkle = (x,y,r) => p(`M${x} ${y-r} Q${x+2} ${y-2} ${x+r} ${y} Q${x+2} ${y+2} ${x} ${y+r} Q${x-2} ${y+2} ${x-r} ${y} Q${x-2} ${y-2} ${x} ${y-r}Z`,'cream');
// The same paw language as gen-ui, with a palm and four separate rounded toes.
const paw = (color='paper') => p('M39 80 Q34 65 46 54 Q57 43 66 47 Q83 46 92 63 Q104 83 89 92 Q78 96 66 89 Q49 99 39 88Z',color)+ellipse(34,44,10,14,color)+ellipse(58,30,10,14,color)+ellipse(84,33,10,14,color)+ellipse(104,49,9,13,color);

function emit(name,body) {
  const src=`art/src/ui/${name}.svg`;
  write(src,svg(body));
  assets.push({id:`ui.${name}`,category:'ui',src,out:`public/assets/sprites/ui/${name}.png`,viewBox:[128,128],anchor:[.5,.5],frames:1,parts:[],tags:['ui',name],phase:'P1'});
}

// 1. Top bar and planet panel. Keep every outline inside the 8 px safe margin.
emit('icon-ascension',
  p('M51 22 Q53 16 56 22 L67 46 L94 49 Q100 50 95 55 L75 74 L80 101 Q81 107 75 104 L53 91 L29 104 Q24 107 25 101 L30 74 L11 55 Q7 50 13 49 L40 46Z','energy')+
  shadow('M53 57 L75 74 L80 101 Q81 107 75 104 L53 91 L29 104 L41 73Z','energy')+
  shine('M22 55 L43 53 L51 35')+
  p('M98 13 L116 34 H106 V57 H90 V34 H80Z','ascension')+
  sparkle(20,24,8)+sparkle(105,88,9));

function smallPlanet(x,y,color,land) {
  return circ(x,y,15,color)+p(`M${x-12} ${y-6} Q${x-5} ${y-13} ${x+1} ${y-7} L${x-1} ${y} L${x-10} ${y+5}Z`,land,'stroke="none"')+
    shadow(`M${x+10} ${y-11} A15 15 0 0 1 ${x-7} ${y+13} Q${x+14} ${y+12} ${x+10} ${y-11}Z`,color)+
    shine(`M${x-8} ${y-9} L${x-4} ${y-11}`);
}
emit('icon-planets',smallPlanet(35,27,'water','grass')+smallPlanet(35,64,'clay','sand')+smallPlanet(35,101,'crystal','snow')+
  [23,60,97].map(y=>rect(63,y,45,8,4,'paper')).join(''));

emit('icon-menu',circ(64,68,50,'paper')+circ(64,62,50,'cream')+
  shine('M30 36 Q40 23 57 22')+
  [34,56,78].map(y=>rect(31,y,66,13,6,'rock-dark')+p(`M38 ${y+3} H88`,null,`stroke="${C('rock')}" stroke-width="2"`)).join(''));

emit('icon-rename',p('M19 107 Q32 94 47 106 Q62 117 77 103 Q91 91 110 102',null,'stroke-width="7"')+
  group(rect(46,15,26,70,6,'energy')+rect(46,15,26,17,5,'danger')+rect(46,30,26,9,2,'rock')+
    shadow('M62 40 H70 V84 H62Z','energy')+p('M46 85 H72 L59 108Z','sand')+p('M54 100 L59 108 L64 100Z','ink')+shine('M52 45 V76'),'rotate(38 59 63)'));

emit('icon-thaw',rect(21,23,69,91,27,'snow')+rect(31,34,49,65,20,'science')+
  p('M35 72 Q54 54 76 69 V83 Q76 96 56 96 Q35 96 35 83Z','ascension')+
  p('M40 78 Q55 66 71 78 V84 Q69 91 55 91 Q42 91 40 84Z','energy','stroke="none"')+
  shadow('M75 99 Q86 91 86 75 V89 Q86 111 65 111 H46 Q30 111 26 99Z','snow')+
  group(paw('paper'),'translate(55 3) rotate(20 32 32) scale(0.5)')+
  shine('M38 47 Q38 40 46 39')+
  p('M18 44 V64 M10 49 L26 59 M10 59 L26 49',null,`stroke="${C('deep-water')}" stroke-width="3"`)+
  p('M103 15 Q113 19 116 29 M101 27 L107 32',null,`stroke="${C('ascension')}" stroke-width="4"`));

emit('icon-unlock',rect(75,44,40,65,5,'paper')+p('M80 52 L103 58 V113 L80 105Z','clay')+circ(96,83,2,'cream')+
  p('M30 62 V35 Q30 15 49 15 Q67 15 67 32',null,'stroke-width="12"')+
  p('M30 62 V35 Q30 15 49 15 Q67 15 67 32',null,`stroke="${C('rock')}" stroke-width="6"`)+
  rect(12,59,61,48,12,'energy')+shadow('M14 93 H71 V95 Q71 105 60 105 H25 Q14 105 14 93Z','energy')+
  circ(42,79,6,'ink')+p('M42 82 V91',null,'stroke-width="6"')+shine('M21 67 H35'));

// 2. Factions and diplomacy. Votes use a raised forearm and an upper speech
// bubble, distinct from the existing assign/unassign paw with a lower badge.
emit('icon-factions',
  p('M30 27 Q50 17 73 25 Q94 33 111 23 V76 Q95 87 74 78 Q50 69 30 80Z','crystal')+
  shadow('M31 69 Q50 58 75 70 Q96 78 110 67 V76 Q95 87 74 78 Q50 69 31 80Z','crystal')+
  group(paw('cream'),'translate(42 24) scale(0.5)')+
  rect(22,22,10,91,5,'clay')+circ(27,18,8,'energy')+shine('M39 29 L51 27'));

const heart = () => p('M64 106 Q24 79 26 59 Q28 38 46 41 Q58 42 64 54 Q71 39 84 41 Q104 43 102 62 Q98 83 64 106Z','danger')+
  shadow('M95 46 Q100 68 64 96 L45 90 L64 106 Q99 82 102 62 Q104 53 95 46Z','danger')+shine('M35 58 Q37 49 45 49');
emit('icon-merge',p('M29 61 V84 Q29 96 64 96 Q99 96 99 84 V61 M64 96 V114',null,'stroke-width="7"')+
  p('M23 55 H62 V91 L44 82 L23 91Z','science')+p('M65 55 H105 V91 L84 82 L65 91Z','crystal')+
  circ(45,46,31,'science')+circ(83,46,31,'crystal')+
  shadow('M112 38 Q115 67 85 76 Q69 78 59 65 Q90 80 112 38Z','crystal')+
  shine('M24 35 Q29 25 39 24')+shine('M64 31 Q70 24 78 24')+
  group(heart(),'translate(21 45) scale(0.7)'));

emit('icon-gift',rect(24,49,80,63,10,'clay')+
  shadow('M26 97 H102 V101 Q102 110 94 110 H34 Q26 110 26 97Z','clay')+
  p('M64 42 Q20 44 24 23 Q28 9 43 20 Q56 29 64 42Z','energy')+
  p('M64 42 Q106 42 104 23 Q99 8 84 20 Q71 29 64 42Z','energy')+
  rect(17,41,94,23,7,'danger')+rect(55,42,18,70,4,'energy')+
  circ(64,39,9,'energy')+shine('M29 49 H45')+shine('M32 23 Q40 22 47 31'));

function vote(yes) {
  return p('M28 109 V74 Q24 65 31 58 L63 56 Q72 66 65 80 V109Z','clay')+
    shadow('M54 76 H65 V109 H54Z','clay')+
    group(paw('paper'),'translate(1 25) scale(0.7)')+
    p('M27 107 H67 V116 H27Z','science')+
    p('M80 11 H103 Q117 11 117 25 V47 Q117 61 103 61 H87 L72 75 V59 Q65 55 65 45 V25 Q65 11 80 11Z',yes?'ok':'danger')+
    p(yes?'M76 34 L86 45 L106 24':'M79 24 L103 47 M103 24 L79 47',null,`stroke="${C('cream')}" stroke-width="7"`)+
    shine('M34 91 V100');
}
emit('icon-vote-yes',vote(true));
emit('icon-vote-no',vote(false));

emit('icon-surrender',p('M41 28 Q61 14 84 24 Q100 30 113 24 L105 70 Q89 77 74 68 Q55 60 39 73Z','snow')+
  shadow('M42 62 Q58 49 76 59 Q94 69 107 59 L105 70 Q89 77 74 68 Q55 60 40 72Z','snow')+
  p('M24 113 L38 71 L40 19',null,'stroke-width="9"')+
  p('M24 113 L38 71 L40 19',null,`stroke="${C('clay')}" stroke-width="4"`)+shine('M51 29 Q61 24 71 26'));

// A level beam with two equal bowls. The large handshake sits below, so the
// draw silhouette cannot be confused with the shield/link alliance icon.
function smallScale() {
  return p('M64 13 V54 M36 22 H92 M53 54 H75',null,'stroke-width="5"')+
    p('M36 23 L26 42 H46Z M92 23 L82 42 H102Z',null,'stroke-width="2"')+
    p('M24 41 H48 Q46 53 36 53 Q26 53 24 41Z M80 41 H104 Q102 53 92 53 Q82 53 80 41Z','energy')+circ(64,22,5,'energy');
}
emit('icon-draw',smallScale()+
  p('M13 77 L29 63 L53 76 L70 72 L96 89 L81 112 Q74 118 66 112 L36 95 L24 101Z','clay')+
  p('M115 76 L99 62 L81 70 L66 65 Q59 62 54 68 L43 79 Q38 85 44 89 Q49 94 55 89 L66 81 L89 99 L101 103Z','paper')+
  p('M14 77 L27 68 L40 94 L26 103Z','science')+p('M99 64 L114 75 L102 103 L89 96Z','crystal')+
  detail('M58 98 L67 105 M66 91 L77 100 M74 86 L86 94')+shine('M57 73 L63 69 L77 74'));

write('art/manifest/hud-icons.json',JSON.stringify({assets},null,2)+'\n');
console.log(`HUD icons: ${assets.length} entries`);
