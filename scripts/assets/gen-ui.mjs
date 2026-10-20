// Original PlanetForge UI art. All geometry and lettering are authored here.
// Run from any directory: node scripts/assets/gen-ui.mjs
import {C, svg, round, write} from './common.mjs';

// Release counters keep each intermediate checkpoint reproducible.
const RELEASE = {resources: 23, core: 52, logo: true, extras: 27, discoveries: 20, brand: false};
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

// Shared UI vocabulary: solid silhouettes, inset highlights, no baked-in labels.
const plus = () => p('M58 33 H70 V57 H94 V69 H70 V93 H58 V69 H34 V57 H58Z','cream');
const hammer = () => p('M67 49 L83 63 L43 109 Q38 114 33 109 L24 101 Q20 97 25 92Z','clay')+p('M44 20 Q65 12 91 29 L107 45 Q111 50 106 56 L95 68 L72 48 L61 55 L43 39Z','rock')+shine('M54 25 Q69 23 81 31');
const rocket = () => p('M42 72 Q26 75 23 105 L47 96 M85 72 Q102 77 105 105 L82 96','clay')+p('M64 13 Q32 35 43 91 Q64 101 85 91 Q96 35 64 13Z','paper')+circ(64,52,13,'science')+p('M53 99 Q48 112 64 116 Q80 112 75 99Z','energy')+shine('M54 32 L49 43');
const house = () => rect(29,55,70,54,12,'paper')+p('M18 58 L55 20 Q64 12 73 20 L110 58 Q114 64 104 65 H24 Q14 64 18 58Z','clay')+rect(53,74,23,35,8,'leaf')+shine('M34 48 L59 24');
const planet = () => circ(64,64,40,'water')+p('M30 43 Q47 33 60 44 L55 59 L37 66 L29 82 Q17 64 30 43Z','grass')+p('M86 38 Q99 49 104 62 L86 66 L80 90 L66 96 L60 80 L73 68 L70 53Z','grass')+shine('M47 34 Q55 29 64 29');
const shield = () => p('M64 18 Q86 34 106 33 L101 73 Q94 99 64 113 Q34 99 27 73 L22 33 Q42 34 64 18Z','science')+shadow('M64 20 V110 Q94 98 100 73 L105 34 Q87 34 64 20Z','science')+shine('M34 44 L38 66');
const arrow = (direction='right') => group(p('M18 55 H69 V33 Q69 27 76 32 L107 58 Q114 64 107 70 L76 96 Q69 101 69 95 V73 H18Z','cream'),direction==='left'?'translate(128 0) scale(-1 1)':'translate(0 0)');
function gear(color='paper') {
  let s='';
  for(let i=0;i<8;i++)s+=group(rect(54,14,20,27,5,color),`rotate(${i*45} 64 64)`);
  return s+circ(64,64,35,color)+circ(64,64,14,'space');
}
const link = () => group(rect(17,44,59,28,14,'science')+rect(52,57,59,28,14,'paper')+p('M48 59 L79 70',null,'stroke-width="6"'),'rotate(-25 64 64)');
const paws = () => group(paw('clay'),'translate(-2 15) scale(0.7)')+group(paw('paper'),'translate(132 109) rotate(180) scale(0.7)');
const speech = () => p('M29 25 H98 Q113 25 113 41 V76 Q113 91 98 91 H60 L33 111 V91 H29 Q15 91 15 76 V41 Q15 25 29 25Z','cream');
function rotateIcon(left=false) {
  return group(p('M97 45 Q87 17 59 19 Q28 21 21 51 Q13 90 47 105 Q81 119 102 89 L86 78 Q74 98 53 87 Q31 78 40 55 Q47 34 66 38 Q75 39 80 48 L67 51 L101 69 L112 35Z','cream'),left?'translate(128 0) scale(-1 1)':'translate(0 0)');
}
function action(id) {
  switch(id) {
    case 'build': return hammer();
    case 'demolish': return p('M34 17 H94 V42',null,'stroke-width="7"')+circ(80,81,30,'rock-dark')+shine('M61 72 Q64 63 72 61')+detail('M94 18 L70 45 L94 43');
    case 'upgrade': return p('M64 16 L109 57 H83 V81 H45 V57 H19Z','ascension')+p('M29 105 L64 83 L99 105 L99 116 L64 97 L29 116Z','energy');
    case 'assign': case 'unassign': return group(paw('paper'),'translate(-2 -2) scale(0.8)')+circ(93,93,24,id==='assign'?'ok':'danger')+p('M80 93 H106'+(id==='assign'?' M93 80 V106':''),null,`stroke="${C('cream')}" stroke-width="7"`);
    case 'info': return p('M16 31 Q42 21 64 34 Q88 21 112 31 V101 Q89 92 64 105 Q41 92 16 101Z','cream')+line('M64 34 V105')+group(star(64,64,25,'science'),'translate(13 -14) scale(0.8)')+detail('M26 46 L48 46 M26 58 L48 58 M26 70 L43 70');
    case 'close': return p('M31 19 L64 52 L97 19 L109 31 L76 64 L109 97 L97 109 L64 76 L31 109 L19 97 L52 64 L19 31Z','cream');
    case 'back': return arrow('left');
    case 'confirm': return p('M17 65 L32 50 L53 74 L97 25 L113 39 L56 105 Q53 109 49 105Z','ok');
    case 'cancel': return circ(64,64,45,'danger')+circ(64,64,29,'cream')+p('M34 29 L98 93 L93 99 L29 35Z','danger');
    case 'rotate-left': return rotateIcon(true);
    case 'rotate-right': return rotateIcon();
    case 'pause': return rect(29,22,25,84,7,'cream')+rect(74,22,25,84,7,'cream');
    case 'speed-1': case 'speed-2': case 'speed-3': {
      const count=Number(id.at(-1)),width=count===1?55:count===2?36:25,gap=7,total=count*width+(count-1)*gap,start=(128-total)/2;
      return Array.from({length:count},(_,i)=>p(`M${start+i*(width+gap)} 28 Q${start+i*(width+gap)} 23 ${start+i*(width+gap)+5} 27 L${start+i*(width+gap)+width} 60 Q${start+i*(width+gap)+width+4} 64 ${start+i*(width+gap)+width} 68 L${start+i*(width+gap)+5} 101 Q${start+i*(width+gap)} 105 ${start+i*(width+gap)} 100Z`,'cream')).join('');
    }
    case 'move': return p('M64 14 L84 36 H73 V55 H92 V44 L114 64 L92 84 V73 H73 V92 H84 L64 114 L44 92 H55 V73 H36 V84 L14 64 L36 44 V55 H55 V36 H44Z','cream');
    case 'launch': return rocket();
    case 'trade': return group(crate(),'translate(29 32) scale(0.6)')+p('M18 41 H91 V28 L112 49 L91 69 V55 H18Z','science')+p('M110 88 H37 V75 L16 96 L37 116 V102 H110Z','clay');
    case 'peace': return p('M64 113 V49',null,'stroke-width="5"')+p('M62 88 Q21 95 22 60 Q56 57 62 88Z','leaf')+p('M66 69 Q102 75 108 39 Q74 38 66 69Z','leaf')+p('M64 49 Q38 26 64 13 Q90 26 64 49Z','grass');
    case 'alliance': return group(shield(),'translate(2 7) scale(0.6)')+group(shield(),'translate(43 7) scale(0.6)')+group(link(),'translate(28 49) scale(0.6)');
    case 'war': return p('M23 17 L49 25 L92 88 L81 99 L34 41Z','rock')+p('M105 17 L79 25 L36 88 L47 99 L94 41Z','snow')+p('M24 83 L50 106 M77 105 L104 83',null,'stroke-width="10"')+p('M21 111 L34 96 M107 111 L94 96',null,'stroke-width="9"');
    case 'ultimatum': return p('M64 15 L114 103 Q117 110 108 110 H20 Q11 110 15 103Z','ascension')+group(bolt('ink'),'translate(38 36) scale(0.4)');
    case 'ping': return p('M64 115 Q26 78 26 51 A38 38 0 0 1 102 51 Q102 78 64 115Z','cream')+circ(64,51,15,'science');
    case 'chat': return speech()+[40,64,88].map(x=>circ(x,59,6,'rock-dark')).join('');
    case 'invite': return group(link(),'translate(-3 -8) scale(0.8)')+group(paw(),'translate(45 53) scale(0.6)');
    case 'sound-on': case 'sound-off': return p('M17 47 H35 L66 24 Q72 19 72 28 V101 Q72 109 66 103 L35 81 H17Z','paper')+(id==='sound-on'?p('M86 43 Q107 64 86 85 M98 29 Q128 64 98 99',null,'stroke-width="7"'):p('M88 50 L111 78 M111 50 L88 78',null,'stroke-width="8"'));
    case 'help': return circ(64,64,45,'cream')+p('M28 35 L44 48 M84 80 L101 95 M35 101 L49 84 M80 44 L94 27',null,`stroke="${C('clay')}" stroke-width="20"`)+circ(64,64,23,'science');
    default: throw new Error(`Unknown action ${id}`);
  }
}
function panel(color='cream',state='normal',w=192,h=192,r=24) {
  const disabled=state==='disabled', pressed=state==='pressed',token=disabled?'rock':color;
  const edge=6, y=pressed?9:3, bottom=h-3;
  return rect(3,9,w-6,h-12,r,token,`fill-opacity="1"`)+
    `<rect x="3" y="9" width="${w-6}" height="${h-12}" rx="${r}" fill="${C(token,-.18)}"/>`+
    rect(3,y,w-6,bottom-y-(pressed?0:edge),r,token)+
    p(`M${r+4} ${y+8} H${w-r-4}`,null,`stroke="${C(token,.18)}" stroke-width="3"`);
}
function buttonRound(state='normal') {
  const pressed=state==='pressed',token=state==='disabled'?'rock':'cream';
  return circ(64,68,52,token)+`<circle cx="64" cy="68" r="52" fill="${C(token,-.18)}"/>`+circ(64,pressed?68:62,52,token)+shine(`M30 ${pressed?44:38} Q42 ${pressed?27:21} 61 ${pressed?26:20}`);
}
function tab(id) {
  switch(id){
    case 'planet':return planet();
    case 'starmap':return p('M25 28 L92 34 L63 70 L101 99 M63 70 L27 103',null)+star(25,28,15,'energy')+circ(92,34,13,'water')+circ(63,70,9,'crystal')+circ(101,99,11,'clay')+circ(27,103,7,'snow');
    case 'build':return group(house(),'translate(-2 17) scale(0.8)')+group(hammer(),'translate(46 -3) scale(0.6)');
    case 'people':return resource('population');
    case 'diplomacy':return paws();
    case 'discoveries':return group(resource('science'),'translate(0 7) scale(0.9)')+star(94,30,18,'crystal');
    case 'coop':return group(link(),'translate(0 -14)')+group(paw('paper'),'translate(-6 48) scale(0.6)')+group(paw('clay'),'translate(62 48) scale(0.6)');
    case 'settings':return gear();
    default:throw new Error(`Unknown tab ${id}`);
  }
}
const badgeIds=['no-energy','no-workers','storage-full','depleted','polluted','hungry','producing','upgrade-ready','attack'];
function badge(id) {
  const fill=['producing','upgrade-ready'].includes(id)?'grass':id==='attack'?'danger':'paper';
  const symbol=id==='no-energy'?bolt():id==='no-workers'?paw():id==='storage-full'?crate():id==='depleted'?p('M21 36 L50 27 L65 44 L52 66 L72 80 L60 107 L25 101Z','rock')+p('M84 28 L107 37 L108 96 L83 107 L92 78 L72 63Z','rock'):id==='polluted'?resource('pollution'):id==='hungry'?resource('food'):id==='producing'?gear():id==='upgrade-ready'?action('upgrade'):action('war');
  return circ(32,32,28,fill)+group(symbol,'translate(13 13) scale(0.3)','stroke-width="5"')+(['no-energy','no-workers','hungry'].includes(id)?p('M14 50 L50 14',null,`stroke="${C('danger')}" stroke-width="5"`):'')+(id==='storage-full'?p('M12 11 H52',null,'stroke-width="4"'):'');
}

