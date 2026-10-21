import { C, svg, round, write } from './common.mjs';

// Original rounded toy industry. Helpers mirror the building generator locally,
// so this independent fragment does not change any shared generator or artwork.
let state = 'idle';
const paint = (token, tone = 0) => C(state === 'off' && !['ink','coal','rock','rock-dark','snow'].includes(token)
  ? (['cream','paper','sand'].includes(token) ? 'rock' : 'rock-dark') : token, tone);
const fill = token => `fill="${paint(token)}"`;
const path = (d, token='none', extra='') => `<path d="${d}" fill="${token==='none'?'none':paint(token)}" ${extra}/>`;
const rect = (x,y,w,h,token,r=8,extra='') => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" ${fill(token)} ${extra}/>`;
const circle = (x,y,r,token,extra='') => `<circle cx="${x}" cy="${y}" r="${r}" ${fill(token)} ${extra}/>`;
const ellipse = (x,y,rx,ry,token,extra='') => `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" ${fill(token)} ${extra}/>`;
const group = (id,body,extra='') => `<g id="${id}" ${extra}>${body}</g>`;
const line = (d,token='ink',width=3) => path(d,'none',`stroke="${paint(token)}" stroke-width="${width}"`);
const glint = d => line(d,'cream',4);
const active = token => state==='idle'?token:'coal';
const base = () => rect(31,225,194,12,'rock',6)+line('M42 233H214','rock-dark',5);
const post = (x,y,h,token='iron') => rect(x,y,12,h,token,6);
const pipe = (d,token='rock',width=10) => line(d,'ink',width+6)+line(d,token,width);
const shade = (d,token,width=9) => path(d,'none',`stroke="${paint(token,-.18)}" stroke-width="${width}"`);
function scaffolding(){
  return group('scaffolding',post(38,78,159)+post(206,78,159)+rect(30,113,196,12,'sand',5)+rect(30,186,196,12,'sand',5)+
    line('M46 181L207 127M47 202L199 230','iron',5)+post(176,154,83,'sand')+post(196,154,83,'sand')+
    [166,186,206,226].map(y=>line(`M180 ${y}H200`,'iron',4)).join(''));
}

function biogas(){
  const tank=(x,y,w,h,token)=>path(`M${x} ${y+h}V${y+44}Q${x} ${y} ${x+w/2} ${y}Q${x+w} ${y} ${x+w} ${y+44}V${y+h}Z`,token)+
    shade(`M${x+w-13} ${y+43}V${y+h-13}H${x+19}`,token)+
    glint(`M${x+13} ${y+39}Q${x+14} ${y+19} ${x+32} ${y+16}`)+
    rect(x-3,y+h-13,w+6,14,'rock',7)+line(`M${x+6} ${y+55}H${x+w-6}`,'moss',4);
  return pipe('M83 127V91Q83 79 96 79H153Q165 79 165 92V133','sand',12)+
    tank(119,107,91,114,'leaf')+tank(37,122,99,99,'grass')+
    circle(83,186,13,'paper')+line('M83 186L90 179','leaf',4)+
    post(193,87,66,'rock-dark')+rect(186,83,26,12,'rock',6)+
    group('gas-flame',path('M192 78Q179 63 198 46Q195 61 205 59Q219 76 202 82Z',active('ascension'))+
      path('M198 78Q191 71 200 64Q209 76 202 78Z',active('energy'),'stroke="none"'))+
    line('M164 211L184 157','iron',6)+line('M175 179Q185 183 192 174L198 157M184 177L190 154M177 174L181 151','rock',4)+
    path('M145 225Q141 213 153 209Q152 197 165 195Q179 185 191 200Q207 199 211 214L218 225Z','iron')+
    path('M154 214Q164 201 177 202L185 211L202 213','none',`stroke="${paint('clay')}" stroke-width="6"`)+
    path('M164 202Q153 186 170 188Q180 196 164 202Z','leaf')+base();
}

