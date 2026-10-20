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

const shadow = () => ellipse(64, 116, 40, 4, C('ink'), 'stroke="none" opacity="0.2"');
const trunk = (x = 64, top = 57, width = 16) => path(`M ${x - width / 2} 118.5 L ${x - width / 2 + 2} ${top} Q ${x} ${top - 5} ${x + width / 2 - 2} ${top} L ${x + width / 2} 118.5 Z`, C('clay')) + path(`M ${x + 2} ${top + 8} L ${x + 3} 115`, 'none', `stroke="${C('clay', -.18)}"`);
function treetop(x, y, rx, ry, token = 'leaf') {
  return ellipse(x, y, rx, ry, C(token)) + path(`M ${x + rx - 2} ${y - 3} Q ${x + rx + 2} ${y + ry} ${x} ${y + ry - 1} Q ${x + rx / 2} ${y + ry / 2} ${x + rx - 2} ${y - 3}`, C(token, -.18), 'stroke="none"') + ellipse(x - rx * .3, y - ry * .35, rx * .36, ry * .2, C(token, .18), 'stroke="none"');
}
function crystal(x, base, height, width) {
  return path(`M ${x - width / 2} ${base - 6} L ${x - width / 2} ${base - height + 14} Q ${x - width / 2} ${base - height + 10} ${x} ${base - height} L ${x + width / 2} ${base - height + 15} L ${x + width / 2} ${base - 6} L ${x} ${base} Z`, C('crystal')) + path(`M ${x} ${base - height + 3} L ${x} ${base - 3} L ${x + width / 2 - 2} ${base - 7} L ${x + width / 2 - 2} ${base - height + 16} Z`, C('crystal', -.18), 'stroke="none"') + path(`M ${x - width / 2 + 5} ${base - height + 19} L ${x - width / 2 + 5} ${base - 16}`, 'none', `stroke="${C('crystal', .18)}"`);
}
function prop(biome, variant) {
  let b = shadow();
  if (biome === 'forest') {
    b += trunk(64, 56);
    if (variant === 0) b += treetop(64, 55, 39, 39);
    if (variant === 1) b += treetop(45, 65, 26, 27) + treetop(83, 62, 25, 28) + treetop(62, 38, 27, 27, 'grass');
    if (variant === 2) b += treetop(64, 49, 30, 39, 'moss') + treetop(65, 76, 39, 23, 'leaf') + circle(48, 70, 4, C('clay')) + circle(78, 58, 4, C('clay'));
  }
  if (biome === 'mountains') {
    const top = [20, 33, 14][variant];
    b += path(`M 16 118.5 Q 10 116 17 103 L 50 ${top + 10} Q 61 ${top - 9} 73 ${top + 8} L 112 104 Q 120 118.5 109 118.5 Z`, C('rock'));
    b += path(`M 63 ${top + 4} L 109 115 L 70 115 L 54 80 L 69 67 Z`, C('rock-dark'), 'stroke="none"');
    if (variant === 0) b += path('M 36 59 L 50 30 Q 61 11 73 28 L 88 58 Q 76 63 70 51 Q 61 66 54 53 Q 46 64 36 59 Z', C('snow'), 'stroke-width="2"');
    if (variant === 1) b += path('M 21 116 L 30 82 Q 37 68 45 84 L 57 117 Z', C('rock', .18));
    if (variant === 2) b += path('M 72 118 L 89 79 Q 96 66 103 80 L 116 110 Q 119 118 112 118 Z', C('rock-dark'));
    b += path('M 33 99 L 42 79 M 80 103 L 87 111', 'none', `stroke="${C('rock', .18)}"`);
  }
  if (biome === 'ocean' && variant < 2) {
    const high = variant === 0;
    b += path(high ? 'M 15 115 Q 32 116 43 91 Q 54 69 76 80 Q 57 80 62 96 Q 65 110 104 109 Q 119 110 110 118.5 L 22 118.5 Z' : 'M 14 115 Q 28 95 47 103 Q 58 108 69 96 Q 84 80 102 98 Q 82 92 85 106 Q 92 114 113 113 L 111 118.5 L 20 118.5 Z', C('water'));
    b += path(high ? 'M 42 94 Q 51 75 72 80 M 76 112 Q 91 116 104 112' : 'M 23 110 Q 34 102 46 107 M 68 103 Q 79 89 96 96', 'none', `stroke="${C('snow')}" stroke-width="3"`);
  }
  if (biome === 'ocean' && variant === 2) {
    b += ellipse(64, 114, 39, 4.5, C('water'), 'stroke="none"') + path('M 64 96 L 64 43', 'none', 'stroke-width="4"');
    b += path('M 64 43 Q 83 39 88 52 Q 78 62 64 55 Z', C('ascension'));
    b += path('M 42 106 L 49 87 Q 64 81 79 87 L 86 106 Q 64 122 42 106 Z', C('clay')) + path('M 46 99 Q 64 108 82 99 L 85 106 Q 64 120 43 106 Z', C('cream'));
    b += ellipse(64, 88, 15, 5, C('clay', .18));
  }
  if (biome === 'swamp' && variant < 2) {
    b += path('M 63 118 Q 42 104 35 82 Q 54 87 61 103 M 67 118 Q 82 88 99 82 Q 91 109 72 118', C('moss'));
    for (let i = 0; i < 3; i++) {
      const x = 42 + i * 20, y = 34 + ((i + variant) % 3) * 12;
      b += path(`M ${64 + (i - 1) * 8} 118 Q ${x} 91 ${x} ${y + 8}`, 'none', `stroke="${C('moss', -.18)}"`);
      b += `<rect x="${x - 4}" y="${y}" width="8" height="27" rx="4" fill="${C('clay')}"/>`;
      b += path(`M ${x - 1} ${y + 5} L ${x - 1} ${y + 12}`, 'none', `stroke="${C('sand')}" stroke-width="2"`);
    }
  }
  if (biome === 'swamp' && variant === 2) {
    b += path('M 52 118.5 Q 57 96 51 76 L 77 76 Q 70 98 80 118.5 Z', C('cream'));
    b += path('M 68 80 L 76 80 Q 73 104 80 117 L 67 117 Z', C('paper'), 'stroke="none"');
    b += path('M 21 78 Q 22 44 54 38 Q 86 29 107 77 Q 111 84 103 87 Q 66 100 27 87 Q 19 85 21 78 Z', C('crystal'));
    b += path('M 25 84 Q 63 91 105 80 Q 106 88 68 93 Q 39 94 25 87 Z', C('crystal', -.18), 'stroke="none"');
    b += ellipse(47, 57, 10, 7, C('cream'), 'stroke="none"') + ellipse(78, 63, 7, 5, C('cream'), 'stroke="none"');
  }
  return group('prop', b);
}
const propNames = {
  forest: ['tree-a', 'tree-b', 'tree-c'], mountains: ['peak-a', 'peak-b', 'peak-c'], ocean: ['wave-a', 'wave-b', 'buoy'], swamp: ['reed-a', 'reed-b', 'mushroom'],
};

// Each biome exports one reusable north-facing sector per planet size.
for (const biome of biomes) for (const n of sizes) {
  add(`biome.${biome}.wedge.${n}`, 'biomes', `${biome}-wedge-${n}`, wedge(biome, n), 1024, 1024, 'P0', [.5, .5], ['ground'], [biome, 'wedge', `segments-${n}`]);
}
for (const [biome, names] of Object.entries(propNames)) names.forEach((name, i) => {
  add(`biome.${biome}.prop.${name}`, 'biomes', `${biome}-${name}`, prop(biome, i), 128, 128, 'P0', [.5, .9375], ['prop'], [biome, 'prop']);
});
write('art/manifest/world.json', JSON.stringify({ assets }, null, 2) + '\n');
console.log(`World: ${assets.length} SVG masters generated.`);
