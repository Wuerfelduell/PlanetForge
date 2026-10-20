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
  if (biome === 'savanna' && variant < 2) {
    b += trunk(64, 84, 10);
    b += treetop(43, 91, 24, 24, 'moss') + treetop(83, 90, 25, 26, 'leaf') + treetop(61, variant ? 70 : 79, 26, 25, 'grass');
    for (const [x, y] of [[39, 91], [50, 95], [65, 78], [78, 94], [88, 91]]) {
      b += circle(x, y, 5, C(variant ? 'ascension' : 'clay')) + circle(x - 1, y - 2, 1.5, C('sand'), 'stroke="none"');
    }
  }
  if (biome === 'savanna' && variant === 2) {
    b += path('M 54 118.5 L 59 79 L 39 60 L 47 56 L 66 72 L 79 51 L 86 56 L 70 81 L 73 118.5 Z', C('clay'));
    b += treetop(40, 48, 25, 17, 'moss') + treetop(85, 43, 29, 19, 'moss') + treetop(61, 35, 29, 19, 'grass');
  }
  if (biome === 'desert' && variant < 2) {
    const s = variant ? 12 : 0;
    b += path(`M 54 118.5 L 54 83 L 38 83 Q 27 83 27 71 L 27 ${55 + s} Q 27 ${43 + s} 39 ${47 + s} Q 43 ${49 + s} 43 ${55 + s} L 43 68 L 54 68 L 54 39 Q 54 22 66 22 Q 79 22 79 39 L 79 82 L 89 82 L 89 65 Q 89 55 99 56 Q 107 57 107 67 L 107 88 Q 107 99 94 99 L 79 99 L 79 118.5 Z`, C('leaf'));
    b += path('M 70 40 L 70 113 M 35 56 L 35 70 M 98 68 L 98 86', 'none', `stroke="${C('leaf', .18)}" stroke-width="3"`);
    b += path('M 58 45 L 53 43 M 81 58 L 76 60 M 81 105 L 76 103', 'none', `stroke="${C('cream')}" stroke-width="2"`);
    if (variant) b += circle(63, 25, 6, C('danger')) + circle(71, 25, 6, C('danger')) + circle(67, 21, 6, C('danger')) + circle(67, 27, 3, C('energy'), 'stroke="none"');
  }
  if (biome === 'desert' && variant === 2) {
    b += path('M 13 115 Q 25 107 44 90 Q 65 71 82 86 Q 99 104 114 112 Q 120 118.5 109 118.5 L 20 118.5 Q 10 118 13 115 Z', C('sand'));
    b += path('M 70 83 Q 73 102 107 116 L 52 116 Q 60 100 70 83 Z', C('sand', -.18), 'stroke="none"');
    b += path('M 29 109 Q 49 90 61 89', 'none', `stroke="${C('sand', .18)}" stroke-width="4"`);
  }
  if (biome === 'tundra' && variant < 2) {
    b += trunk(64, 79, 12);
    const wide = variant ? 6 : 0;
    b += path(`M ${24 - wide} 103 Q 43 81 42 79 L 32 79 Q 49 59 49 55 L 42 55 Q 59 34 60 23 Q 64 13 68 23 Q 72 40 86 55 L 79 55 Q 84 69 96 79 L 86 79 Q 92 91 ${104 + wide} 103 Q 64 117 ${24 - wide} 103 Z`, C('leaf'));
    b += path('M 42 55 Q 59 34 60 23 Q 64 13 68 23 Q 72 40 86 55 Q 76 62 67 53 Q 56 64 42 55 Z', C('snow'));
    b += path('M 32 79 L 42 66 Q 64 76 86 65 L 96 79 Q 80 90 65 79 Q 49 89 32 79 Z', C('snow'));
    b += path(`M ${24 - wide} 103 L ${33 - wide} 92 Q 63 106 ${96 + wide} 92 L ${104 + wide} 103 Q 64 117 ${24 - wide} 103 Z`, C('snow'));
  }
  if (biome === 'tundra' && variant === 2) {
    b += path('M 22 118.5 Q 14 115 19 101 L 32 77 Q 35 70 45 68 L 72 62 Q 82 61 89 71 L 111 102 Q 120 118.5 105 118.5 Z', C('snow'));
    b += path('M 73 65 L 70 94 L 107 115 L 62 115 L 49 94 Z', C('snow', -.18), 'stroke="none"');
    b += path('M 36 83 L 46 77 L 58 76 M 26 107 L 30 96', 'none', `stroke="${C('tint-white')}" stroke-width="4"`);
  }
  if (biome === 'crystal') {
    b += ellipse(64, 111, 41, 7, C('crystal'), 'stroke="none" opacity="0.2"');
    if (variant === 0) b += crystal(42, 116, 48, 24) + crystal(78, 116, 60, 27) + crystal(62, 116, 91, 30);
    if (variant === 1) b += crystal(41, 116, 70, 26) + crystal(83, 116, 44, 31) + crystal(63, 116, 57, 27);
    if (variant === 2) b += crystal(62, 116, 98, 43) + crystal(91, 117, 36, 21);
    b += path('M 25 48 L 25 58 M 20 53 L 30 53 M 99 31 L 99 41 M 94 36 L 104 36', 'none', `stroke="${C('crystal', .18)}" stroke-width="3"`);
  }
  return group('prop', b);
}
const propNames = {
  forest: ['tree-a', 'tree-b', 'tree-c'], mountains: ['peak-a', 'peak-b', 'peak-c'], ocean: ['wave-a', 'wave-b', 'buoy'], swamp: ['reed-a', 'reed-b', 'mushroom'],
  savanna: ['bush-a', 'bush-b', 'acacia'], desert: ['cactus-a', 'cactus-b', 'dune'], tundra: ['pine-snow-a', 'pine-snow-b', 'ice-rock'], crystal: ['crystal-a', 'crystal-b', 'crystal-c'],
};

