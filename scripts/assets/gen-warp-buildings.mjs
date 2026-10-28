// Original late-game toy buildings. Run before assets:gen (which splits parts and merges fragments):
// node scripts/assets/gen-warp-buildings.mjs
// npm --prefix scripts/assets run assets:gen
// npm --prefix scripts/assets run assets:check
import { C, svg, write } from './common.mjs';

// Local copies of the building/weapons helpers keep the shared generators untouched.
let state='idle';
const paint=(token,tone=0)=>C(state==='off'&&!['ink','coal','rock','rock-dark','snow'].includes(token)
  ?(['cream','paper','sand'].includes(token)?'rock':'rock-dark'):token,tone);
const path=(d,token='none',extra='',tone=0)=>`<path d="${d}" fill="${token==='none'?'none':paint(token,tone)}" ${extra}/>`;
const rect=(x,y,w,h,token,r=8,extra='')=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="${paint(token)}" ${extra}/>`;
const circle=(x,y,r,token,extra='')=>`<circle cx="${x}" cy="${y}" r="${r}" fill="${token==='none'?'none':paint(token)}" ${extra}/>`;
const ellipse=(x,y,rx,ry,token,extra='')=>`<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="${paint(token)}" ${extra}/>`;
const group=(id,body)=>`<g id="${id}">${body}</g>`;
const line=(d,token='ink',width=3,extra='')=>path(d,'none',`stroke="${paint(token)}" stroke-width="${width}" ${extra}`);
const glint=d=>line(d,'cream',4);
const lit=(token='science')=>state==='idle'?token:'coal';
const pipe=(d,token='rock',width=10)=>line(d,'ink',width+6)+line(d,token,width);
const post=(x,y,h,token='iron')=>rect(x,y,12,h,token,6);
// 194 + the 6 px outline = exactly 200 px; bottom outline meets y=240.
const base=()=>rect(31,225,194,12,'rock',6)+line('M42 233H214','rock-dark',5);
function scaffolding(){return group('scaffolding',post(38,78,159)+post(206,78,159)+rect(31,113,194,12,'sand',5)+rect(31,186,194,12,'sand',5)+
  line('M46 181L207 127M47 202L199 230','iron',5)+post(176,154,83,'sand')+post(196,154,83,'sand')+
  [166,186,206,226].map(y=>line(`M180 ${y}H200`,'iron',4)).join(''));}

function warpgate(){
  // The entire portal is a self-contained layer; the stationary ring masks its edge.
  const portal=circle(128,114,62,lit('deep-water'))+(state==='idle'?
    path('M78 84C111 45 184 68 185 114C181 152 142 167 114 145C88 124 107 93 134 96C153 99 156 119 143 128C158 105 127 103 123 119C119 139 154 147 167 125C187 91 130 64 98 91Z','oil-sheen','stroke="none"')+
    line('M79 123C73 86 115 64 148 80C180 96 163 137 139 136C119 135 113 117 128 110','crystal',9)+
    line('M84 139C103 166 153 168 175 134M92 85L105 79M155 91L165 102','science',5)+
    line('M88 108L101 105M149 146L162 140M133 84L139 87M103 137L108 140','snow',3)+
    circle(141,109,3,'snow','stroke="none"'): '');
  return base()+rect(37,207,182,18,'rock-dark',8)+rect(43,195,170,17,'paper',8)+
    path('M53 199L65 158H87L91 199ZM165 199L169 158H191L203 199Z','rock')+
    line('M69 188L74 174M180 187L184 175','paper',5)+
    group('portal',portal)+
    circle(128,114,74,'none',`stroke="${paint('ink')}" stroke-width="30"`)+
    circle(128,114,74,'none',`stroke="${paint('paper')}" stroke-width="24"`)+
    line('M199 99A74 74 0 0 1 115 187','rock',7)+
    glint('M63 93A69 69 0 0 1 102 50')+
    [0,60,120,180,240,300].map(a=>`<g transform="rotate(${a} 128 114)">`+
      rect(115,21,26,36,'rock-dark',9)+rect(120,26,16,25,lit('science'),6,'stroke-width="3"')+
      line('M123 33H133M123 43H133',state==='idle'?'snow':'rock-dark',3)+'</g>').join('')+
    rect(104,199,48,13,'paper',6)+rect(95,211,66,13,'paper',6)+rect(85,224,86,13,'paper',6)+
    glint('M111 203H144M102 215H154M94 228H163');
}

function exoDrill(){
  // A slim parallel-rail mast, rather than the deep drill's wide triangular derrick.
  const crane=pipe('M179 86H207V105','rock',6)+
    rect(161,77,48,23,'paper',11)+ellipse(173,104,11,5,lit('ok'),'stroke-width="3"')+
    ellipse(201,104,11,5,lit('ok'),'stroke-width="3"')+glint('M169 83H185')+
    line('M190 101V135','rock-dark',4)+circle(190,137,6,'rock','stroke-width="3"')+
    line('M185 141L177 151L181 158M195 141L203 151L199 158','ink',6)+
    (state==='idle'?line('M165 115H179M195 115H207','ok',3):'');
  const crates=[151,177,203].map(x=>rect(x,208,22,17,'sand',6)+line(`M${x+5} 219H${x+17}`,'iron',3)).join('');
  return base()+rect(66,213,82,12,'rock-dark',6)+
    rect(80,56,14,157,'rock',7)+rect(130,56,14,157,'rock-dark',7)+
    line('M86 78V188','paper',4)+line('M137 89V182','rock',3)+
    rect(95,65,34,78,'paper',14)+line('M120 81V125','rock',6)+
    rect(75,31,74,37,'paper',15)+path('M135 36Q146 38 145 52V59H130Z','rock','stroke="none"')+
    rect(91,24,42,16,'rock-dark',8)+rect(96,29,32,6,lit('ok'),3,'stroke="none"')+
    rect(96,84,32,18,'rock-dark',8)+circle(112,93,5,lit('crystal'),'stroke="none"')+
    glint('M84 42H102')+pipe('M79 60Q58 70 62 113Q63 129 82 131','oil-sheen',6)+
    (state==='idle'?line('M67 75Q61 93 67 110','ok',3):'')+
    crane+line('M112 137V158','coal',12)+
    ellipse(112,232,31,5,'coal','stroke="none"')+
    group('drill',
      rect(96,145,32,24,'rock-dark',10)+
      path('M97 167H127V204Q124 220 112 236Q100 220 97 204Z',lit('crystal'))+
      path('M113 170H125V203L113 229Z',lit('danger'),'stroke="none"')+
      [170,189,208].map((y,i)=>path(`M${94+i*4} ${y+2}L${127-i*2} ${y-7}Q${133-i*2} ${y-6} ${132-i*2} ${y+2}L${100+i*3} ${y+12}Z`,lit(i===1?'danger':'ok'),'stroke-width="3"')+
        line(`M${101+i*3} ${y+3}L${124-i*2} ${y-3}`,state==='idle'?'snow':'rock',3)).join('')+
      rect(102,151,20,8,lit('ok'),4,'stroke="none"'))+
    // Open bins expose three resource silhouettes: capsule, cube and crystal.
    rect(155,186,14,27,'danger',7,'stroke-width="3"')+
    rect(155,192,14,14,'crystal',5,'stroke="none" opacity="0.5"')+
    line('M159 190V198','snow',3)+line('M156 205H168','oil-sheen',3)+
    path('M179 194L188 189L198 194V209L188 214L179 209Z','space-deep','stroke-width="3"')+
    path('M179 194L188 189L198 194L188 199Z','deep-water','stroke="none"',-.18)+
    line('M180 195L188 199V211','snow',2)+
    (state==='idle'?ellipse(214,201,11,16,'crystal','stroke="none" opacity="0.3"'):'')+
    path('M214 184L222 196L219 210L212 214L207 200Z','ok','stroke-width="3"')+
    line('M214 189L212 201L214 208','snow',2)+crates+
    path('M80 234L86 227L94 230M130 231L137 227L143 234','rock','stroke-width="3"');
}

function antimatterReactor(){
  // A glass vessel above a low drum; stationary clamps remain in front of the core layer.
  const sphere=circle(128,94,61,'glacier')+
    path('M173 55Q200 104 161 141Q126 166 87 132Q131 148 158 117Q178 93 173 55Z','science','stroke="none"')+
    (state==='idle'?
      circle(128,94,40,'crystal','stroke="none" opacity="0.3"')+
      path('M107 61C143 46 170 75 162 104C155 134 122 137 105 117C91 98 104 77 122 79C142 81 146 101 133 109C144 86 116 85 114 103C114 119 141 122 149 102C157 82 139 65 119 69Z','danger','stroke="none"')+
      path('M107 61C143 46 170 75 162 104C155 134 122 137 105 117C91 98 104 77 122 79C142 81 146 101 133 109C144 86 116 85 114 103C114 119 141 122 149 102C157 82 139 65 119 69Z','crystal','stroke="none" opacity="0.5"')+
      line('M121 64C148 59 162 82 155 101M108 100Q109 118 127 120','danger',5)+
      line('M119 68Q133 63 144 76M114 108Q117 115 124 115','snow',4)+
      circle(130,96,7,'danger','stroke="none"')+circle(127,93,3,'snow','stroke="none"'):
      circle(128,94,24,'coal')+line('M114 101Q120 114 134 107','rock-dark',4))+
    line('M81 81Q85 55 111 48','tint-white',6)+circle(79,94,3,'snow','stroke="none"');
  return base()+
    // Heavy power leads terminate on the foundation inside the 200 px footprint.
    pipe('M74 175Q40 164 40 191V211Q40 220 55 220H75','oil-sheen',12)+
    pipe('M182 175Q215 168 215 192V214Q215 222 200 222H180','rock-dark',12)+
    line('M40 191V205',lit('crystal'),5)+line('M215 193V205',lit('danger'),5)+
    rect(50,214,26,12,'rock',5)+rect(181,216,26,10,'rock',5)+
    path('M54 174Q54 153 128 153Q202 153 202 174V204Q202 228 128 228Q54 228 54 204Z','paper')+
    path('M181 177V204Q172 218 132 219','none',`stroke="${paint('rock')}" stroke-width="12"`)+
    ellipse(128,174,74,20,'rock-dark')+ellipse(128,167,57,16,'rock')+
    rect(105,144,46,28,'rock-dark',10)+
    path('M68 72L57 54Q53 47 60 42L70 35Q76 31 82 39L94 58Z','rock')+
    path('M162 58L174 39Q180 31 186 35L196 42Q203 47 199 54L188 72Z','rock-dark')+
    glint('M63 48L72 42')+
    group('core',sphere)+
    // Broad curved magnetic jaws embrace the glass, with small lit contact pads.
    path('M89 157Q57 147 55 113Q54 103 64 102H75Q83 103 83 113Q85 132 101 136Z','paper')+
    path('M167 157Q199 147 201 113Q202 103 192 102H181Q173 103 173 113Q171 132 155 136Z','rock')+
    rect(58,101,25,19,'rock-dark',8)+rect(173,101,25,19,'rock-dark',8)+
    line('M64 108H77',lit('crystal'),5)+line('M179 108H192',lit('danger'),5)+
    glint('M65 127Q69 140 83 145')+
    rect(91,153,74,20,'rock-dark',10)+rect(105,158,46,8,lit('crystal'),4,'stroke="none"')+
    rect(107,188,42,34,'rock-dark',11)+circle(128,204,9,lit('danger'),'stroke-width="3"')+
    line('M69 189V202M81 191V207M175 191V207M187 189V202','rock-dark',4)+
    glint('M63 179V185');
}

const definitions=[
  {id:'warpgate',draw:warpgate,part:'portal',pivot:[128,114],tags:['travel','unique']},
  {id:'exo-drill',draw:exoDrill,part:'drill',pivot:[112,181],tags:['mining','exotic-resources']},
  {id:'power-antimatter',draw:antimatterReactor,part:'core',pivot:[128,94],tags:['power','antimatter']},
];
const assets=[];
for(const def of definitions)for(const mode of ['idle','construction','off']){
  state=mode;
  let body=def.draw();
  state='idle';
  if(mode==='construction')body=`<g opacity="0.4">${body}</g>${scaffolding()}`;
  const stem=def.id+(mode==='idle'?'':`-${mode}`),src=`art/src/buildings/${stem}.svg`;
  write(src,svg(body,256));
  assets.push({id:`building.${def.id}${mode==='idle'?'':'.'+mode}`,category:'buildings',src,
    out:`public/assets/sprites/buildings/${stem}.png`,viewBox:[256,256],anchor:[.5,.9375],frames:1,
    parts:[def.part,...(mode==='construction'?['scaffolding']:[])],partPivots:{[def.part]:def.pivot},
    tags:['warp',def.id,'ascension-10',...def.tags,mode],phase:'P1'});
}
write('art/manifest/warp-buildings.json',JSON.stringify({assets},null,2)+'\n');
console.log(`Warp buildings: ${definitions.length} buildings / ${assets.length} ids.`);
