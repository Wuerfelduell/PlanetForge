// Original PlanetForge gem art, authored as deterministic vector geometry.
// Run: node scripts/assets/gen-gems.mjs, then npm --prefix scripts/assets run assets:gen.
import { C, svg, round, write } from './common.mjs';

const assets = [];
let state = 'idle';
// Same off-state palette mapping as gen-buildings.mjs and gen-economy.mjs.
const paint = (token, tone = 0) => C(state === 'off' && !['ink', 'coal', 'rock', 'rock-dark', 'snow'].includes(token)
  ? (['cream', 'paper', 'sand'].includes(token) ? 'rock' : 'rock-dark') : token, tone);
const p = (d, token = 'none', extra = '', tone = 0) => `<path d="${d}" fill="${token === 'none' ? 'none' : paint(token, tone)}" ${extra}/>`;
const rect = (x,y,w,h,token,r=8,extra='') => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="${paint(token)}" ${extra}/>`;
const ellipse = (x,y,rx,ry,token,extra='') => `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="${paint(token)}" ${extra}/>`;
const circle = (x,y,r,token,extra='') => `<circle cx="${x}" cy="${y}" r="${r}" fill="${paint(token)}" ${extra}/>`;
const group = (id, body, extra='') => `<g id="${id}" ${extra}>${body}</g>`;
const line = (d,token='ink',width=3,extra='') => p(d,'none',`stroke="${paint(token)}" stroke-width="${width}" ${extra}`);
const shine = d => line(d,'cream',4);
const star = (x,y,r) => p(`M${x} ${y-r}Q${x+2} ${y-2} ${x+r} ${y}Q${x+2} ${y+2} ${x} ${y+r}Q${x-2} ${y+2} ${x-r} ${y}Q${x-2} ${y-2} ${x} ${y-r}Z`,'snow',`stroke-width="${r>=8?3:1.5}"`);

function emit(id, category, stem, body, size=128, extra={}) {
  const src=`art/src/${category}/${stem}.svg`;
  write(src,svg(body,size,size,extra.stroke??6*size/256));
  const {stroke,...metadata}=extra;
  assets.push({id,category,src,out:`public/assets/sprites/${category}/${stem}.png`,viewBox:[size,size],anchor:[.5,.5],frames:1,parts:[],tags:['gems',stem],phase:'P1',...metadata});
}

function gem(kind, mini=false) {
  const fine=mini?3:1.5;
  if(kind==='diamond')return p('M35 32H89L112 55L64 111L16 55Z','snow')+
    p('M16 55H112L64 111Z','glacier')+
    p('M82 55H112L64 111Z','glacier','stroke="none"',-.18)+
    p('M45 55L64 111L82 55Z','snow')+
    line('M16 55H112M35 32L45 55L62 32L82 55L89 32','ink',fine)+
    (mini?'':line('M29 53L39 41M52 61L62 82','tint-white',4))+star(105,22,mini?9:10);
  if(kind==='emerald')return p('M38 16H86L105 35V93L86 112H38L19 93V35Z','leaf')+
    p('M38 16H86L76 34H47L36 45L19 35Z','grass','stroke="none"')+
    p('M105 35V93L86 112H38L48 94H77L88 83V45Z','leaf','stroke="none"',-.18)+
    p('M47 34H77L88 45V83L77 94H47L36 83V45Z','leaf')+
    line('M38 16L47 34M86 16L77 34M105 35L88 45M105 93L88 83M86 112L77 94M38 112L47 94M19 93L36 83M19 35L36 45','ink',fine)+
    (mini?line('M43 47V68','grass',5):line('M43 77V49L51 41H70','grass',4));
  if(kind==='ruby')return p('M64 16C89 16 108 37 108 64C108 91 89 112 64 112C39 112 20 91 20 64C20 37 39 16 64 16Z','danger','',-.18)+
    p('M64 16L81 38L48 38L20 64Q21 28 64 16Z','danger','stroke="none"')+
    p('M48 38H81L92 66L77 91H48L35 65Z','danger','',-.18)+
    p('M48 39H79L68 53H49L37 63Z','danger','stroke="none"')+
    line('M64 16L48 38M81 38L101 38M108 64L92 66M95 98L77 91M64 112L48 91M25 88L35 65M20 64L48 38','ink',fine)+
    (mini?line('M47 51L54 45','cream',5):shine('M44 56L51 45H66'));
  throw new Error(`Unknown gem ${kind}`);
}

const lit = () => state === 'idle' ? 'energy' : 'coal';
const post = (x,y,h,token='iron') => rect(x,y,12,h,token,6);
const base = () => rect(31,225,194,12,'rock',6)+line('M42 233H214','rock-dark',5);
const foot = body => body+base();
const archWindow = (x,y,w=18,h=28) => p(`M${x} ${y+h}V${y+w/2}Q${x} ${y} ${x+w/2} ${y}Q${x+w} ${y} ${x+w} ${y+w/2}V${y+h}Z`,lit())+line(`M${x+w/2} ${y+5}V${y+h-3}`,'iron',3);

// Small inset gems use fewer facets than the inventory icons.
function jewel(kind,x,y,r) {
  const d=kind==='diamond'?`M${x-r} ${y-r/3}L${x-r/2} ${y-r}H${x+r/2}L${x+r} ${y-r/3}L${x} ${y+r}Z`:
    kind==='emerald'?`M${x-r/2} ${y-r}H${x+r/2}L${x+r*.7} ${y-r*.6}V${y+r*.6}L${x+r/2} ${y+r}H${x-r/2}L${x-r*.7} ${y+r*.6}V${y-r*.6}Z`:
    `M${x} ${y-r}Q${x+r} ${y-r} ${x+r} ${y}Q${x+r} ${y+r} ${x} ${y+r}Q${x-r} ${y+r} ${x-r} ${y}Q${x-r} ${y-r} ${x} ${y-r}Z`;
  // Round interpolated coordinates to the SVG precision used throughout the art.
  const shape=d.replace(/-?\d+(?:\.\d+)?/g,n=>round(Number(n)));
  return p(shape,kind==='diamond'?'snow':kind==='emerald'?'leaf':'danger','stroke-width="3"',kind==='ruby'?-.18:0)+
    line(`M${round(x-r*.4)} ${round(y-r*.4)}L${x} ${round(y-r*.7)}`,'cream',3)+
    line(`M${round(x+r*.4)} ${y}L${x} ${round(y+r*.6)}`,kind==='diamond'?'glacier':kind==='emerald'?'grass':'danger',3);
}

function gemMine(){return foot(
  p('M34 225L37 157Q36 137 51 121L67 85Q76 73 97 83L122 65Q135 60 149 77L180 91L197 125Q218 144 222 176V225Z','rock')+
  p('M157 86L180 91L197 125Q218 144 222 176V225H196L185 159Z','rock-dark','stroke="none"')+
  line('M50 131L67 107L87 114M133 78L145 103L165 112M183 141L201 153L197 175','coal',7)+
  line('M50 131L67 107L87 114','snow',3)+line('M133 78L145 103L165 112','grass',3)+line('M183 141L201 153L197 175','danger',3)+
  jewel('diamond',67,106,11)+jewel('emerald',145,95,14)+jewel('ruby',189,145,12)+
  (state==='off'?'':star(86,92,6)+star(167,117,5))+
  p('M61 225V177Q61 139 100 139Q139 139 139 177V225Z','coal')+
  p('M55 224V176Q55 132 100 132Q145 132 145 176V225','none',`stroke="${paint('ink')}" stroke-width="18"`)+
  p('M55 224V176Q55 132 100 132Q145 132 145 176V225','none',`stroke="${paint('wood')}" stroke-width="10"`)+
  line('M71 226L63 234M123 226L132 234','rock-dark',5)+
  line('M51 147H39V161','iron',4)+rect(32,163,20,28,lit(),6)+rect(31,159,22,7,'iron',3)+line('M42 165V184','cream',3)+
  jewel('emerald',166,186,12)+jewel('ruby',192,183,12)+jewel('diamond',180,175,13)+
  p('M146 190H217L209 216H154Z','iron')+line('M153 198H210','clay',4)+
  circle(159,220,7,'rock-dark')+circle(203,220,7,'rock-dark')+shine('M47 147L56 133'));
}

function crystalPalace(){
  const tower=(x,tip,w,token)=>rect(x,tip+35,w,225-tip-35,'snow',9)+
    p(`M${x-4} ${tip+37}L${x+w/2} ${tip}L${x+w+4} ${tip+37}Z`,token)+
    p(`M${x+w/2} ${tip+3}L${x+w+2} ${tip+35}H${x+w/2}Z`,'glacier','stroke="none"')+
    line(`M${x+w-7} ${tip+43}V219`,'glacier',5)+archWindow(x+8,tip+54,w-16,29);
  return foot(
    tower(35,119,30,'glacier')+tower(191,119,30,'glacier')+
    tower(64,75,39,'science')+tower(153,75,39,'science')+
    rect(78,172,100,53,'glacier',10)+
    rect(108,82,40,143,'snow',8)+p('M101 87L128 45L155 87Z','glacier')+
    p('M128 49L152 85H128Z','science','stroke="none"')+
    line('M139 95V175','glacier',5)+jewel('diamond',128,28,17)+line('M128 46V43','rock-dark',4)+
    group('windows',archWindow(118,105,20,31)+archWindow(83,188,17,24)+archWindow(156,188,17,24))+
    p('M108 225V187L128 166L148 187V225Z','deep-water')+
    p('M117 224V191L128 179L139 191V224Z',lit())+line('M128 183V222','iron',3)+
    group('banner',line('M181 104V56','rock-dark',4)+p('M183 59Q197 52 214 63L207 76L215 88Q197 78 183 87Z','danger')+jewel('emerald',198,68,5))+
    shine('M70 123V148M115 91V98M40 165V180'));
}

function prismDome(){return foot(
  p('M40 199V155Q40 68 128 68Q216 68 216 155V199Z','glacier')+
  p('M177 84Q215 111 216 155V199H197V154Q197 116 177 84Z','science','stroke="none"')+
  rect(95,186,66,15,'rock-dark',6)+ellipse(128,185,33,8,'paper')+
  (state==='off'?'':line('M72 88L110 123','snow',6)+star(66,81,9))+
  group('prism',p('M111 87H145L160 104V166L145 183H111L96 166V104Z','leaf')+
    p('M111 87H145L136 104H119L108 115L96 104Z','grass','stroke="none"')+
    p('M145 87L160 104V166L145 183H111L120 166H137L148 155V115Z','leaf','stroke="none"',-.18)+
    p('M119 104H137L148 115V155L137 166H119L108 155V115Z','leaf')+
    line('M111 87L119 104M145 87L137 104M160 166L148 155M111 183L119 166','ink',3)+shine('M115 127V117L122 110'))+
  // The beam and glass framing are stationary foreground layers around the prism.
  (state==='off'?'':line('M154 137L201 162','danger',5)+
    line('M154 144L198 174','energy',5)+line('M154 151L193 185','science',5))+
  p('M40 155H84M172 155H215','none',`stroke="${paint('snow')}" stroke-width="5"`)+
  shine('M54 134Q57 100 85 88')+rect(35,199,186,27,'rock',11)+
  line('M49 212H87M169 212H207','rock-dark',4)+circle(128,213,6,lit()));
}

function rubyLaser(){return foot(
  p('M46 224L64 190H192L211 224Z','rock-dark')+
  p('M87 211L100 162H156L170 211Z','rock')+line('M63 216L73 203M181 203L192 216','paper',5)+
  p('M96 188V150Q96 121 128 121Q160 121 160 150V188Z','iron')+
  group('barrel',`<g transform="rotate(-62 128 150)">`+
    rect(122,136,105,28,'rock-dark',10)+rect(151,140,66,20,'danger',7)+
    line('M154 143H206','cream',4)+line('M154 159H209','danger',5)+
    [160,184,208].map(x=>rect(x,133,8,34,'rock',4)).join('')+
    p('M221 133H239L236 143H225V157H236L239 167H221Z','paper')+
    ellipse(225,150,5,10,state==='off'?'coal':'danger')+'</g>')+
  circle(128,150,27,'rock-dark')+circle(128,150,21,state==='off'?'coal':'danger')+
  jewel('ruby',128,150,16)+shine('M110 135L116 130')+
  rect(96,190,64,22,'coal',7)+[108,125,142].map(x=>rect(x,196,8,10,state==='off'?'rock-dark':'danger',3,'stroke="none"')).join(''));
}

// Same scaffolding geometry as gen-buildings.mjs; its timber stays warm.
function scaffolding(){return group('scaffolding',post(38,78,159)+post(206,78,159)+rect(30,113,196,12,'sand',5)+rect(30,186,196,12,'sand',5)+
  line('M46 181L207 127M47 202L199 230','iron',5)+post(176,154,83,'sand')+post(196,154,83,'sand')+
  [166,186,206,226].map(y=>line(`M180 ${y}H200`,'iron',4)).join(''));}

for(const kind of ['diamond','emerald','ruby']) {
  emit(`resource.${kind}`,'resources',kind,gem(kind));
  emit(`resource.${kind}.mini`,'resources',`${kind}-mini`,`<g transform="scale(0.5)" stroke-width="8">${gem(kind,true)}</g>`,64,{stroke:4});
}

for(const def of [
  {id:'gem-mine',draw:gemMine,parts:[]},
  {id:'crystal-palace',draw:crystalPalace,parts:['windows','banner']},
  {id:'prism-dome',draw:prismDome,parts:['prism'],pivot:[128,135]},
  {id:'ruby-laser',draw:rubyLaser,parts:['barrel'],pivot:[128,150]},
])for(const mode of ['idle','construction','off']) {
  state=mode;
  let body=def.draw();
  state='idle';
  if(mode==='construction')body=`<g opacity="0.4">${body}</g>${scaffolding()}`;
  const suffix=mode==='idle'?'':'.'+mode,stem=def.id+(mode==='idle'?'':'-'+mode);
  emit(`building.${def.id}${suffix}`,'buildings',stem,body,256,{anchor:[.5,.9375],parts:[...def.parts,...(mode==='construction'?['scaffolding']:[])],
    ...(def.pivot?{partPivots:{[def.parts[0]]:def.pivot}}:{})});
}

write('art/manifest/gems.json',JSON.stringify({assets},null,2)+'\n');
console.log(`Gem art: ${assets.length} ids generated.`);