const core=[];
const nine={anchor:null,sliceInsets:[48,48,48,48]};
const addCore=(...args)=>core.push(()=>emit(...args));
addCore('ui.panel','ui',panel(),192,192,'P0',nine);
for(const [name,color] of [['primary','ascension'],['secondary','cream'],['danger','danger'],['ok','ok']])
  for(const state of ['normal','pressed','disabled'])addCore(`ui.button-${name}${state==='normal'?'':'-'+state}`,'ui',panel(color,state),192,192,'P0',{...nine,tags:['ui','button',state]});
for(const state of ['normal','pressed','disabled'])addCore(`ui.button-round${state==='normal'?'':'-'+state}`,'ui',buttonRound(state));
for(const name of ['planet','starmap','build','people','diplomacy','discoveries','coop','settings'])addCore(`ui.tab-${name}`,'ui',tab(name));
const coreActions=['build','demolish','upgrade','assign','unassign','info','close','back','confirm','cancel','rotate-left','rotate-right','pause','speed-1','speed-2','speed-3'];
for(const id of coreActions)addCore(`ui.icon-${id}`,'ui',action(id));
for(const id of badgeIds)addCore(`ui.badge-${id}`,'ui',badge(id),64);
addCore('ui.cursor-player','ui',group(paw('tint-white'),'translate(-1 -1) scale(0.5)')+p('M16 33 L17 56 L26 48 L33 47Z','tint-white'),64,64,'P0',{tintable:true,anchor:[.25,.875]});
core.push(()=>animated('ui.ping-marker',f=>`<g id="pulse" opacity="${[1,.7,.3][f-1]}">${ellipse(64,103,[16,30,46][f-1],[5,9,13][f-1],'tint-white')}</g><g id="pin">${group(action('ping'),`translate(20 ${[-5,1,-2][f-1]}) scale(0.7)`)}</g>`));
addCore('ui.segment-selector','ui',p('M40 81 V41 Q40 25 56 25 H200 Q216 25 216 41 V81',null,'stroke-width="22"')+p('M40 81 V41 Q40 25 56 25 H200 Q216 25 216 41 V81',null,`stroke="${C('cream')}" stroke-width="10"`)+p('M88 99 H168 L128 145Z','ascension'),256,256,'P0',{anchor:[.5,.6]});
for(const generate of core.slice(0,RELEASE.core))generate();

