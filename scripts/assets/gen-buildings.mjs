import { C, svg, round, write } from './common.mjs';

// Original toy architecture. Every material/state is resolved through the palette.
// Geometry stays identical in the off state; no SVG filters are needed.
let state = 'idle';
const paint = (token, tone = 0) => C(state === 'off' && !['ink', 'coal', 'rock', 'rock-dark', 'snow'].includes(token)
  ? (['cream', 'paper', 'sand'].includes(token) ? 'rock' : 'rock-dark') : token, tone);
const fill = (token, tone = 0) => `fill="${paint(token, tone)}"`;
const path = (d, token = 'none', extra = '') => `<path d="${d}" ${token === 'none' ? 'fill="none"' : fill(token)} ${extra}/>`;
const rect = (x,y,w,h,token,r=8,extra='') => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" ${fill(token)} ${extra}/>`;
const circle = (x,y,r,token,extra='') => `<circle cx="${x}" cy="${y}" r="${r}" ${fill(token)} ${extra}/>`;
const ellipse = (x,y,rx,ry,token,extra='') => `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" ${fill(token)} ${extra}/>`;
const group = (id, body, extra='') => `<g id="${id}" ${extra}>${body}</g>`;
const line = (d, token='ink', width=3) => path(d,'none',`stroke="${paint(token)}" stroke-width="${width}"`);
const lit = () => state === 'idle' ? 'energy' : 'coal';
const glint = d => line(d,'cream',4);
const base = () => rect(31,225,194,12,'rock',6)+path('M42 233H214','none',`stroke="${paint('rock-dark')}" stroke-width="5"`);
const windowPane = (x,y,w=24,h=28) => rect(x,y,w,h,lit(),8)+line(`M${x+w/2} ${y+3}V${y+h-3}`,'clay');
const door = (x=112,y=185,w=32,h=40) => rect(x,y,w,h,'iron',12)+circle(x+w-9,y+h/2,2,'cream','stroke="none"');
const foot = body => body+base();
const post = (x,y,h,token='iron') => rect(x,y,12,h,token,6);
const anchor = (id,x,y) => group(id,'',`transform="translate(${x} ${y})"`);
const leaf = (x,y,s=1) => `<g transform="translate(${x} ${y}) scale(${s})">${path('M0 0Q-22 -30 4 -34Q22 -16 0 0Z','leaf')}${line('M0 -4L4 -25','moss')}</g>`;
const roof = (y,token='clay') => path(`M36 ${y+30}Q28 ${y+24} 40 ${y+14}L108 ${y-28}Q128 ${y-42} 148 ${y-28}L216 ${y+14}Q228 ${y+24} 220 ${y+30}Q128 ${y+46} 36 ${y+30}Z`,token)+glint(`M53 ${y+15}L112 ${y-20}`);
const crate = (x,y,s=34) => rect(x,y,s,s,'sand',7)+line(`M${x+6} ${y+6}L${x+s-6} ${y+s-6}M${x+s-6} ${y+6}L${x+6} ${y+s-6}`,'iron',4);

function housing(tier){
  if(tier===2)return foot(rect(167,63,25,61,'rock',8)+rect(162,57,35,13,'rock-dark',6)+anchor('chimney-smoke-anchor',180,57)+
    rect(53,122,150,104,'iron',17)+line('M62 146H194M62 168H194M62 190H194M62 211H194','clay',4)+
    line('M72 125V220M185 125V220','iron',9)+roof(100,'iron')+
    line('M70 106L81 115L92 105M101 91L112 101L123 91M133 90L144 101L155 92M165 107L176 116L187 108','clay',4)+
    group('windows',windowPane(84,153,28,31)+windowPane(146,153,28,31))+
    rect(106,190,45,36,'paper',8)+door(114,194,29,31)+glint('M62 140V159'));
  if(tier===3){
    return foot(rect(168,37,27,68,'iron',8)+rect(162,31,39,14,'clay',6)+anchor('chimney-smoke-anchor',181,31)+
      rect(51,102,154,124,'rock',18)+path('M187 114V205Q187 216 174 216H66','none',`stroke="${paint('rock-dark')}" stroke-width="10"`)+
      roof(77,'clay')+rect(49,155,158,11,'paper',5)+
      line('M58 137H70M183 137H198M58 186H69M184 186H199M65 212H82M175 212H190','paper',4)+
      rect(58,146,13,7,'clay',2,'stroke="none"')+rect(182,171,15,8,'clay',2,'stroke="none"')+
      group('windows',[118,179].map(y=>windowPane(76,y,27,28)+windowPane(153,y,27,28)).join(''))+
      door(113,181,30,44)+glint('M59 111V123'));
  }
  if(tier===4){
    return foot(post(166,25,30,'rock')+anchor('chimney-smoke-anchor',172,25)+line('M97 39V18M88 24H105','rock-dark',4)+
      rect(62,37,132,189,'paper',24)+path('M179 53V207Q179 215 168 215','none',`stroke="${paint('paper',-.18)}" stroke-width="10"`)+
      rect(58,35,140,16,'clay',8)+[89,131,173].map(y=>rect(58,y,140,9,'clay',4)).join('')+
      group('windows',[58,100,142].flatMap(y=>[78,118,158].map(x=>windowPane(x,y,20,23))).join('')+
        windowPane(78,188,20,23)+windowPane(158,188,20,23))+
      door(113,188,30,37)+glint('M69 59V78'));
  }
  const chimney=tier===2?rect(170,55,25,77,'iron',9)+rect(164,49,37,15,'clay',7):'';
  return foot(chimney+anchor('chimney-smoke-anchor',182,tier===2?49:88)+rect(52,129,152,100,tier===1?'paper':'clay',34)+
    path('M190 148V199Q190 219 165 219H77','none',`stroke="${paint(tier===1?'paper':'clay',-.18)}" stroke-width="10"`)+
    roof(tier===1?111:97,tier===1?'leaf':'clay')+(tier===1?line('M89 97L78 132M127 87V132M163 99L177 131','grass',5):rect(108,92,40,34,'paper',10))+
    group('windows',windowPane(68,158)+windowPane(165,158)+(tier===2?windowPane(117,101,22,20):''))+door(110,179,36,47));
}

