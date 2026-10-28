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

const buildings = [
  { id: 'core-drill', draw: () => coreDrill(), parts: ['drill'], partPivots: { drill: [110, 170] } },
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