// Bespoke skeletons, not a font: the mixed-case wordmark is drawn twice for a
// chunky ink contour and a warm inner stroke. Glyph advances are hand tuned.
const letters={
  P:['M6 86 V6 H28 Q52 6 52 29 Q52 51 28 51 H6',66],
  l:['M12 5 V73 Q12 86 24 86',35],
  a:['M43 49 Q34 34 17 44 Q3 52 7 72 Q10 88 27 86 Q43 84 43 67 V44 M43 67 V85',57],
  n:['M7 85 V44 M7 58 Q12 40 27 42 Q45 42 45 61 V85',59],
  e:['M7 64 H46 Q46 42 27 42 Q7 41 7 64 Q7 87 29 87 Q40 87 47 80',59],
  t:['M19 20 V72 Q19 88 36 85 M6 43 H36',49],
  F:['M7 86 V6 H49 M7 44 H41',61],
  o:['M46 64 Q46 42 27 42 Q7 42 7 64 Q7 86 27 86 Q46 86 46 64Z',59],
  r:['M7 85 V44 M7 59 Q14 40 33 43',46],
  g:['M44 47 Q31 36 17 45 Q4 52 8 70 Q12 86 27 83 Q44 81 44 62 V43 V96 Q44 116 13 107',59]
};
function wordmark(){
  let x=0,shapes='';
  for(const [i,ch] of [...'PlanetForge'].entries()){
    const [d,advance]=letters[ch];
    shapes+=group(p(d,null,`stroke="${C('ink')}" stroke-width="27"`)+p(d,null,`stroke="${C(i<6?'cream':'ascension')}" stroke-width="15"`),`translate(${x} 0)`);x+=advance;
  }
  return shapes;
}
function logoMark(){
  return circ(64,71,43,'water')+shadow('M97 42 Q111 86 75 106 Q54 116 37 103 Q73 125 102 96 Q122 67 97 42Z','water')+
    p('M24 63 Q28 36 54 30 Q73 24 94 40 L88 52 L71 48 L55 57 L36 52Z','grass')+
    p('M36 68 H88 Q94 68 92 73 L85 82 L70 83 V91 H83 V99 H42 V91 H54 V83 L42 81 L32 73 Q28 68 36 68Z','rock')+
    group(hammer(),'translate(9 -3) scale(0.6)','stroke-width="5"')+star(100,22,13,'energy')+
    shine('M34 60 Q37 48 45 43');
}
if(RELEASE.logo){
  emit('brand.logo-mark','brand',group(logoMark(),'scale(4)','stroke-width="3"'),512);
  emit('brand.logo','brand',group(logoMark(),'translate(6 70) scale(3)','stroke-width="4"')+group(wordmark(),'translate(405 204)'),1024,512);
}