function mine(tier){
  const frame=tier===1?'iron':'rock';
  return foot(path('M34 224Q31 152 59 117Q90 77 137 95Q196 91 220 170L224 225Z','rock')+
    path('M143 107Q201 119 208 209H191','none',`stroke="${paint('rock-dark')}" stroke-width="14"`)+
    path('M65 221V165Q65 128 105 128Q144 128 144 165V221Z','coal')+
    post(58,140,83,frame)+post(139,140,83,frame)+rect(52,130,105,20,frame,7)+
    glint('M64 135H133')+line('M61 221L49 233M143 221L151 233','rock-dark',5)+
    (tier===2?post(171,85,56,'rock')+post(202,85,56,'rock')+
      path('M161 62H222L213 92H172Z','rock')+path('M168 61L180 47L194 55L208 43L217 61Z','iron')+
      glint('M169 68H201')+rect(155,164,59,19,'rock-dark',9)+[165,184,203].map(x=>circle(x,173,4,'cream')).join('')+path('M163 160L170 143L183 153L197 141L207 161Z','iron'):'')+
    group('cart',path('M76 177L135 177L127 207H85Z','clay')+path('M82 176L94 158L108 170L121 156L132 177Z','iron')+
      group('wheel',circle(91,211,8,'rock-dark')+circle(122,211,8,'rock-dark'))));
}

function pump(tier){
  if(tier===1)return foot(ellipse(127,215,55,12,'water')+rect(111,130,29,86,'science',12)+
    path('M113 157H88Q76 157 76 170V184','none',`stroke="${paint('ink')}" stroke-width="18"`)+
    path('M113 157H88Q76 157 76 170V184','none',`stroke="${paint('science')}" stroke-width="10"`)+
    group('pump-arm',path('M125 133V100Q125 91 138 91H183','none',`stroke="${paint('ink')}" stroke-width="16"`)+
      path('M125 133V100Q125 91 138 91H183','none',`stroke="${paint('iron')}" stroke-width="9"`)+circle(126,133,9,'sand'))+
    glint('M118 172V197')+path('M76 190Q62 205 76 209Q90 205 76 190Z','water'));
  return foot(path('M80 225L114 99H146L180 225H156L130 143L104 225Z','science')+
    line('M103 183H156M111 156H146','deep-water',5)+post(193,101,123,'rock')+
    group('pump-arm',path('M65 78Q118 65 177 83L205 74L215 112L195 121L181 101Q116 86 68 101Z','clay')+
      circle(130,90,13,'sand')+glint('M80 83Q105 77 116 79'))+rect(56,199,46,25,'iron',10)+circle(78,211,7,'rock-dark'));
}

function sprout(x,y){return leaf(x,y,.6)+leaf(x+8,y,.5)+circle(x-5,y-10,6,'danger')+circle(x+6,y-8,6,'clay');}
function farm(tier){
  const rows=[185,211].map(y=>rect(40,y,176,15,'iron',7)+[62,105,148,191].map(x=>sprout(x,y)).join('')).join('');
  if(tier===1)return foot(rect(151,120,54,58,'paper',9)+path('M140 123L176 87L216 122Z','clay')+door(170,141,20,34)+rows);
  return foot(path('M39 222V125Q39 64 128 64Q217 64 217 125V222Z','science')+
    path('M191 97Q209 121 209 211H199','none',`stroke="${paint('deep-water')}" stroke-width="9"`)+rows+
    path('M42 127H213M128 67V220M84 73Q72 103 73 149M172 73Q184 104 184 149','none',`stroke="${paint('cream')}" stroke-width="7"`)+
    glint('M51 122Q49 89 76 84')+rect(108,153,41,71,'snow',10)+line('M128 164V213','science',4));
}