function gasPower(){
  return rect(186,68,19,118,'paper',9)+rect(181,60,29,16,'rock',7)+
    group('steam',path('M188 49Q176 48 181 37Q171 26 182 20Q191 13 198 24Q211 22 212 34Q213 45 202 46Z','snow',
      `stroke="${paint('rock')}" stroke-width="3" opacity="${state==='idle'?.7:0}"`))+
    glint('M192 86V110')+pipe('M186 170H216V212H194','rock',9)+
    path('M102 111H150Q201 111 201 166V222H102Z','science')+
    shade('M176 132Q189 149 189 174V211H145','science',10)+
    ellipse(103,168,60,57,'paper')+ellipse(103,168,45,43,'rock-dark')+
    ellipse(103,168,34,32,'deep-water')+
    [0,120,240].map(a=>`<g transform="rotate(${a} 103 168)">${path('M98 165Q79 142 99 141Q117 139 109 160L106 167Z','snow')}</g>`).join('')+
    circle(103,168,10,'rock')+circle(100,165,3,'cream','stroke="none"')+
    glint('M55 154Q60 132 78 128M119 119H144')+
    rect(155,155,34,47,'paper',12)+
    path('M170 194Q156 188 168 173L174 165Q172 176 180 181Q185 193 170 194Z','deep-water','stroke-width="3"')+
    path('M169 188Q166 184 172 179Q179 189 172 189Z','science','stroke="none"')+
    rect(61,217,132,9,'rock-dark',4)+base();
}

function plastics(){
  const crate=(x,y,token)=>rect(x,y,35,28,token,7)+shade(`M${x+28} ${y+10}V${y+21}H${x+9}`,token,5)+
    line(`M${x+9} ${y+8}H${x+22}`,'cream',3);
  return post(67,160,63,'rock')+post(104,160,63,'rock')+
    pipe('M113 110H151Q165 110 165 124V151','paper',12)+
    rect(47,68,81,105,'paper',22)+ellipse(87,69,40,16,'snow')+
    path('M49 151H126L108 183H69Z','clay')+rect(78,180,20,29,'rock-dark',7)+
    shade('M113 88V143H63','paper',9)+glint('M59 91V118')+
    rect(75,45,24,25,'rock',8)+line('M87 71V109','rock-dark',5)+
    circle(87,124,19,'science')+line('M79 116L95 132M79 132L95 116','snow',4)+
    rect(144,145,59,61,'water',14)+shade('M190 158V193H158','water',7)+
    rect(154,159,28,21,active('energy'),7)+
    post(113,202,23,'rock')+post(204,202,23,'rock')+
    rect(101,193,121,21,'rock-dark',10)+[114,141,168,195,211].map(x=>circle(x,203,5,'rock','stroke-width="3"')).join('')+
    crate(143,113,'danger')+crate(181,166,'energy')+crate(181,135,'water')+
    ellipse(48,218,11,7,'danger')+ellipse(72,216,11,8,'water')+ellipse(93,219,10,6,'energy')+
    glint('M44 215H48M68 212H72')+base();
}

function electronicsWorkshop(){
  return rect(46,127,164,99,'paper',24)+shade('M196 145V205Q196 215 180 215H66','paper',9)+
    path('M37 134Q29 127 40 117L91 76Q100 68 111 73L215 115Q227 119 220 133Z','clay')+
    glint('M52 119L97 83')+
    line('M153 103V68M193 116V68','rock-dark',6)+rect(134,30,77,48,'sand',13)+
    line('M147 64L161 50','rock-dark',7)+path('M155 50L170 36Q175 33 179 39L185 45L168 61Z','clay','stroke-width="4"')+
    line('M182 45Q196 46 196 57Q196 67 186 66','coal',4)+
    rect(65,149,81,55,'rock-dark',12)+rect(73,157,65,39,active('leaf'),8)+
    group('circuit-glow',line('M81 176H92L98 169H113M105 186V180H126M121 164V173H129',active('uranium'),4)+
      rect(96,168,20,16,active('toxic'),5,'stroke-width="3"'))+
    glint('M79 163H88')+rect(159,170,34,54,'iron',11)+circle(183,195,3,'sand','stroke="none"')+
    pipe('M56 174H40V209Q40 217 51 217H75','coal',5)+
    line('M83 210Q87 221 109 215Q129 209 144 221','deep-water',5)+
    rect(119,213,16,10,'rock',4,'stroke-width="3"')+base();
}