const extras=[];
const addExtra=(...args)=>extras.push(()=>emit(...args));
for(const [name,color] of [['panel-dark','space'],['panel-tooltip','cream'],['card','cream'],['bar-bg','paper'],['toast','cream']])
  addExtra(`ui.${name}`,'ui',panel(color),192,192,'P1',nine);
addExtra('ui.tooltip-pointer','ui',p('M10 12 H54 L35 48 Q32 53 29 48Z','paper')+p('M10 12 H54 L34 42 Q32 45 30 42Z','cream'),64,64,'P1',{anchor:[.5,0]});
addExtra('ui.progress-bg','ui',rect(2,2,124,28,14,'paper')+rect(7,7,114,18,9,'rock-dark'),128,32,'P1',{anchor:null,sliceInsets:[14,12,14,12]});
addExtra('ui.progress-fill','ui',rect(2,3,124,26,13,'grass')+shadow('M3 18 H125 Q125 29 113 29 H15 Q3 29 3 18Z','grass')+shine('M15 9 H111'),128,32,'P1',{anchor:null,sliceInsets:[14,12,14,12],parts:[],tags:['ui','progress','engine-clipped']});
addExtra('ui.ring-progress','ui',`<g id="track">${circ(64,64,49,'paper')}${circ(64,64,36,'space')}</g><g id="progress-anchor"/>`,128,128,'P1',{parts:['track','progress-anchor'],progress:{center:[64,64],radius:42.5,startAngle:-90,clockwise:true,strokeWidth:10}});
for(const id of ['move','launch','trade','peace','alliance','war','ultimatum','ping','chat','invite','sound-on','sound-off','help'])addExtra(`ui.icon-${id}`,'ui',action(id),128,128,'P1');
addExtra('ui.avatar-frame','ui',p('M64 12 A52 52 0 1 1 63.9 12Z M64 24 A40 40 0 1 0 64.1 24Z','tint-white','fill-rule="evenodd"'),128,128,'P1',{tintable:true});
addExtra('ui.crown-host','ui',p('M9 20 L22 29 L32 11 L42 29 L55 20 L49 49 H15Z','energy')+rect(15,45,34,9,3,'ascension')+circ(9,18,4,'cream')+circ(32,10,4,'cream')+circ(55,18,4,'cream'),64,64,'P1');
for(const state of ['normal','locked','available']){
  const token=state==='locked'?'rock':state==='available'?'crystal':'cream';
  const outline='M55 12 Q64 7 73 12 L106 31 Q114 36 114 46 V83 Q114 92 106 97 L73 116 Q64 121 55 116 L22 97 Q14 92 14 83 V46 Q14 36 22 31Z';
  const background=p(outline,token)+p('M55 22 Q64 17 73 22 L98 37 Q104 40 104 47 V82 Q104 86 98 90 L73 105 Q64 110 55 105 L30 90 Q24 86 24 82 V47 Q24 40 30 37Z',state==='locked'?'rock-dark':'cream',`stroke="${C(state==='locked'?'rock-dark':'crystal')}" stroke-width="4"`);
  const deco=state==='locked'?group(rect(39,58,50,40,8,'rock')+p('M48 58 V45 A16 16 0 0 1 80 45 V58',null,'stroke-width="7"')+circ(64,75,5,'ink'),'translate(16 16) scale(0.7)'):state==='available'?star(101,24,13,'energy')+star(25,100,9,'crystal'):'';
  addExtra(`ui.discovery-badge${state==='normal'?'':'-'+state}`,'ui',background+deco,128,128,'P1');
}
for(const generate of extras.slice(0,RELEASE.extras))generate();