function foundry(tier){
  const y=tier===1?82:51;
  return foot(rect(158,y,37,130,'iron',9)+rect(150,y-8,53,19,'clay',7)+anchor('smoke-anchor',177,y-8)+
    (tier===2?rect(57,100,34,119,'rock',9)+rect(51,93,46,17,'rock-dark',7):'')+
    rect(51,147,154,78,'clay',22)+path('M186 157V202Q186 215 173 215H72','none',`stroke="${paint('iron')}" stroke-width="10"`)+
    line('M64 171H88M174 176H194M161 112H190M161 133H190','iron',4)+
    path('M88 223V193Q88 164 126 164Q164 164 164 193V223Z','coal')+
    group('glow',path('M101 220Q96 202 111 190L123 201Q138 175 142 190Q160 214 149 220Z',state==='idle'?'ascension':'coal')+
      path('M117 220Q110 210 127 201Q142 216 134 220Z',lit()))+
    rect(87,219,79,8,'rock-dark',4)+glint(`M165 ${y+20}V${y+43}`));
}

function lab(tier){
  const y=tier===1?133:114;
  return foot(rect(53,y,150,94,'paper',28)+path(`M190 ${y+18}V204Q190 217 171 217H78`,'none',`stroke="${paint('paper',-.18)}" stroke-width="10"`)+
    group('dome',path(`M46 ${y}Q47 ${y-67} 128 ${y-67}Q207 ${y-67} 210 ${y}Z`,'science')+
      path(`M128 ${y-66}Q163 ${y-42} 159 ${y}`,'none',`stroke="${paint('deep-water')}" stroke-width="8"`)+
      glint(`M61 ${y-16}Q66 ${y-43} 94 ${y-49}`)+rect(42,y-1,172,15,'rock',7))+
    line(`M171 ${y-48}L193 ${y-84}`,'rock-dark',6)+group('antenna-light',circle(195,y-87,10,state==='idle'?'danger':'coal'))+
    (tier===2?path('M61 153Q26 146 39 117L75 139Z','cream')+line('M59 154V180','rock-dark',7)+circle(41,125,5,'crystal'):'')+
    windowPane(73,174,30,28)+windowPane(153,174,30,28)+door(113,184,30,41));
}

function launchpad(){return foot(post(42,54,169,'rock')+post(85,54,169,'rock')+
  line('M54 72L85 107L54 142L85 177L54 211M54 107H85M54 177H85','rock-dark',6)+
  rect(35,46,68,20,'clay',8)+rect(91,95,60,16,'rock',7)+
  rect(107,195,93,22,'rock-dark',10)+rect(95,211,117,14,'paper',7)+
  [114,142,170,198].map(x=>rect(x,216,8,7,'ascension',3,'stroke="none"')).join('')+glint('M40 51H86'));}

function rocket(tier,variant,big=false){
  const fins=big?path('M91 123Q48 151 41 224Q60 222 86 203Z','crystal')+path('M165 123Q208 151 215 224Q196 222 170 203Z','crystal'):
    path('M91 157Q62 171 59 231L92 212Z','clay')+path('M165 157Q194 171 197 231L164 212Z','clay');
  return fins+path('M102 205H154L161 236Q128 238 95 236Z','rock-dark')+
    path(`M88 201V${big?91:106}Q88 59 128 ${big?18:34}Q168 59 168 ${big?91:106}V201Q128 220 88 201Z`,'cream')+
    path(`M128 ${big?18:34}Q151 40 161 ${big?67:80}Q128 95 95 ${big?67:80}Q105 44 128 ${big?18:34}Z`,big?'crystal':'clay')+
    path('M157 104V192Q153 201 142 203','none',`stroke="${paint('paper')}" stroke-width="11"`)+
    circle(128,121,24,'rock-dark')+circle(128,121,17,'science')+glint('M117 120Q117 111 127 111')+
    (big?path('M128 159L144 180L128 210L112 180Z','crystal'):rect(115,178,26,24,'clay',9))+
    glint('M99 147V174')+anchor('flame-anchor',128,240);
}

function coalPlant(){
  const tower=(x,y)=>path(`M${x} 199Q${x+16} ${y+42} ${x+5} ${y}H${x+53}Q${x+41} ${y+42} ${x+58} 199Z`,'rock')+
    ellipse(x+29,y,24,8,'rock-dark')+glint(`M${x+15} ${y+17}L${x+12} ${y+45}`);
  return foot(tower(47,70)+tower(139,89)+anchor('smoke-anchor',76,62)+rect(45,183,166,43,'clay',16)+
    rect(62,198,47,21,'coal',7)+[122,148,174].map(x=>windowPane(x,197,17,20)).join(''));
}

function rotor(cx,cy,r,token){
  return [0,120,240].map(a=>`<g transform="rotate(${a} ${cx} ${cy})">${path(`M${cx-6} ${cy-6}Q${cx-23} ${cy-r+12} ${cx-10} ${cy-r}Q${cx+3} ${cy-r-7} ${cx+7} ${cy-r+14}L${cx+7} ${cy-8}Z`,token)}${glint(`M${cx-8} ${cy-r+16}V${cy-r+33}`)}</g>`).join('');
}
function wind(){return foot(path('M112 226L120 95H136L144 226Z','paper')+
  group('blades',rotor(128,99,76,'snow'))+circle(128,99,15,'science')+circle(123,95,5,'cream','stroke="none"'));}