function chipFactory(){
  const pins=[100,118,136,154].map(x=>line(`M${x} 49V61M${x} 99V111`,'rock',7)).join('')+
    [70,88].map(y=>line(`M81 ${y}H93M161 ${y}H173`,'rock',7)).join('');
  return rect(45,124,168,102,'snow',24)+shade('M198 144V208H64','snow',10)+
    rect(164,89,39,40,'paper',10)+rect(159,84,49,13,'snow',6)+
    line('M173 101H194M173 111H194','rock-dark',4)+
    rect(38,115,181,24,'paper',11)+glint('M51 122H92')+
    pins+rect(91,58,72,45,'deep-water',10)+rect(105,68,43,24,'science',7)+
    path('M115 78H129V89H139','none',`stroke="${paint('snow')}" stroke-width="4"`)+
    rect(59,150,140,66,'deep-water',13)+rect(66,156,126,53,'science',9)+
    path('M69 177L89 156H111L69 198ZM146 209L190 165V186L167 209Z','snow','stroke="none" opacity="0.5"')+
    line('M104 155V210M151 155V210','snow',6)+
    rect(113,175,29,49,'snow',9)+rect(120,183,15,25,'deep-water',5,'stroke-width="3"')+
    line('M75 222H93M163 222H183','rock',4)+base();
}

function datacenter(){
  const fan=(x,y)=>rect(x-23,y-23,46,46,'rock',12)+circle(x,y,17,'coal')+
    [0,120,240].map(a=>`<g transform="rotate(${a} ${x} ${y})">${path(`M${x-3} ${y-2}Q${x-15} ${y-13} ${x-2} ${y-14}Q${x+7} ${y-12} ${x+3} ${y-3}Z`,'science','stroke-width="3"')}</g>`).join('')+
    circle(x,y,4,'snow','stroke-width="3"');
  const racks=[69,111,153];
  return post(63,75,60,'rock-dark')+
    path('M38 49Q48 92 83 82Q92 65 84 46Q64 58 38 49Z','paper')+
    line('M62 70L76 38','rock-dark',5)+circle(77,35,6,'science')+glint('M45 58Q48 69 58 73')+
    rect(45,126,166,99,'deep-water',22)+shade('M196 144V211H65','deep-water',10)+
    fan(115,100)+fan(174,100)+rect(39,121,177,21,'water',10)+glint('M51 128H85')+
    rect(57,151,143,64,'rock-dark',12)+
    racks.map(x=>rect(x,158,32,49,'coal',7)+[171,187].map(y=>line(`M${x+4} ${y}H${x+28}`,'rock-dark',3)).join('')).join('')+
    group('lights',racks.map((x,i)=>[165,181,199].map((y,j)=>
      circle(x+8,y,3,active((i+j)%2?'science':'ok'),'stroke="none"')+
      rect(x+17,y-2,8,4,active((i+j)%3?'water':'energy'),2,'stroke="none"')).join('')).join(''))+
    line('M63 217H88M168 217H191','water',4)+base();
}

