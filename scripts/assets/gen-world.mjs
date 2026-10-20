import { C, svg, round, write } from './common.mjs';

// All geometry is in reference pixels; no random input or external artwork.
const assets = [];
const sizes = [12, 16, 24, 32];
const biomes = ['forest', 'mountains', 'ocean', 'swamp', 'savanna', 'desert', 'tundra', 'crystal'];
const ground = { forest: 'grass', mountains: 'rock', ocean: 'water', swamp: 'moss', savanna: 'savanna', desert: 'sand', tundra: 'snow', crystal: 'crystal' };
const path = (d, fill = 'none', extra = '') => `<path d="${d}" fill="${fill}" ${extra}/>`;
const circle = (x, y, r, fill, extra = '') => `<circle cx="${round(x)}" cy="${round(y)}" r="${round(r)}" fill="${fill}" ${extra}/>`;
const ellipse = (x, y, rx, ry, fill, extra = '') => `<ellipse cx="${round(x)}" cy="${round(y)}" rx="${round(rx)}" ry="${round(ry)}" fill="${fill}" ${extra}/>`;
const group = (id, body, extra = '') => `<g id="${id}" ${extra}>${body}</g>`;
function add(id, category, name, body, w = 128, h = w, phase = 'P0', anchor = [.5, .5], parts = [], tags = []) {
  const src = `art/src/${category}/${name}.svg`;
  write(src, svg(body, w, h));
  assets.push({ id, category, src, out: `public/assets/sprites/${category}/${name}.png`, viewBox: [w, h], anchor, frames: 1, parts, tags, phase });
}
const point = (r, a) => `${round(512 + r * Math.sin(a))} ${round(512 - r * Math.cos(a))}`;
function sector(inner, outer, start, end) {
  return `M ${point(outer, start)} A ${outer} ${outer} 0 0 1 ${point(outer, end)} L ${point(inner, end)} A ${inner} ${inner} 0 0 0 ${point(inner, start)} Z`;
}
const arc = (r, start, end) => `M ${point(r, start)} A ${r} ${r} 0 0 1 ${point(r, end)}`;

// An opaque half-open sector plus 2px of outward feathering. Adjacent copies
// cover the feather with an opaque core: identical biomes never lose opacity.
// Six flat-alpha strips soften mixed-biome joins without terrain gradients.
function edgeMask(segments) {
  const half = Math.PI / segments;
  let strips = path(sector(398, 462, -half, half), C('tint-white'), 'stroke="none"');
  for (let i = 0; i < 6; i++) {
    const a = half + (i / 3) / 400, b = half + ((i + 1) / 3) / 400;
    for (const side of [-1, 1]) strips += path(sector(398, 462, side < 0 ? -b : a, side < 0 ? -a : b), C('tint-white'), `stroke="none" opacity="${round((6 - i) / 7)}"`);
  }
  return `<mask id="edge" maskUnits="userSpaceOnUse" x="0" y="0" width="1024" height="1024">${strips}</mask>`;
}

export function wedge(biome, segments) {
  const half = Math.PI / segments, a = half + 2 / 400, token = ground[biome];
  let body = path(sector(398, 462, -a, a), C(token), 'stroke="none"');
  body += path(sector(398, 411, -a, a), C(token, -.18), 'stroke="none"');
  body += path(sector(451, 462, -a, a), C(token, .18), 'stroke="none"');
  // Marks remain inside the wedge, leaving continuous undisturbed edge bands.
  for (let i = -1; i <= 1; i++) {
    const angle = i * half * .56, x = round(512 + 435 * Math.sin(angle)), y = round(512 - 435 * Math.cos(angle));
    let mark = '';
    if (biome === 'forest' || biome === 'savanna') mark = path('M -9 2 Q -5 -5 0 2 Q 4 -6 8 0', 'none', `stroke="${C(token, -.18)}" stroke-width="3"`);
    if (biome === 'mountains') mark = path('M -10 4 Q -8 0 -3 -5 Q 0 -9 3 -4 L 11 4 Z', C('rock-dark'), 'stroke="none"') + path('M -4 -4 L 0 -7 L 4 -3', 'none', `stroke="${C('rock', .18)}" stroke-width="3"`);
    if (biome === 'ocean') mark = path('M -11 0 Q -6 5 0 0 Q 6 -5 11 0', 'none', `stroke="${C('snow')}" stroke-width="3"`);
    if (biome === 'swamp') mark = ellipse(0, 0, 11, 4, C('deep-water'), 'stroke="none" opacity="0.6"') + path('M -5 -1 Q 0 -3 5 -1', 'none', `stroke="${C('water')}" stroke-width="2"`);
    if (biome === 'desert') mark = path('M -12 4 Q -2 -4 11 1 M -4 9 L 5 8', 'none', `stroke="${C('sand', -.18)}" stroke-width="3"`);
    if (biome === 'tundra') mark = path('M -10 1 Q 0 -5 10 1 M -4 5 L 4 5', 'none', `stroke="${C('snow', -.18)}" stroke-width="3"`);
    if (biome === 'crystal') mark = path('M -6 5 L -3 -5 Q 0 -8 2 -4 L 6 4 Z', C('crystal', .18), `stroke="${C('crystal', -.18)}" stroke-width="2"`);
    body += `<g transform="translate(${x} ${y}) rotate(${round(angle * 180 / Math.PI)})">${mark}</g>`;
  }
  return `<defs>${edgeMask(segments)}</defs>${group('ground', body, 'mask="url(#edge)"')}`;
}

// Each biome exports one reusable north-facing sector per planet size.
for (const biome of biomes) for (const n of sizes) {
  add(`biome.${biome}.wedge.${n}`, 'biomes', `${biome}-wedge-${n}`, wedge(biome, n), 1024, 1024, 'P0', [.5, .5], ['ground'], [biome, 'wedge', `segments-${n}`]);
}
write('art/manifest/world.json', JSON.stringify({ assets }, null, 2) + '\n');
console.log(`World: ${assets.length} SVG masters generated.`);