function solar(){return foot(post(88,158,66,'rock-dark')+post(161,158,66,'rock-dark')+
  path('M50 90Q51 83 61 83H198Q206 83 208 93L221 174Q221 184 210 184H47Q35 184 36 174Z','deep-water')+
  path('M58 97H194L205 169H50Z','science')+
  line('M88 97L84 169M122 97V169M157 97L163 169M57 121H198M53 145H201','deep-water',5)+
  glint('M64 105L75 105M98 105H110M135 105H146'));
}
function airFilter(){return foot(rect(73,69,110,155,'paper',30)+rect(84,60,88,20,'leaf',9)+
  circle(128,129,47,'rock-dark')+circle(128,129,39,'science')+group('fan',rotor(128,129,32,'cream'))+
  circle(128,129,9,'sand')+leaf(126,211,.7)+line('M146 188H164M146 202H164','rock-dark',4)+glint('M83 179V199'));}

function hydroFarm(){return foot(rect(52,61,152,164,'science',23)+
  path('M189 78V201Q189 212 174 212','none',`stroke="${paint('deep-water')}" stroke-width="9"`)+
  [114,162,211].map(y=>rect(64,y,128,9,'paper',4)+[88,126,164].map(x=>leaf(x,y-4,.6)+leaf(x+8,y-4,.5)+rect(x-12,y-12,30,10,'clay',4)).join('')).join('')+
  group('glow',[80,129,178].map(y=>rect(70,y,116,6,state==='idle'?'energy':'coal',3,'stroke="none"')).join(''))+
  rect(47,53,162,17,'leaf',8)+glint('M59 78V102'));}

function storage(tier){
  const y=tier===1?125:93;
  return foot((tier===2?rect(164,45,38,169,'rock',14)+ellipse(183,45,19,9,'paper'):'')+
    rect(48,y,156,102,'clay',16)+roof(y-20,'iron')+
    rect(92,y+30,72,96-(y===125?24:0),'sand',10)+
    line(`M128 ${y+35}V222M100 ${y+38}L156 216M156 ${y+38}L100 216`,'iron',5)+
    crate(45,190)+crate(172,190)+(tier===2?crate(180,161,27):'')+glint(`M57 ${y+28}V${y+48}`));
}

function market(){return foot(post(49,117,109)+post(196,117,109)+
  group('flag',line('M179 91V40','rock-dark',5)+path('M181 43Q205 32 220 48L208 62L219 76Q201 65 181 77Z','crystal'))+
  path('M43 87H208L225 139H29Z','cream')+
  [49,105,161].map(x=>path(`M${x} 88H${x+24}L${x+27} 137H${x-7}Z`,'clay','stroke="none"')).join('')+
  path('M30 137H225V145Q210 162 195 145Q180 162 164 145Q148 162 132 145Q115 162 99 145Q82 162 65 145Q47 161 30 145Z','cream')+
  [74,117,160].map(x=>sprout(x,192)).join('')+rect(37,195,180,30,'sand',9)+line('M61 208H100M154 208H195','iron',3));}

function watchtower(){return foot(path('M71 225L90 116H165L184 225H160L144 141H111L94 225Z','iron')+
  line('M101 171L157 208M153 171L99 208','sand',6)+rect(64,95,128,51,'paper',12)+
  [83,117,151].map(x=>rect(x,110,22,25,'coal',7)).join('')+roof(76,'leaf')+
  group('banner',path('M142 145H177V188L160 201L142 188Z','danger')+circle(160,163,7,'sand'))+glint('M79 102H113'));}

function ruin(){return foot(path('M39 225L48 190L78 177L100 195L129 171L164 184L176 167L208 186L221 225Z','rock-dark')+
  path('M64 198V126Q65 118 75 119L103 123V155L117 165L111 205Z','paper')+
  path('M154 213L151 152L170 142L182 161L194 156L201 207Z','clay')+
  path('M81 225L97 198L123 202L132 225Z','rock')+path('M140 224L158 202L179 210L185 225Z','paper')+
  line('M79 134L87 153L78 174M172 163L165 182L181 190','rock-dark',4)+leaf(55,219,.5));}

function escapePod(tier,variant){
  const open=variant==='open';
  return foot(path('M55 219L46 204L59 190M192 202L210 190L220 222Z','rock-dark')+
    `<g transform="rotate(-12 128 181)">${rect(65,103,126,120,'paper',45)}${path('M76 116Q128 77 180 116L183 137H73Z','clay')}`+
    (open?rect(91,139,74,68,'coal',24)+crate(107,170,39)+path('M175 134Q221 125 224 164Q217 190 183 199Z','science')+glint('M191 143Q206 140 212 151'):
      rect(91,139,74,68,'rock',24)+circle(128,166,19,'science')+glint('M119 164Q120 156 128 156'))+
    `${line('M82 208H96M163 208H176','rock-dark',5)}</g>`);
}