const buildings = [
  {id:'biogas-plant',draw:biogas,parts:['gas-flame']},
  {id:'power-gas',draw:gasPower,parts:['steam']},
  {id:'plastics',draw:plastics},
  {id:'electronics.t1',draw:electronicsWorkshop,parts:['circuit-glow']},
  {id:'electronics.t2',draw:chipFactory},
  {id:'datacenter',draw:datacenter,parts:['lights']},
];
function cryoPod(){
  return ellipse(64,116,40,4,'rock-dark','stroke="none" opacity="0.3"')+
    rect(32,14,64,99,'rock',25)+shade('M86 35V97Q86 105 75 105','rock',5)+
    rect(40,25,48,77,'deep-water',18)+
    `<g opacity="0.6" stroke-width="2">`+
    ellipse(79,83,7,15,'iron', 'transform="rotate(-25 79 83)"')+
    line('M76 78L85 87M76 85L82 90','coal',1)+
    rect(50,72,28,24,'clay',10)+rect(49,88,12,9,'iron',4)+rect(66,88,12,9,'iron',4)+
    circle(51,43,6,'iron')+circle(76,43,6,'iron')+ellipse(64,57,19,18,'iron')+
    ellipse(64,66,12,7,'sand')+line('M53 56Q56 59 59 56M68 56Q71 59 74 56','ink',2)+
    ellipse(64,63,4,2,'coal')+rect(60,68,8,6,'snow',2)+line('M64 69V73','rock-dark',1)+
    path('M48 45Q48 32 63 32Q78 32 78 45Z','sand')+rect(46,43,34,5,'sand',2)+
    line('M54 81L72 84M72 79L56 85','iron',4)+'</g>'+
    rect(41,26,46,75,'science',17,'stroke="none" fill-opacity="0.3"')+
    path('M42 44Q41 28 57 28H71L58 35L53 45L49 38ZM42 85L49 91L55 88L59 100H49Q42 96 42 85ZM80 84L86 76V92Q86 101 75 101Z','snow','stroke="none" opacity="0.8"')+
    line('M46 60L49 53M75 41L80 34M77 69L81 63','snow',2)+
    glint('M40 40Q40 23 54 22')+
    rect(44,105,40,9,'paper',4)+circle(80,109,3,'science','stroke-width="1.5"')+
    rect(27,111,74,7.5,'rock',3)+
    path('M20 118L17 106L23 98L28 109L25 118Z','science')+
    path('M100 118L99 108L105 100L111 111L108 118Z','snow')+
    line('M23 104V115M105 105V115','water',1.5);
}

function suit(mini=false){
  const body=path('M45 59Q33 56 27 70L19 88Q17 96 26 98Q34 100 38 91L44 80V99L39 106Q34 114 44 115H56Q62 115 62 106V97H67V106Q67 115 74 115H86Q96 114 90 106L85 99V80L91 91Q95 101 103 98Q111 96 109 88L101 70Q95 56 83 59Z','paper')+
    (!mini?shade('M78 77V96L84 106','paper',5)+line('M25 87L34 91M94 91L103 87','rock',5):'')+
    circle(64,mini?39:37,27,'snow')+rect(43,mini?26:24,42,29,'deep-water',13)+
    (mini?line('M51 32H61','snow',5):path('M47 38Q47 28 57 28H69L49 47Z','science','stroke="none"')+glint('M51 32H60'))+
    rect(48,65,32,22,'science',7)+
    (!mini?circle(57,75,3,'energy','stroke="none"')+line('M66 74H73M55 81H73','snow',2)+
      line('M45 108H55M75 108H86','rock-dark',3):'');
  return mini?`<g transform="scale(0.5)" stroke-width="8">${body}</g>`:body;
}

const assets=[];
function emit(id,category,stem,body,size,anchor,parts=[],tags=[],stroke=6*size/256){
  // All geometry stays at one decimal, including coordinates from arithmetic.
  const content=body.replace(/-?\d+\.\d{2,}/g,n=>String(round(Number(n))));
  write(`art/src/${category}/${stem}.svg`,svg(content,size,size,stroke));
  assets.push({id,category,src:`art/src/${category}/${stem}.svg`,out:`public/assets/sprites/${category}/${stem}.png`,viewBox:[size,size],anchor,frames:1,parts,tags,phase:'P1'});
}
for(const def of buildings){
  for(const mode of ['idle','construction','off']){
    state=mode;
    const body=def.draw();
    const content=mode==='construction'?`<g opacity="0.4">${body}</g>${scaffolding()}`:body;
    emit(`building.${def.id}${mode==='idle'?'':'.'+mode}`,'buildings',`${def.id.replaceAll('.','-')}${mode==='idle'?'':'-'+mode}`,content,256,[.5,.9375],
      [...(def.parts??[]),...(mode==='construction'?['scaffolding']:[])],[def.id,mode]);
  }
}
state='idle';
emit('prop.cryo-pod','biomes','cryo-pod',cryoPod(),128,[.5,.9375],[],['cryo-pod','any-biome']);
emit('resource.suits','resources','suits',suit(),128,[.5,.5],[],['suits']);
emit('resource.suits.mini','resources','suits-mini',suit(true),64,[.5,.5],[],['suits','mini'],4);
write('art/manifest/industry.json',JSON.stringify({assets},null,2)+'\n');
console.log(`Industry: ${assets.length} assets generated.`);
