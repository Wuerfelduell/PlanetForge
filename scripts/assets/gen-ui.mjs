// Original PlanetForge UI art. All geometry and lettering are authored here.
// Run from any directory: node scripts/assets/gen-ui.mjs
import {C, svg, round, write} from './common.mjs';

// Release counters keep each intermediate checkpoint reproducible.
const RELEASE = {resources: 15, core: 0, logo: false, extras: 0, discoveries: 0, brand: false};
const assets = [];
const p = (d, color, extra = '') => `<path d="${d}" fill="${color ? C(color) : 'none'}" ${extra}/>`;
const rect = (x,y,w,h,r,color,extra='') => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="${C(color)}" ${extra}/>`;
const circ = (x,y,r,color,extra='') => `<circle cx="${x}" cy="${y}" r="${r}" fill="${C(color)}" ${extra}/>`;
const ellipse = (x,y,rx,ry,color,extra='') => `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="${C(color)}" ${extra}/>`;
const group = (body, transform, extra='') => `<g transform="${transform}" ${extra}>${body}</g>`;
const line = d => p(d,null);
const detail = d => p(d,null,'stroke-width="1.5"');
const shine = d => p(d,null,`stroke="${C('cream')}" stroke-width="4"`);
const shadow = (d,color) => `<path d="${d}" fill="${C(color,-.18)}" stroke="none"/>`;
const star = (x=64,y=64,r=18,color='energy') => p(`M${x} ${y-r} Q${x+3} ${y-3} ${x+r} ${y} Q${x+3} ${y+3} ${x} ${y+r} Q${x-3} ${y+3} ${x-r} ${y} Q${x-3} ${y-3} ${x} ${y-r}Z`,color);
const bolt = (color='energy') => p('M70 14 Q73 12 72 18 L65 49 H94 Q100 49 96 55 L54 113 Q50 118 51 110 L57 76 H33 Q28 76 32 70Z',color);
const leaf = (color='leaf') => p('M29 91 Q17 38 95 26 Q108 84 49 94 Q37 95 29 91Z',color)+detail('M30 96 Q48 64 81 42');
const paw = (color='cream') => p('M39 80 Q34 65 46 54 Q57 43 66 47 Q83 46 92 63 Q104 83 89 92 Q78 96 66 89 Q49 99 39 88Z',color)+ellipse(34,44,10,14,color)+ellipse(58,30,10,14,color)+ellipse(84,33,10,14,color)+ellipse(104,49,9,13,color);
const crate = () => rect(24,32,80,72,10,'clay')+rect(33,40,62,55,5,'sand')+p('M34 42 L94 93 M94 42 L34 93',null,'stroke-width="9"')+shine('M32 38 H91');
const head = (x,y,s,color='clay') => group(circ(39,38,13,color)+circ(87,38,13,color)+p('M29 58 Q25 28 64 28 Q103 28 99 58 L99 77 Q99 99 64 99 Q29 99 29 77Z',color)+circ(49,63,3,'ink')+circ(79,63,3,'ink')+p('M59 76 Q64 82 69 76','ink'),`translate(${x} ${y}) scale(${s})`);
function emit(id,category,body,w=128,h=w,phase='P0',extra={}) {
  const filename=id.slice(id.indexOf('.')+1).replaceAll('.','-');
  const src=`art/src/${category}/${filename}.svg`;
  write(src,svg(body,w,h,extra.stroke??6*w/256));
  const {stroke,...meta}=extra;
  assets.push({id,category,src,out:`public/assets/sprites/${category}/${filename}.png`,viewBox:[w,h],anchor:[.5,.5],frames:1,parts:[],tags:[category,filename],phase,...meta});
}
function animated(id,body,frames=3,fps=6,phase='P0') {
  const name=id.slice(3);
  for(let f=1;f<=frames;f++)write(`art/src/ui/${name}-f${f}.svg`,svg(body(f)));
  assets.push({id,category:'ui',src:`art/src/ui/${name}-f{f}.svg`,out:`public/assets/sprites/ui/${name}-f{f}.png`,viewBox:[128,128],anchor:[.5,.5],frames,fps,parts:['pin','pulse'],tags:['ui','coop'],phase});
}

const resourceIds=['food','wood','stone','sand','clay','iron','coal','water','oil','biogas','uranium','aetherite','glass','concrete','steel','plastic','electronics','computer','energy','science','ascension','pollution','population'];
function resource(id,mini=false) {
  const fine = d => mini ? '' : detail(d);
  switch(id) {
    case 'food': return circ(43,64,24,'clay')+circ(84,64,24,'danger')+circ(65,87,24,'clay')+p('M59 42 Q50 16 86 18 Q87 40 59 42Z','leaf')+shine('M30 57 Q31 49 40 48')+fine('M67 38 L69 29');
    case 'wood': return p('M18 53 L74 25 Q98 20 108 45 L58 78Z','iron')+ellipse(39,65,23,20,'sand')+p('M25 83 L79 55 Q102 54 111 80 L60 110Z','clay')+ellipse(43,94,22,18,'sand')+fine('M29 64 Q37 51 49 62 Q55 74 37 75 M32 93 Q45 82 53 94 Q55 104 40 104 M67 88 L93 76 M68 52 L86 43');
    case 'stone': return p('M15 91 L22 72 Q33 59 51 66 L61 89 Q63 101 47 106 H27 Q12 103 15 91Z','rock-dark')+p('M50 79 L54 38 Q57 27 77 27 L94 47 L97 83Z','rock')+p('M58 87 L78 63 Q90 57 107 71 L114 94 Q114 106 92 109 H70 Q55 104 58 87Z','rock')+shadow('M78 66 L87 91 L111 91 Q116 106 91 109 L70 109 Q58 106 59 96Z','rock')+shine('M61 41 L69 35');
    case 'sand': return p('M16 99 Q32 81 46 55 Q53 39 66 45 Q79 48 83 63 Q90 82 111 98 Q115 107 99 109 H28 Q12 108 16 99Z','sand')+shadow('M62 47 Q77 72 68 83 Q78 91 107 97 Q117 109 98 109 H27 Q75 103 62 93 Q87 77 62 47Z','sand')+star(98,29,13,'cream')+fine('M37 94 L43 94 M52 79 L56 79');
    case 'clay': return p('M23 92 Q12 71 28 51 Q38 35 61 38 Q73 26 91 42 Q98 51 101 70 Q118 97 95 104 Q64 115 32 105Z','clay')+shadow('M91 43 Q89 80 68 90 Q49 101 26 98 Q31 110 65 110 Q110 111 107 87Z','clay')+p('M40 75 Q40 49 64 49 Q90 49 82 74 Q79 87 57 86',null,'stroke-width="5"')+fine('M51 73 Q47 58 63 58 Q79 58 70 74');
    case 'iron': return p('M16 85 L28 40 L57 20 L88 27 L110 68 L99 101 L60 112 L28 104Z','iron')+shadow('M88 27 L78 72 L99 101 L110 68Z','iron')+p('M28 68 L48 63 L58 82 L78 72 L88 42',null,`stroke="${C('rock')}" stroke-width="8"`)+shine('M33 43 L54 30');
    case 'coal': return p('M17 93 L26 71 L47 59 L68 77 L60 109 L29 108Z','coal')+p('M46 63 L56 27 L82 18 L108 43 L103 78 L74 90Z','coal')+p('M52 64 L78 55 L102 78 M78 55 L82 22',null,`stroke="${C('rock-dark')}"`)+star(92,100,12,'ascension')+fine('M27 75 L45 81 L58 104');
    case 'water': return p('M64 14 C60 33 29 59 29 80 A35 35 0 0 0 99 80 C99 59 69 32 64 14Z','water')+shadow('M64 14 C73 48 96 90 65 107 Q48 113 38 101 A35 35 0 0 0 99 80 C99 59 69 32 64 14Z','water')+shine('M43 77 Q44 65 52 55');
    case 'oil': return p('M49 29 Q54 18 61 14 Q59 40 85 58 Q100 69 99 86 Q112 91 110 100 Q104 113 63 113 Q19 113 17 101 Q15 90 31 86 Q23 64 39 47Z','oil')+p('M49 48 Q32 72 42 87 Q47 91 52 86 Q40 75 57 56Z','oil-sheen','stroke="none"')+circ(99,28,9,'oil')+shine('M42 66 L45 59');
    case 'biogas': return circ(43,82,26,'toxic')+circ(85,72,28,'toxic')+circ(58,49,25,'toxic')+circ(91,24,9,'toxic')+shine('M44 44 Q48 36 56 36')+fine('M34 90 Q42 95 49 90');
    case 'uranium': return rect(27,30,29,76,9,'uranium')+ellipse(41.5,30,14.5,8,'uranium')+rect(70,18,29,77,9,'uranium')+ellipse(84.5,18,14.5,8,'uranium')+shadow('M47 38 H55 V96 Q55 106 47 106Z','uranium')+shadow('M90 27 H98 V85 Q98 95 90 95Z','uranium')+shine('M35 47 V82')+fine('M74 77 H95');
    case 'aetherite': return p('M65 16 L91 43 L81 83 L58 102 L35 77 L39 40Z','crystal')+shadow('M65 16 L62 54 L58 102 L81 83 L91 43 L62 54Z','crystal')+shine('M45 42 L57 29')+star(102,94,9,'cream')+star(25,25,7,'crystal');
    case 'glass': return p('M29 31 Q29 26 35 25 L86 16 Q96 14 96 24 V96 Q96 102 90 104 L38 114 Q29 115 29 105Z','snow')+p('M38 35 L86 26 V96 L38 104Z','water')+p('M40 81 L82 37 V52 L40 94Z','snow','stroke="none"')+shine('M39 39 L57 35')+fine('M91 24 V98');
    case 'concrete': return p('M20 44 L48 24 Q53 21 60 23 L105 39 Q111 41 111 47 V90 Q111 95 106 98 L78 112 L20 96Z','rock')+p('M20 44 L77 60 L111 43 M77 60 V112',null)+shadow('M78 61 L110 45 V92 L78 110Z','rock')+fine('M30 59 L36 62 M35 87 L43 89 M57 75 L61 79')+shine('M30 43 L48 32');
    case 'steel': return p('M16 45 Q16 41 22 39 L84 20 L112 33 V51 L98 57 V80 L111 84 V100 L49 115 L16 103 V85 L31 81 V63 L16 59Z','rock')+p('M18 45 L49 56 L111 37 M49 56 V72 L35 76 V91 L49 97 L109 84 M49 97 V113',null)+shadow('M49 73 L97 58 V79 L49 91 L35 91 V76Z','rock')+shine('M24 44 L84 27');
    case 'plastic': return p('M20 40 Q21 31 32 30 L77 24 Q85 23 91 31 L109 50 Q112 55 109 64 L96 98 Q94 105 84 106 L41 109 Q32 110 29 100 L16 65 Q12 52 20 40Z','danger')+p('M18 48 Q46 61 62 56 L101 43 M62 56 L74 106',null)+shadow('M64 58 L106 48 Q112 55 108 65 L95 100 Q94 105 75 107Z','danger')+shine('M28 42 L62 36');
    case 'electronics': return ['M28 42 H16 M28 64 H16 M28 86 H16 M100 42 H112 M100 64 H112 M100 86 H112 M42 28 V16 M64 28 V16 M86 28 V16 M42 100 V112 M64 100 V112 M86 100 V112'].map(d=>p(d,null,'stroke-width="7"')).join('')+rect(28,28,72,72,12,'leaf')+rect(45,45,38,38,7,'coal')+fine('M35 49 H40 M35 77 H40 M89 49 H94 M89 77 H94')+shine('M36 37 H64');
    case 'computer': return rect(22,19,84,72,12,'paper')+rect(33,30,61,44,8,'science')+shadow('M24 79 H104 V81 Q104 90 94 90 H34 Q24 90 24 79Z','paper')+p('M29 91 H99 L112 108 Q115 114 105 114 H23 Q13 114 17 108Z','rock')+shine('M42 40 H62')+fine('M32 104 H96')+circ(91,82,3,'ok');
    case 'energy': return bolt()+shine('M65 30 L46 63');
    case 'science': return p('M45 17 H80 V28 H75 V55 L101 94 Q110 111 91 113 H35 Q17 111 28 94 L51 55 V28 H45Z','snow')+p('M43 78 Q55 72 65 79 Q75 85 85 78 L99 99 Q103 105 93 106 H35 Q27 105 33 96Z','science')+circ(60,91,5,'cream','stroke="none"')+(!mini?circ(68,63,4,'science'):'')+shine('M46 68 L38 83');
    case 'ascension': return p('M64 14 L92 41 Q97 47 89 47 H78 V70 H50 V47 H39 Q32 47 37 41Z','ascension')+star(64,88,25,'energy')+fine('M24 79 V62 M104 79 V62')+shine('M45 39 L63 22');
    case 'pollution': return p('M26 104 Q9 103 12 86 Q13 74 26 71 Q18 49 37 42 Q35 22 55 20 Q71 17 79 34 Q99 28 106 48 Q110 62 101 70 Q121 74 115 93 Q112 108 97 108Z','rock-dark')+shadow('M38 95 Q67 98 67 79 Q93 91 101 70 Q121 74 115 93 Q112 108 97 108 L26 104 Q15 102 13 94Z','rock-dark')+fine('M40 48 Q51 39 61 51 M76 62 Q84 50 96 58')+shine('M47 30 Q56 25 62 32');
    case 'population': return head(1,6,.7,'rock')+head(45,6,.7,'sand')+head(15,37,.8,'clay');
    default: throw new Error(`Unknown resource ${id}`);
  }
}
for(const id of resourceIds.slice(0,RELEASE.resources)) {
  emit(`resource.${id}`,'resources',resource(id));
  emit(`resource.${id}.mini`,'resources',group(resource(id,true),'scale(0.5)','stroke-width="8"'),64,64,'P0',{stroke:4,tags:['resources',id,'mini']});
}

write('art/manifest/ui.json',JSON.stringify({assets},null,2)+'\n');
console.log(`UI art: ${assets.length} ids generated.`);