const star=(x,y,r,token='energy')=>path(`M${x} ${y-r}Q${x+round(r*.2)} ${y-round(r*.2)} ${x+r} ${y}Q${x+round(r*.2)} ${y+round(r*.2)} ${x} ${y+r}Q${x-round(r*.2)} ${y+round(r*.2)} ${x-r} ${y}Q${x-round(r*.2)} ${y-round(r*.2)} ${x} ${y-r}Z`,token);
function atomic(){return foot(rect(38,191,180,34,'rock-dark',14)+
  path('M48 194V142Q48 64 128 64Q208 64 208 142V194Z','paper')+
  path('M185 103Q201 126 196 181','none',`stroke="${paint('paper',-.18)}" stroke-width="13"`)+
  group('glow',rect(61,160,134,20,state==='idle'?'uranium':'coal',10)+circle(128,115,22,state==='idle'?'uranium':'coal'))+
  circle(128,115,11,'rock-dark')+glint('M64 131Q66 95 98 84')+post(122,178,46,'rock-dark'));}
function monument(){return foot(rect(62,205,132,21,'paper',9)+
  path('M92 205L101 103L128 79L155 103L164 205Z','rock')+
  path('M128 80L155 103L164 205H128Z','rock-dark')+
  path('M128 111L142 140L128 173L114 140Z','crystal')+
  group('star',star(128,40,25,'energy')+glint('M123 34L127 27'))+
  glint('M109 112L104 183')+line('M93 216H163','clay',4));}

// New civic and production buildings share the original state/palette helpers.
function park(){return foot(
  ellipse(128,215,92,13,'grass')+post(68,120,97,'iron')+
  path('M76 161L54 143M76 149L96 129','none',`stroke="${paint('iron')}" stroke-width="10"`)+
  circle(75,109,43,'leaf')+path('M101 82Q131 119 91 145','none',`stroke="${paint('moss')}" stroke-width="12"`)+glint('M44 99Q48 80 65 79')+
  post(94,186,33,'rock-dark')+post(137,186,33,'rock-dark')+rect(89,165,65,13,'iron',5)+rect(89,183,65,12,'clay',5)+
  line('M99 170H143','sand',3)+ellipse(188,212,30,11,'rock')+ellipse(188,208,25,7,'water')+
  post(182,177,31,'paper')+ellipse(188,176,21,8,'paper')+ellipse(188,173,16,5,'water')+
  line('M188 170V150Q174 143 175 156M188 151Q201 143 202 156','science',5)+
  rect(36,213,62,12,'iron',6)+[48,67,85].map((x,i)=>line(`M${x} 216V199`,'leaf',3)+circle(x,198,7,i===1?'clay':'danger')+circle(x-1,197,2,'cream','stroke="none"')).join(''));}

const fish = (x,y) => path(`M${x} ${y}Q${x+10} ${y-11} ${x+22} ${y}Q${x+10} ${y+11} ${x} ${y}L${x-7} ${y-7}V${y+7}Z`,'science')+circle(x+16,y-2,1.5,'ink','stroke="none"');
function fishery(tier){
  const water=path('M124 207Q149 195 168 206Q193 197 222 208V226H118Z','water')+line('M146 218Q154 222 162 218M199 220H213','cream',3);
  const jetty=post(45,182,43)+post(111,182,43)+rect(33,190,110,14,'iron',5)+line('M45 194H125','sand',3);
  if(tier===1)return foot(water+post(50,150,42)+post(116,150,42)+rect(40,108,98,75,'iron',12)+
    line('M47 131H132M46 151H132M54 166H72','clay',3)+path('M33 112L80 77Q88 71 97 78L146 112Z','deep-water')+
    glint('M48 105L81 82')+door(79,143,27,41)+windowPane(48,120,23,24)+
    path('M117 133L145 153L127 187L105 168Z','paper')+line('M113 148L134 165M110 160L127 174M124 144L113 168M134 151L123 179','iron',3)+
    jetty+line('M154 201L136 191','iron',4)+path('M151 198H222Q211 224 175 218Z','clay')+line('M166 204H208','sand',4)+
    post(187,163,36,'iron')+path('M188 165L208 188H188Z','paper'));
  return foot(water+rect(125,126,88,63,'paper',12)+path('M116 128L157 92Q168 86 180 94L220 128Z','deep-water')+
    line('M145 143H198M145 155H198','rock-dark',3)+door(177,151,25,38)+
    post(57,57,134,'rock')+path('M49 58H158L150 77H49Z','science')+line('M65 65H139','cream',4)+
    line('M69 81L111 60M63 102L92 75','rock-dark',5)+line('M145 77V121','ink',3)+path('M145 121Q155 131 145 137Q135 139 135 130','none')+
    jetty+crate(37,163,30)+crate(77,163,30)+fish(45,165)+fish(85,165)+
    rect(163,171,34,28,'paper',7)+windowPane(172,177,17,15)+line('M199 164V199','iron',4)+
    path('M132 196H224L214 215Q178 229 147 215Z','clay')+line('M148 205H213','cream',4));
}

