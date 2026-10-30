// Original PlanetForge terraforming actions and build-menu categories.
// Run this generator, then assets:gen to merge its isolated manifest fragment.
import {C, svg, write} from './common.mjs';

const assets = [];
// Pure drawing helpers copied from gen-ui; importing it would rewrite its art.
const p = (d, color, extra = '') => `<path d="${d}" fill="${color ? C(color) : 'none'}" ${extra}/>`;
const rect = (x,y,w,h,r,color,extra='') => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="${C(color)}" ${extra}/>`;
const circ = (x,y,r,color,extra='') => `<circle cx="${x}" cy="${y}" r="${r}" fill="${C(color)}" ${extra}/>`;
const ellipse = (x,y,rx,ry,color,extra='') => `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="${C(color)}" ${extra}/>`;
const group = (body, transform) => `<g transform="${transform}">${body}</g>`;
const shine = d => p(d,null,`stroke="${C('cream')}" stroke-width="4"`);
const shadow = (d,color) => `<path d="${d}" fill="${C(color,-.18)}" stroke="none"/>`;
const detail = d => p(d,null,'stroke-width="1.5"');
const star = (x,y,r,color='energy') => p(`M${x} ${y-r} Q${x+3} ${y-3} ${x+r} ${y} Q${x+3} ${y+3} ${x} ${y+r} Q${x-3} ${y+3} ${x-r} ${y} Q${x-3} ${y-3} ${x} ${y-r}Z`,color);

function emit(name, body) {
  // Category IDs remain ui.category-*; all filenames use the requested icon- prefix.
  const filename = name.startsWith('icon-') ? name : `icon-${name}`;
  const src = `art/src/ui/${filename}.svg`;
  write(src, svg(body));
  assets.push({id:`ui.${name}`,category:'ui',src,out:`public/assets/sprites/ui/${filename}.png`,
    viewBox:[128,128],anchor:[.5,.5],frames:1,parts:[],tags:['ui',name],phase:'P1'});
}

// A broad crest remains visible beside the new shore, even at 24 px.
const wave = () => p('M15 90 Q26 74 38 83 Q50 95 62 83 Q75 72 86 83 Q99 95 113 82 V103 Q89 116 64 107 Q40 117 15 105Z','water')+
  shadow('M16 100 Q40 109 63 100 Q88 109 112 97 V103 Q89 116 64 107 Q40 117 16 105Z','water')+
  shine('M21 88 Q29 82 35 87');
// A tilted pail with a large open mouth and handle, not a tiny pouring gesture.
const bucket = () => p('M24 23 Q27 9 42 15 L57 22 Q67 28 61 40',null,'stroke-width="4"')+
  p('M22 29 L57 43 L44 70 Q40 78 31 74 L17 68 Q11 65 14 57Z','rock')+
  shadow('M48 41 L57 44 L44 70 Q40 78 31 74 L21 70 Q36 70 41 57Z','rock')+
  ellipse(40,35,22,7,'rock-dark','transform="rotate(22 40 35)"')+
  shine('M21 43 L18 56');
const drop = (x,y) => p(`M${x} ${y-9} Q${x-11} ${y+3} ${x-5} ${y+8} Q${x} ${y+13} ${x+5} ${y+8} Q${x+11} ${y+3} ${x} ${y-9}Z`,'water');

emit('icon-plant-trees',
  p('M15 103 Q25 95 34 94 Q43 79 58 85 Q70 88 77 98 Q91 98 96 109 Q61 118 19 112 Q11 110 15 103Z','iron')+
  shadow('M61 89 Q72 91 77 98 Q91 98 96 109 Q61 118 19 112 Q58 111 69 104Z','iron')+
  p('M53 95 V44',null,'stroke-width="6"')+
  p('M52 66 Q21 66 19 37 Q45 34 52 66Z','leaf')+
  p('M53 48 Q51 17 83 18 Q85 47 53 48Z','grass')+
  shine('M62 32 Q67 26 74 26')+
  // Short trowel, angled away from the sapling for a separate silhouette.
  p('M85 69 L100 41 Q103 37 107 40 L112 44 Q116 47 112 51 L94 75Z','clay')+
  p('M80 69 Q89 68 98 79 L88 96 Q82 103 70 104 Q68 92 73 83Z','rock')+
  shadow('M89 73 L98 79 L88 96 Q82 103 70 104 L82 88Z','rock')+
  shine('M78 84 L75 92'));

emit('icon-fill-sand',wave()+bucket()+
  p('M47 33 Q59 32 64 43 L83 72 L71 79 L56 48 Q53 43 46 42Z','sand')+
  p('M48 103 Q66 89 74 70 Q78 61 85 69 Q94 87 113 99 Q118 108 105 110 H55 Q44 110 48 103Z','sand')+
  shadow('M84 69 Q93 87 113 99 Q118 108 105 110 H55 Q88 105 96 100 Q86 91 84 69Z','sand')+
  shine('M66 91 L76 78')+detail('M62 101 H68 M84 96 H89'));

emit('icon-fill-clay',wave()+
  group(bucket(),'translate(76 -2) rotate(90 34 43)')+
  p('M76 50 Q70 51 64 62 L53 84 L65 88 L74 66 Q77 61 82 59Z','iron')+
  p('M18 95 Q22 84 35 84 H63 Q73 79 82 86 L97 97 Q102 110 88 111 H28 Q13 110 18 95Z','iron')+
  shadow('M72 85 Q80 82 87 91 L97 97 Q102 110 88 111 H28 Q23 111 21 107 H72 Q89 106 82 97Z','iron')+
  p('M40 88 V55',null,'stroke-width="4"')+
  p('M40 73 Q19 73 18 54 Q38 52 40 73Z','leaf')+
  p('M40 60 Q40 39 60 39 Q63 59 40 60Z','grass')+
  shine('M27 94 H49'));

emit('icon-drain-swamp',
  p('M14 93 Q25 83 46 87 Q57 81 75 86 Q91 83 108 94 Q119 105 102 111 Q79 117 61 111 Q39 118 19 110 Q9 105 14 93Z','moss')+
  shadow('M18 103 Q41 110 61 103 Q87 112 112 102 Q115 111 102 111 Q79 117 61 111 Q39 118 19 110Z','moss')+
  p('M27 89 V48 M43 89 V37',null,`stroke="${C('leaf')}" stroke-width="4"`)+
  rect(22,34,10,25,5,'iron')+rect(38,22,10,28,5,'iron')+
  p('M37 87 Q59 82 72 53 Q78 44 85 53 Q94 78 112 95 Q118 105 105 109 H69 Q51 109 37 99 Q31 93 37 87Z','sand')+
  shadow('M82 51 Q94 78 112 95 Q118 105 105 109 H69 Q90 103 91 95 Q80 86 82 51Z','sand')+
  shine('M56 85 Q65 78 72 65')+
  p('M17 69 Q28 73 22 80 Q15 84 14 77Z','moss')+
  p('M58 39 Q55 25 62 27 Q70 30 65 38Z','moss')+
  detail('M23 101 Q30 105 35 101'));

emit('icon-thaw-glacier',
  p('M17 37 Q17 30 24 28 L57 17 Q63 15 68 20 L79 32 Q83 36 82 44 L76 91 Q75 100 65 100 H26 Q16 99 16 90Z','water')+
  p('M18 36 L58 47 L80 34 M58 47 L54 98',null)+
  shadow('M59 48 L80 37 L75 91 Q74 99 65 99 H55Z','water')+
  p('M26 47 L26 72 Q26 79 31 79 Q37 79 37 73 V55Z','snow','stroke="none"')+
  shine('M27 34 L53 26')+
  ellipse(43,108,29,7,'science')+drop(62,92)+
  p('M78 106 L110 94 M79 94 L109 108',null,'stroke-width="9"')+
  p('M78 106 L110 94 M79 94 L109 108',null,`stroke="${C('iron')}" stroke-width="5"`)+
  p('M92 39 Q97 56 106 65 Q117 77 110 90 Q104 101 90 99 Q75 97 75 83 Q74 74 81 65 Q81 80 87 77 Q96 72 92 39Z','ascension')+
  p('M94 68 Q93 81 101 85 Q105 95 94 96 Q82 95 84 86Z','energy','stroke="none"'));

emit('icon-cool-lava',
  p('M13 92 Q16 78 32 77 Q31 61 47 64 Q59 66 63 78 Q77 76 88 85 Q102 94 93 105 Q76 116 56 110 Q30 116 17 106 Q11 101 13 92Z','ascension')+
  shadow('M13 98 Q29 107 54 101 Q81 109 93 95 Q102 107 80 111 Q66 115 56 110 Q30 116 17 106Z','ascension')+
  p('M21 89 Q34 84 41 88 L49 81 L60 91',null,`stroke="${C('energy')}" stroke-width="5"`)+
  p('M54 101 L64 78 Q69 70 80 74 L101 79 L113 101 Q116 111 104 113 H69 Q55 114 54 101Z','rock-dark')+
  shadow('M87 76 L101 79 L113 101 Q116 111 104 113 H82 L89 98Z','rock-dark')+
  detail('M65 89 L80 96 L76 108')+shine('M70 81 L77 79')+
  // One broad splash and two offset steam puffs keep the cooling direction clear.
  p('M59 74 Q47 69 43 55 L35 36 Q34 29 41 30 L58 53 L57 25 Q58 17 64 23 L72 49 L87 37 Q94 35 92 43 L79 64 Q73 76 59 74Z','water')+
  shine('M63 34 L66 53')+
  p('M91 65 Q82 59 87 51 Q90 46 96 49 Q93 38 102 36 Q113 34 113 44 Q121 49 115 56 Q112 60 107 59 Q104 69 96 67Z','snow')+
  p('M20 61 Q12 57 16 49 Q19 44 25 48 Q25 40 32 42 Q40 45 36 53 Q38 63 29 64Z','snow'));

write('art/manifest/action-icons.json', JSON.stringify({assets}, null, 2)+'\n');
console.log(`Action/category icons: ${assets.length} ids generated.`);