function overlay(kind, segments) {
  const h = Math.PI / segments, a = h + 2 / 400;
  const band = sector(398, 462, -a, a);
  let b = '';
  if (kind === 'fog') {
    b += path(band, C('space'), 'stroke="none" opacity="0.9"');
    for (let i = -1; i <= 1; i++) {
      const angle = i * h * .58, x = round(512 + 434 * Math.sin(angle)), y = round(512 - 434 * Math.cos(angle));
      b += `<g transform="translate(${x} ${y})" stroke="none">${ellipse(0, 0, 22, 10, C('ink'), 'opacity="0.7"')}${ellipse(-4, -5, 14, 9, C('space', .18), 'opacity="0.2"')}</g>`;
      b += path(`M ${x - 11} ${y} Q ${x - 4} ${y - 11} ${x + 7} ${y - 4} Q ${x + 13} ${y + 3} ${x + 4} ${y + 5} Q ${x - 2} ${y + 6} ${x - 3} ${y + 2}`, 'none', `stroke="${C('rock')}" stroke-width="2" opacity="0.3"`);
    }
  }
  if (kind === 'depleted') {
    b += path(band, C('rock-dark'), 'stroke="none" opacity="0.6"');
    b += path('M 500 59 L 507 75 L 500 87 L 515 101 L 510 113 M 507 75 L 522 77 L 530 69 M 500 87 L 483 90', 'none', `stroke="${C('ink')}" stroke-width="3" opacity="0.6"`);
  }
  if (kind === 'polluted') {
    b += path(band, C('toxic'), 'stroke="none" opacity="0.2"');
    for (const [x, y, r] of [[488, 86, 12], [520, 73, 16], [536, 97, 9]]) {
      b += ellipse(x, y, r + 6, r * .7, C('toxic'), 'stroke="none" opacity="0.2"');
      b += ellipse(x, y, r, r * .5, C('toxic'), 'stroke="none" opacity="0.4"');
      b += circle(x - 3, y - 11, 3, C('toxic', .18), 'stroke="none" opacity="0.7"');
    }
  }
  if (kind === 'selected' || kind === 'hover' || kind === 'player-ping') {
    const ping = kind === 'player-ping', hover = kind === 'hover', color = C(ping ? 'tint-white' : 'cream');
    b += path(band, color, `stroke="none" opacity="${hover ? '0.1' : '0.2'}"`);
    // A complete rim gives feedback even when buildings cover the outer edge.
    b += path(sector(402, 458, -h + .006, h - .006), 'none', `stroke="${color}" stroke-width="${hover ? 2 : 5}"`);
    if (ping) b += path('M 501 78 L 512 87 L 523 78 M 503 92 L 512 100 L 521 92', 'none', `stroke="${color}" stroke-width="4"`);
  }
  return `<defs>${edgeMask(segments)}</defs>${group('overlay', b, 'mask="url(#edge)"')}`;
}

// Each biome exports one reusable north-facing sector per planet size.
for (const biome of biomes) for (const n of sizes) {
  add(`biome.${biome}.wedge.${n}`, 'biomes', `${biome}-wedge-${n}`, wedge(biome, n), 1024, 1024, 'P0', [.5, .5], ['ground'], [biome, 'wedge', `segments-${n}`]);
}
for (const [biome, names] of Object.entries(propNames)) names.forEach((name, i) => {
  add(`biome.${biome}.prop.${name}`, 'biomes', `${biome}-${name}`, prop(biome, i), 128, 128, 'P0', [.5, .9375], ['prop'], [biome, 'prop']);
});
for (const kind of ['fog', 'depleted', 'polluted', 'selected', 'hover', 'player-ping']) for (const n of sizes) {
  add(`overlay.${kind}.${n}`, 'biomes', `overlay-${kind}-${n}`, overlay(kind, n), 1024, 1024, 'P0', [.5, .5], ['overlay'], ['overlay', kind, `segments-${n}`]);
}
write('art/manifest/world.json', JSON.stringify({ assets }, null, 2) + '\n');
console.log(`World: ${assets.length} SVG masters generated.`);
