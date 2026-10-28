// Original PlanetForge hollow-core buildings, authored as deterministic SVG geometry.
// Run: node scripts/assets/gen-core-buildings.mjs, then assets:gen and assets:check.
import { C, svg, write } from './common.mjs';

// Local helpers and off-state mapping follow gen-buildings / gen-ores / gen-warp-buildings.
let state = 'idle';
const paint = (token, tone = 0) => C(state === 'off' && !['ink', 'coal', 'rock', 'rock-dark', 'snow'].includes(token)
  ? (['cream', 'paper', 'sand'].includes(token) ? 'rock' : 'rock-dark') : token, tone);
const p = (d, token = 'none', extra = '', tone = 0) => `<path d="${d}" fill="${token === 'none' ? 'none' : paint(token, tone)}" ${extra}/>`;
const rect = (x, y, w, h, token, r = 8, extra = '') => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="${paint(token)}" ${extra}/>`;
const circle = (x, y, r, token, extra = '') => `<circle cx="${x}" cy="${y}" r="${r}" fill="${paint(token)}" ${extra}/>`;
const ellipse = (x, y, rx, ry, token, extra = '') => `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="${paint(token)}" ${extra}/>`;
const line = (d, token = 'ink', width = 3) => p(d, 'none', `stroke="${paint(token)}" stroke-width="${width}"`);
const group = (id, body, extra = '') => `<g id="${id}" ${extra}>${body}</g>`;
const shine = d => line(d, 'cream', 4);
const lit = (token = 'energy') => state === 'off' ? 'coal' : token;
const cable = (d, width = 8) => line(d, 'ink', width + 6) + line(d, 'rock-dark', width);
const post = (x, y, h, token = 'iron') => rect(x, y, 12, h, token, 6);
// Stroke edges make the foundation exactly 200 px wide and meet ground y=240.
const base = () => rect(31, 225, 194, 12, 'rock', 6) + line('M42 233H214', 'rock-dark', 5);
function scaffolding() {
  return group('scaffolding', post(38, 78, 159) + post(206, 78, 159) +
    rect(31, 113, 194, 12, 'sand', 5) + rect(31, 186, 194, 12, 'sand', 5) +
    line('M46 181L207 127M47 202L199 230', 'iron', 5) + post(176, 154, 83, 'sand') + post(196, 154, 83, 'sand') +
    [166, 186, 206, 226].map(y => line(`M180 ${y}H200`, 'iron', 4)).join(''));
}

function elevator(open) {
  const y = open ? 157 : 80;
  return line(`M196 56V${y}`, 'coal', 6) +
    rect(177, y, 39, 55, 'coal', 7) +
    rect(182, y + 6, 29, 37, lit('glacier'), 4, 'stroke-width="3"') +
    // A loaded tray and an active lamp make the lowered breakthrough lift visibly in use.
    (open ? p(`M183 ${y + 34}L188 ${y + 25}L194 ${y + 29}L201 ${y + 22}L209 ${y + 34}Z`, 'iron', 'stroke-width="3"') +
      rect(182, y + 34, 29, 10, 'rock-dark', 3, 'stroke-width="3"') : '') +
    line(`M191 ${y + 6}V${y + 43}M202 ${y + 6}V${y + 43}`, 'rock', 4) +
    rect(174, y - 3, 45, 10, 'rock', 4) + rect(174, y + 45, 45, 10, 'rock', 4) +
    circle(210, y + 1, 3, open ? lit('ok') : lit('energy'), 'stroke="none"') +
    shine(`M180 ${y + 1}H191`);
}

function coreDrill(open = false) {
  const bit = rect(88, 103, 44, 26, 'rock-dark', 9) +
    p('M82 128Q110 120 138 128L136 182Q129 211 110 229Q91 211 84 182Z', 'rock') +
    p('M114 130L135 130L133 180Q126 205 111 223L110 184Z', 'rock-dark', 'stroke="none"') +
    [137, 158, 179].map((y, i) => p(`M${81 + i * 3} ${y + 4}L${134 - i * 2} ${y - 8}Q${140 - i * 2} ${y - 8} ${138 - i * 2} ${y + 1}L${89 + i * 3} ${y + 16}Z`, 'snow', 'stroke-width="3"') +
      line(`M${90 + i * 3} ${y + 5}L${129 - i * 2} ${y - 3}`, 'rock', 3)).join('') +
    shine('M94 110H104M96 197L103 208');
  return base() +
    // A broad rectangular headframe, with a separate side lift, unlike either older drill.
    cable('M67 65Q31 68 38 112L43 169', 7) +
    rect(47, 51, 23, 174, 'rock', 8) + rect(150, 51, 23, 174, 'rock-dark', 8) +
    line('M57 70V183', 'snow', 4) + line('M159 75V188', 'rock', 4) +
    line('M70 99L91 79M130 79L150 99M70 198L83 182M136 182L150 198', 'rock-dark', 10) +
    rect(39, 37, 142, 29, 'rock', 9) +
    p('M43 55H177V59Q177 65 169 65H51Q43 65 43 55Z', 'rock-dark', 'stroke="none"') +
    rect(83, 20, 54, 19, 'coal', 8) + line('M93 27H116', 'rock', 4) +
    cable('M168 47H196V57', 6) + circle(196, 48, 10, 'rock', 'stroke-width="3"') +
    circle(196, 48, 3, 'coal', 'stroke="none"') +
    line('M179 66V219M216 66V219', 'rock-dark', 5) +
    rect(88, 67, 44, 31, 'coal', 10) + rect(95, 74, 30, 13, 'rock', 5, 'stroke-width="3"') +
    circle(110, 80, 4, lit('energy'), 'stroke="none"') +
    shine('M49 44H83') + elevator(open) +
    ellipse(110, 220, 42, 13, open ? 'lava' : 'coal') +
    (open ? ellipse(110, 219, 32, 9, 'danger', 'stroke="none"') +
      ellipse(110, 218, 23, 6, 'ascension', 'stroke="none"') +
      ellipse(104, 216, 13, 3, 'energy', 'stroke="none"') +
      line('M88 200L85 194M126 196L130 188M105 190V185', 'ascension', 4) +
      circle(96, 180, 2, 'energy', 'stroke="none"') : '') +
    group('drill', line(open ? 'M110 97V51' : 'M110 97V106', 'coal', 12) +
      `<g${open ? ' transform="translate(0 -53)"' : ''}>${bit}</g>`) +
    // Stationary foreground feet leave the shaft opening visible between them.
    rect(38, 211, 36, 15, 'rock-dark', 6) + rect(146, 211, 31, 15, 'rock-dark', 6) +
    rect(177, 215, 45, 11, 'rock', 5) +
    line('M43 217H62M151 217H164', 'snow', 3);
}

function coreMine() {
  // Low, craggy hot rock and a chamfered blast entrance distinguish the rounded surface mines.
  const rock = p('M34 225L35 147Q34 134 43 121L55 100L57 79Q58 72 68 74L88 81L109 60Q116 54 123 62L144 81L171 77Q180 76 184 86L192 113L214 130Q222 136 221 150L224 225Z', 'lava', '', -.18) +
    p('M58 80L88 88L114 65L132 86L115 105L85 101L64 119L40 144L46 124L58 102Z', 'iron', 'stroke="none"') +
    p('M177 86L189 117L211 134L218 153L221 223H190L179 177L188 150L166 125Z', 'coal', 'stroke="none"') +
    // Solid colored seams convey heat without gradients or resource-forbidden filters.
    line('M72 84L79 99L68 115M139 84L153 105L171 109L166 133M202 145L196 162L206 175', lit('lava'), 8) +
    line('M72 84L79 99L68 115M139 84L153 105L171 109', lit('ascension'), 3) +
    (state === 'off' ? '' : line('M151 104L161 107M76 99L71 109', 'energy', 3)) +
    shine('M63 82L70 85M106 73L115 65');
  const doorway = p('M54 222V140Q54 133 59 128L76 109Q81 104 88 104H123Q130 104 135 111L151 131Q155 136 155 143V222Z', 'coal') +
    p('M67 219V144L86 119H122L141 144V219Z', lit('lava'), 'stroke-width="3"') +
    p('M76 219V146L91 127H119L134 147V219Z', 'space-deep', 'stroke="none"') +
    line('M136 151V212', lit('ascension'), 5) +
    // Thick core-iron beams, with angular shoulder braces and rivets.
    p('M46 222V139Q46 130 52 123L73 99H137L162 128V222H147V140L127 117H83L61 141V222Z', 'coal') +
    line('M54 209V141L80 108H130', 'rock-dark', 6) +
    [ [57,144], [82,108], [132,109], [154,145] ].map(([x,y]) => circle(x,y,3,'rock','stroke="none"')).join('') +
    // Partly open sliding heat-shield door: inset ribs and a central locking wheel.
    p('M66 217V147L86 123H108V217Z', 'rock-dark', 'stroke-width="3"') +
    p('M98 127H107V214H97Z', 'coal', 'stroke="none"') +
    [150,169,188].map(y => line(`M74 ${y}H96`, 'coal', 6) + line(`M74 ${y-2}H92`, 'rock', 2)).join('') +
    circle(88,184,8,'coal','stroke-width="3"') + line('M88 179V189M83 184H93','rock',3) +
    shine('M74 142L87 130') +
    p('M172 215L180 149L194 154L211 222H191L185 191L182 222Z','coal') +
    line('M183 160L194 206','rock-dark',5);
  const rails = [218,226,233].map(y => line(`M104 ${y}H215`,'coal',4)).join('') +
    line('M103 216L96 235M191 216L218 235','rock',5);
  const cart = group('cart',
    p('M151 199L154 184L166 173L179 184L190 169L205 181L211 200Z',lit('lava'),'stroke-width="3"') +
    p('M156 188L166 177L176 186L169 199H155ZM179 187L191 174L201 183L197 197H180Z',lit('ascension'),'stroke="none"') +
    line('M161 187L166 182M186 185L191 180',lit('energy'),4) +
    p('M146 197H216L209 218H154Z','rock-dark') +
    rect(144,195,74,10,'coal',4,'stroke-width="3"') +
    line('M156 209H203','rock',4) +
    circle(160,222,7,'coal','stroke-width="3"') + circle(202,222,7,'coal','stroke-width="3"') +
    circle(160,222,2,'rock','stroke="none"') + circle(202,222,2,'rock','stroke="none"'));
  return base() + rock + doorway + rails + cart;
}

function supportPillar() {
  // An exposed bearing cap ends in transparent space: no cave ceiling or roof is baked in.
  return base() +
    p('M98 42H158Q163 42 163 50V215Q163 223 155 223H101Q93 223 93 215V50Q93 42 98 42Z','rock') +
    p('M145 45H158Q160 45 160 51V214Q160 220 153 220H142Z','rock-dark','stroke="none"') +
    // Large masonry blocks retain a readable stone face at phone size.
    line('M96 87H144M96 143H144M96 195H144','rock-dark',4) +
    line('M121 45V84M116 146V192','rock-dark',3) +
    shine('M101 55V72M101 153V173') +
    rect(86,99,84,20,'coal',7) + rect(86,181,84,17,'coal',6) +
    line('M94 105H145M95 186H144','rock-dark',4) +
    // Four broad feet and splayed braces take the load into the 200 px foundation.
    p('M44 210L88 122Q91 117 96 120L105 126L62 222Z','coal') +
    p('M212 210L168 122Q165 117 160 120L151 126L194 222Z','coal') +
    line('M54 208L94 130M202 208L162 130','rock-dark',7) +
    line('M59 191L83 143','rock',3) +
    rect(39,211,38,15,'rock-dark',6) + rect(179,211,38,15,'rock-dark',6) +
    rect(84,211,88,15,'coal',6) + line('M94 217H143','rock-dark',4) +
    rect(81,40,94,15,'rock-dark',6) + rect(70,24,116,20,'rock',7) +
    p('M73 35H183V37Q183 43 176 43H80Q73 43 73 35Z','rock-dark','stroke="none"') +
    shine('M81 30H112') +
    // Safety lamp is mounted high on the front face, rather than atop a fictitious ceiling.
    rect(110,59,36,25,'coal',8) + rect(117,65,22,12,lit('ok'),5,'stroke-width="3"') +
    (state==='off'?'':line('M121 68H130','snow',3)) +
    [[96,109],[160,109],[95,189],[161,189]].map(([x,y])=>circle(x,y,3,'rock','stroke="none"')).join('');
}

const buildings = [
  { id: 'core-drill', draw: () => coreDrill(), parts: ['drill'], partPivots: { drill: [110, 170] } },
  { id: 'core-mine', draw: coreMine, parts: ['cart'], partPivots: { cart: [180, 211] } },
  { id: 'support-pillar', draw: supportPillar, parts: [] },
];
const assets = [];
function emit(def, mode = 'idle') {
  state = mode === 'off' ? 'off' : 'idle';
  const body = def.draw();
  state = 'idle';
  const content = mode === 'construction' ? `<g opacity="0.4">${body}</g>${scaffolding()}` : body;
  const stem = `${def.id}${mode === 'idle' ? '' : '-' + mode}`;
  const src = `art/src/buildings/${stem}.svg`;
  write(src, svg(content, 256));
  assets.push({ id: `building.${def.id}${mode === 'idle' ? '' : '.' + mode}`, category: 'buildings', src,
    out: `public/assets/sprites/buildings/${stem}.png`, viewBox: [256, 256], anchor: [.5, .9375], frames: 1,
    parts: [...(def.parts ?? []), ...(mode === 'construction' ? ['scaffolding'] : [])],
    ...(def.partPivots ? { partPivots: def.partPivots } : {}), tags: ['core-buildings', def.id, mode], phase: 'P1' });
}
for (const def of buildings) for (const mode of ['idle', 'construction', 'off']) emit(def, mode);
emit({ id: 'core-drill', draw: () => coreDrill(true), parts: ['drill'], partPivots: { drill: [110, 117] } }, 'open');
write('art/manifest/core-buildings.json', JSON.stringify({ assets }, null, 2) + '\n');
console.log(`Core building art: ${assets.length} ids generated.`);