function glassworks(){return foot(rect(47,111,142,112,'paper',17)+
  rect(151,68,24,54,'rock',8)+path('M38 113L68 85H183L206 113Z','rock-dark')+glint('M57 105L72 92H111')+
  path('M128 222V168Q128 123 172 123Q218 123 218 168V222Z','iron')+
  path('M143 222V177Q143 151 172 151Q202 151 202 177V222Z','coal')+
  group('glow',path('M151 217V180Q151 164 172 164Q193 164 193 180V217Z',state==='idle'?'ascension':'coal')+
    path('M161 215Q155 200 168 188L177 197L183 186Q195 213 182 215Z',lit()))+
  line('M137 173H144M200 172H209M145 143L151 151M188 139L183 151','clay',4)+glint('M139 154Q141 139 154 135')+
  post(45,147,77)+post(112,147,77)+rect(39,209,86,11,'iron',4)+rect(39,174,86,9,'iron',4)+
  path('M53 204V184L60 179V169H70V180L76 186V204Z','science')+glint('M59 188V197')+
  rect(85,185,24,21,'water',5)+glint('M91 190V198')+
  path('M53 165V132L79 126V165Z','science')+path('M83 165V139L107 133V165Z','water')+glint('M60 139V152M90 144V156'));}

function library(){return foot(rect(43,118,170,108,'paper',20)+
  path('M193 137V204Q193 215 181 215H64','none',`stroke="${paint('paper',-.18)}" stroke-width="10"`)+
  path('M35 119Q47 63 128 59Q209 63 221 119Z','crystal')+
  path('M129 63Q169 71 177 118','none',`stroke="${paint('oil-sheen')}" stroke-width="8"`)+
  rect(33,116,190,13,'oil-sheen',6)+glint('M54 102Q67 79 94 74')+
  [57,167].map(x=>path(`M${x} 194V158Q${x} 140 ${x+16} 140Q${x+32} 140 ${x+32} 158V194Z`,lit())+
    line(`M${x+16} 145V191M${x+3} 169H${x+29}`,'iron',3)).join('')+
  door(109,176,38,49)+path('M100 143Q113 137 128 145Q143 137 156 143V164Q142 158 128 167Q114 158 100 164Z','cream')+
  line('M128 146V163M106 148L119 150M137 150L149 148','iron',3)+rect(55,205,32,14,'clay',6)+leaf(70,207,.5));}

function refinery(){
  const pipe=d=>line(d,'ink',14)+line(d,'rock',8);
  const tank=(x,y)=>rect(x,y,48,223-y,'paper',19)+ellipse(x+24,y,24,11,'rock')+line(`M${x+7} ${y+26}H${x+41}`,'rock-dark',4)+glint(`M${x+8} ${y+13}V${y+25}`);
  return foot(rect(155,68,43,150,'rock',19)+ellipse(176,69,21,9,'paper')+
    [93,123,153].map(y=>rect(149,y,55,10,'rock-dark',5)).join('')+
    post(170,43,24,'iron')+path('M176 43Q159 35 174 20Q173 30 182 29Q191 41 176 43Z',state==='idle'?'ascension':'coal')+
    line('M188 80V177M161 83V91','cream',3)+pipe('M155 105H139V174H118M155 145H131V207H85')+
    tank(35,159)+tank(91,184)+rect(151,184,58,41,'iron',10)+door(165,196,24,29)+
    rect(201,200,20,25,'clay',4)+path('M205 199V193H216V199','none')+line('M205 207L216 217M216 207L205 217','iron',3));
}

function observatory(){return foot(
  path('M55 150Q128 128 201 150V210Q201 228 128 228Q55 228 55 210Z','snow')+
  path('M184 158V206Q184 216 161 217','none',`stroke="${paint('rock')}" stroke-width="10"`)+
  // The hemisphere and telescope rotate together about the dome center.
  group('dome',path('M49 145Q49 72 128 72Q207 72 207 145Z','snow')+
    path('M124 75Q155 95 154 145H178Q177 95 149 75Z','coal')+
    path('M137 119L185 69L207 89L157 139Z','rock')+
    path('M175 78L187 65Q190 61 195 65L212 80Q216 84 211 89L201 99Z','snow')+
    ellipse(200,78,8,12,'deep-water','transform="rotate(-48 200 78)"')+
    glint('M67 120Q71 91 101 85M148 117L177 87')+rect(45,143,166,14,'rock',7))+
  path('M112 224V190Q112 174 128 174Q144 174 144 190V224Z','deep-water')+
  circle(128,194,8,lit())+line('M66 171H91M166 171H190','rock-dark',4)+glint('M64 183V205'));}