const discoveryIds=['diplomacy','ecology','space-mining','pure-science','deep-drilling','efficient-housing','green-thumb','rocketry','long-range-sight','trade-routes','recycling','fortification','crystal-lore','atomic-power','automation','cartography','medicine','festival','weather-control','terraforming','survival-kits','storage-tech','energy-grid','swift-feet'];
const sprout = () => p('M64 109 V54',null,'stroke-width="5"')+p('M64 70 Q26 72 20 39 Q56 35 64 70Z','leaf')+p('M64 53 Q65 19 103 21 Q101 55 64 53Z','grass');
const heart = () => p('M64 105 Q16 74 19 46 Q22 19 47 27 Q58 30 64 42 Q72 23 91 27 Q114 31 109 54 Q105 78 64 105Z','danger');
function discovery(id){
  switch(id){
    case 'diplomacy':return paws();
    case 'ecology':return group(leaf(),'translate(-10 -5) scale(0.9)')+group(resource('water'),'translate(55 47) scale(0.6)');
    case 'space-mining':return p('M58 37 L91 26 L112 51 L101 91 L70 112 L43 95 L37 66Z','rock')+group(p('M32 102 L82 27',null,'stroke-width="13"')+p('M22 49 Q38 12 78 19 Q100 23 110 43 Q65 27 22 49Z','science'),'translate(-9 -4)');
    case 'pure-science':return group(resource('science'),'translate(-6 6) scale(0.9)')+star(93,32,23,'energy');
    case 'deep-drilling':return rect(43,15,43,23,7,'clay')+p('M48 38 H81 L79 93 L64 114 L49 93Z','rock')+p('M48 49 L81 41 M48 66 L80 58 M49 83 L79 75 M54 100 L77 92',null,'stroke-width="6"')+shine('M52 23 H72');
    case 'efficient-housing':return group(house(),'translate(-6 4) scale(0.9)')+circ(95,91,24,'ok')+group(plus(),'translate(65 61) scale(0.5)');
    case 'green-thumb':return p('M19 100 L17 79 Q18 71 26 75 L38 83 H65 L82 71 Q93 63 98 71 Q107 69 111 77 Q115 83 106 90 L82 107 Q74 112 62 111 L40 108 L31 115Z','clay')+group(sprout(),'translate(28 -2) scale(0.6)');
    case 'rocketry':return ellipse(64,76,53,22,'space','fill-opacity="0"')+group(rocket(),'translate(14 -3) scale(0.8)')+p('M16 89 Q29 100 56 100',null,`stroke="${C('science')}" stroke-width="5"`)+star(106,24,8,'energy');
    case 'long-range-sight':return p('M56 78 L37 112 M64 77 L81 113',null,'stroke-width="8"')+p('M26 54 L88 19 L108 50 L47 87Z','science')+ellipse(98,35,12,18,'snow','transform="rotate(-32 98 35)"')+p('M22 60 L32 76 L18 85 L10 72Z','rock')+shine('M43 53 L76 34');
    case 'trade-routes':return action('trade');
    case 'recycling':return group(crate(),'translate(31 31) scale(0.5)')+p('M25 58 Q24 26 56 21 L56 13 L78 29 L57 43 V34 Q37 38 38 58Z','leaf')+p('M80 33 Q111 47 106 76 L115 78 L95 95 L80 72 L90 74 Q94 56 77 47Z','leaf')+p('M86 101 Q62 121 36 103 L30 111 L26 85 L51 88 L44 95 Q61 106 78 91Z','leaf');
    case 'fortification':return p('M16 106 V31 H34 V46 H48 V31 H65 V46 H79 V31 H96 V106Z','rock')+detail('M17 71 H62 M37 71 V91 M17 91 H62')+group(shield(),'translate(53 42) scale(0.6)');
    case 'crystal-lore':return resource('aetherite')+star(22,91,13,'energy');
    case 'atomic-power':return [0,60,120].map(n=>ellipse(64,64,49,19,'uranium',`fill-opacity="0" transform="rotate(${n} 64 64)"`)).join('')+circ(64,64,12,'uranium')+circ(113,64,6,'cream')+circ(40,22,6,'uranium')+circ(40,106,6,'uranium');
    case 'automation':return group(gear(),'translate(-2 49) scale(0.6)')+p('M61 95 L79 72 L65 51 L80 26',null,'stroke-width="14"')+circ(79,72,10,'clay')+circ(65,51,10,'rock')+p('M71 24 L75 13 L88 21 L100 18 L108 31 L94 41',null,'stroke-width="8"');
    case 'cartography':return p('M15 31 L46 17 L81 32 L113 18 V98 L81 112 L46 98 L15 113Z','paper')+p('M46 17 V98 M81 32 V112',null)+p('M26 80 Q31 46 57 57 Q75 69 97 45',null,`stroke="${C('clay')}" stroke-width="5" stroke-dasharray="3 10"`)+star(96,44,10,'science');
    case 'medicine':return group(rect(18,44,94,38,13,'paper')+rect(48,44,35,38,5,'clay')+[31,98].map(x=>circ(x,63,3,'rock-dark')).join(''),'rotate(-35 64 64)')+group(heart(),'translate(61 -4) scale(0.5)');
    case 'festival':return p('M15 35 Q64 69 113 35',null,'stroke-width="5"')+p('M17 38 L45 49 L25 77Z','clay')+p('M48 51 H77 L64 83Z','energy')+p('M81 49 L110 38 L101 77Z','science')+star(28,100,10,'crystal')+star(93,100,10,'ascension');
    case 'weather-control':return [0,45,90,135].map(n=>group(p('M68 13 V22 M68 79 V88',null,`stroke="${C('ascension')}" stroke-width="6"`),`rotate(${n} 68 50)`)).join('')+circ(68,50,25,'energy')+p('M25 105 Q9 103 15 87 Q16 78 30 76 Q31 56 52 58 Q67 57 73 73 Q96 63 104 83 Q119 85 114 99 Q110 109 95 107Z','snow');
    case 'terraforming':return group(planet(),'translate(-4 27) scale(0.8)')+group(sprout(),'translate(49 -3) scale(0.6)');
    case 'survival-kits':return p('M64 16 Q94 20 101 55 L107 94 Q109 110 94 112 H35 Q20 110 22 94 L28 55 Q34 20 64 16Z','paper')+rect(39,37,50,40,16,'science')+p('M44 92 H84',null,'stroke-width="8"')+shine('M48 48 L60 44')+p('M22 94 L14 107 M106 94 L114 107',null,'stroke-width="7"');
    case 'storage-tech':return group(crate(),'translate(-2 57) scale(0.6)')+group(crate(),'translate(58 57) scale(0.6)')+group(crate(),'translate(28 1) scale(0.6)');
    case 'energy-grid':return p('M26 24 L104 64 L26 104Z',null,'stroke-width="5"')+circ(26,24,14,'science')+circ(104,64,14,'science')+circ(26,104,14,'science')+group(bolt(),'translate(26 20) scale(0.7)');
    case 'swift-feet':return p('M61 67 Q78 32 115 24 L100 53 L83 63 L107 54 Q98 81 80 83 L95 81 Q89 99 65 94Z','snow')+group(paw('clay'),'translate(-4 21) scale(0.8)')+detail('M95 42 L77 62');
    default:throw new Error(`Unknown discovery ${id}`);
  }
}
for(const id of discoveryIds.slice(0,RELEASE.discoveries))emit(`discovery.${id}`,'discoveries',group(discovery(id),'translate(13 13) scale(0.8)','stroke-width="3.8"'),128,128,'P1',{tags:['discoveries',id,'overlay-on-ui.discovery-badge']});

write('art/manifest/ui.json',JSON.stringify({assets},null,2)+'\n');
console.log(`UI art: ${assets.length} ids generated.`);