const buildings = [
  {id:'park',tiers:1,phase:'P1',draw:park},
  {id:'fishery',tiers:2,phase:'P1',draw:fishery},
  {id:'glassworks',tiers:1,phase:'P1',parts:['glow'],draw:glassworks},
  {id:'library',tiers:1,phase:'P1',draw:library},
  {id:'refinery',tiers:1,phase:'P1',draw:refinery},
  {id:'observatory',tiers:1,phase:'P1',parts:['dome'],draw:observatory},
  {id:'housing',tiers:4,phase:'P0',parts:['chimney-smoke-anchor','windows'],draw:housing},
  {id:'mine',tiers:2,phase:'P0',parts:['cart','wheel'],draw:mine},
  {id:'pump',tiers:2,phase:'P0',parts:['pump-arm'],draw:pump},
  {id:'farm',tiers:2,phase:'P0',draw:farm},
  {id:'foundry',tiers:2,phase:'P0',parts:['glow','smoke-anchor'],draw:foundry},
  {id:'lab',tiers:2,phase:'P0',parts:['dome','antenna-light'],draw:lab},
  {id:'launchpad',tiers:1,phase:'P0',draw:launchpad},
  {id:'rocket-small',tiers:1,phase:'P0',parts:['flame-anchor'],draw:rocket},
  {id:'power-coal',tiers:1,phase:'P1',parts:['smoke-anchor'],draw:coalPlant},
  {id:'power-wind',tiers:1,phase:'P1',parts:['blades'],draw:wind},
  {id:'power-solar',tiers:1,phase:'P1',draw:solar},
  {id:'air-filter',tiers:1,phase:'P1',parts:['fan'],draw:airFilter},
  {id:'hydro-farm',tiers:1,phase:'P1',parts:['glow'],draw:hydroFarm},
  {id:'storage',tiers:2,phase:'P1',draw:storage},
  {id:'market',tiers:1,phase:'P1',parts:['flag'],draw:market},
  {id:'rocket-big',tiers:1,phase:'P1',parts:['flame-anchor'],draw:(t,v)=>rocket(t,v,true)},
  {id:'watchtower',tiers:1,phase:'P1',parts:['banner'],draw:watchtower},
  {id:'ruin',tiers:1,phase:'P1',draw:ruin},
  {id:'escape-pod',tiers:1,phase:'P1',variants:['closed','open'],draw:escapePod},
  {id:'power-atomic',tiers:1,phase:'P2',parts:['glow'],draw:atomic},
  {id:'monument',tiers:1,phase:'P2',parts:['star'],draw:monument},
];

function scaffolding(){
  return group('scaffolding',post(38,78,159)+post(206,78,159)+rect(30,113,196,12,'sand',5)+rect(30,186,196,12,'sand',5)+
    line('M46 181L207 127M47 202L199 230','iron',5)+post(176,154,83,'sand')+post(196,154,83,'sand')+
    [166,186,206,226].map(y=>line(`M180 ${y}H200`,'iron',4)).join(''));
}

const assets=[];
for(const def of buildings){
  for(let tier=1;tier<=def.tiers;tier++){
    for(const variant of def.variants??['']){
      for(const mode of ['idle','construction','off']){
        state=mode;
        const tiered=def.tiers>1||def.multi;
        const id=`building.${def.id}${tiered?`.t${tier}`:''}${variant?`.${variant}`:''}${mode==='idle'?'':`.${mode}`}`;
        const stem=`${def.id}${tiered?`-t${tier}`:''}${variant?`-${variant}`:''}${mode==='idle'?'':`-${mode}`}`;
        const body=def.draw(tier,variant);
        const content=mode==='construction'?`<g opacity="0.4">${body}</g>${scaffolding()}`:body;
        write(`art/src/buildings/${stem}.svg`,svg(content,256));
        assets.push({id,category:'buildings',src:`art/src/buildings/${stem}.svg`,out:`public/assets/sprites/buildings/${stem}.png`,viewBox:[256,256],anchor:[.5,.9375],frames:1,parts:[...(def.parts??[]),...(mode==='construction'?['scaffolding']:[])],tags:[def.id,...(tiered?[`tier${tier}`]:[]),...(variant?[variant]:[]),mode],phase:def.phase});
      }
    }
  }
}
// A single-tier lookup resolves to the closed pod; explicit variant ids remain available.
for(const asset of assets.filter(a=>a.id.startsWith('building.escape-pod.closed'))){
  assets.push({...asset,id:asset.id.replace('.closed',''),tags:[...asset.tags,'default-alias']});
}
// FX use a 128-unit design grid. Transform the 3-unit outline with the artwork.
state='idle';
const puff=(token)=>path('M30 95C10 94 10 66 27 63C20 39 47 29 60 44C75 23 103 39 98 61C122 61 120 94 100 95Z',token)+
  glint('M34 62Q32 48 46 47');
function smoke(f){
  const scales=[.5,.7,.9,1],ys=[24,12,0,-15],opacities=[.9,.8,.5,.2];
  return `<g opacity="${opacities[f-1]}" transform="translate(64 ${64+ys[f-1]}) scale(${scales[f-1]}) translate(-64 -64)">${puff('rock')}</g>`;
}
function dust(f){
  const spread=[0,9,17,22][f-1],opacity=[.9,.8,.5,.2][f-1];
  return `<g opacity="${opacity}">`+
    `<g transform="translate(${round(8-spread*.3)} 12) scale(0.7)">${puff('sand')}</g>`+
    `<g transform="translate(${round(37+spread*.3)} 17) scale(0.6)">${puff('paper')}</g>`+
    [0,1,2].map(i=>circle(36+i*26+(i-1)*spread,42-f*4,4+(f===2?2:0),'sand')).join('')+'</g>';
}
function sparkle(f){
  const r=[18,39,14][f-1];
  return `<g opacity="${[.5,1,.3][f-1]}">${star(64,64,r,'energy')}${star(28,35,7,'cream')}${star(99,90,9,'cream')}${glint(`M60 ${69-r}L64 ${70-r}`)}</g>`;
}
function rays(radius,length,token='energy',count=8){
  return Array.from({length:count},(_,i)=>{
    const a=i*Math.PI*2/count;
    return line(`M${round(64+Math.sin(a)*radius)} ${round(64+Math.cos(a)*radius)}L${round(64+Math.sin(a)*(radius+length))} ${round(64+Math.cos(a)*(radius+length))}`,token,4);
  }).join('');
}
function resourcePop(f){
  const radius=[15,31,44][f-1];
  return `<g opacity="${[.9,.6,.2][f-1]}">${circle(64,64,radius,'cream',`fill-opacity="0.3" stroke="${C('energy')}" stroke-width="5"`)}${rays(radius+5,7)}</g>`;
}
function rocketFlame(f){
  const tip=[112,122,116][f-1],bend=[-5,6,-2][f-1];
  return path(`M43 8Q64 18 85 8Q101 48 77 80Q78 96 ${64+bend} ${tip}Q48 105 49 87Q26 57 43 8Z`,'ascension')+
    path(`M53 13Q64 18 75 13Q83 52 64 ${tip-22}Q44 51 53 13Z`,'energy')+
    path('M60 15H69Q77 41 64 57Q53 39 60 15Z','cream','stroke="none"');
}
function explosion(f){
  const size=[.4,.8,1,.9,.7][f-1],opacity=[1,1,.9,.5,.2][f-1];
  return `<g opacity="${opacity}">`+
    `<g transform="translate(64 64) scale(${size}) translate(-64 -64)">${puff(f<3?'ascension':'paper')}${star(64,65,f<3?23:12,'energy')}</g>`+
    [[25-f*2,34-f*2],[95+f*2,32],[35,96+f*2],[98,95]].map(([x,y],i)=>star(x,y,round((i%2?6:9)*size),i%2?'clay':'energy')).join('')+'</g>';
}
function ascension(f){
  const y=[94,75,52,27][f-1],rx=[24,33,43,52][f-1],opacity=[.6,1,.7,.2][f-1];
  return `<g opacity="${opacity}">`+
    ellipse(64,y,rx,11,'cream',`fill-opacity="0.2" stroke="${C('ascension')}" stroke-width="6"`)+
    ellipse(64,y-4,rx-3,9,'cream',`fill-opacity="0.1" stroke="${C('energy')}" stroke-width="3"`)+
    [35,64,93].map((x,i)=>line(`M${x} ${y+18}V${Math.min(118,y+33+i*5)}`,'energy',3)+star(x,y-21-(i%2)*9,6,'cream')).join('')+'</g>';
}
function heart(f){
  const size=[.7,1,.8][f-1],dy=[10,0,-12][f-1];
  return `<g opacity="${[.7,1,.4][f-1]}" transform="translate(64 ${64+dy}) scale(${size}) translate(-64 -64)">`+
    path('M64 99C49 89 22 69 25 48C28 28 52 27 64 44C76 27 100 28 103 48C106 69 79 89 64 99Z','danger')+
    glint('M36 49Q39 38 48 41')+'</g>';
}
function anger(f){
  const dy=[8,0,-10][f-1],opacity=[.7,1,.4][f-1];
  return `<g opacity="${opacity}">`+
    [0,1].map(i=>`<g transform="translate(${i?72:0} ${dy}) scale(0.4)">${puff('snow')}</g>`).join('')+
    [34,92].map((x,i)=>line(`M${x} 92Q${x+(i?-10:10)} 80 ${x} 68Q${x+(i?10:-10)} 57 ${x} 51`,'rock',5)).join('')+
    path('M53 48V62H40M75 48V62H88M53 87V74H40M75 87V74H88','none',`stroke="${C('danger')}" stroke-width="6"`)+'</g>';
}
const effects=[
  {id:'smoke',size:64,frames:4,fps:6,draw:smoke},
  {id:'dust',size:128,frames:4,fps:10,draw:dust},
  {id:'sparkle',size:64,frames:3,fps:8,draw:sparkle},
  {id:'resource-pop',size:64,frames:3,fps:10,draw:resourcePop},
  {id:'rocket-flame',size:128,frames:3,fps:12,anchor:[.5,0],loop:true,draw:rocketFlame},
  {id:'explosion',size:256,frames:5,fps:12,draw:explosion},
  {id:'ascension',size:512,frames:4,fps:6,draw:ascension},
  {id:'heart',size:64,frames:3,fps:6,draw:heart},
  {id:'anger',size:64,frames:3,fps:6,draw:anger},
];
for(const effect of effects){
  const stem=`fx-${effect.id}`;
  for(let f=1;f<=effect.frames;f++){
    write(`art/src/fx/${stem}-f${f}.svg`,svg(`<g transform="scale(${effect.size/128})">${effect.draw(f)}</g>`,effect.size,effect.size,3));
  }
  assets.push({id:`fx.${effect.id}`,category:'fx',src:`art/src/fx/${stem}-f{f}.svg`,out:`public/assets/sprites/fx/${stem}-f{f}.png`,viewBox:[effect.size,effect.size],anchor:effect.anchor??[.5,.5],frames:effect.frames,fps:effect.fps,parts:[],tags:[effect.id,'animation',effect.loop?'loop':'once'],phase:'P1'});
}
write('art/manifest/buildings.json',JSON.stringify({assets},null,2)+'\n');
console.log(`Buildings and FX: ${assets.length} assets generated.`);
