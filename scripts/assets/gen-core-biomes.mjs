import { C, svg, round, write } from './common.mjs';

// Original cave artwork; run this generator, then assets:gen to merge fragments.
// Geometry and flat-alpha seam feathering are copied from gen-world.mjs.
const assets = [];
const biomes = ['mushroom-forest', 'crystal-grotto', 'magma-lake', 'primal-sea'];
const path = (d, fill = 'none', extra = '') => `<path d="${d}" fill="${fill}" ${extra}/>`;
const circle = (x, y, r, fill, extra = '') => `<circle cx="${round(x)}" cy="${round(y)}" r="${round(r)}" fill="${fill}" ${extra}/>`;
const ellipse = (x, y, rx, ry, fill, extra = '') => `<ellipse cx="${round(x)}" cy="${round(y)}" rx="${round(rx)}" ry="${round(ry)}" fill="${fill}" ${extra}/>`;
const group = (id, body, extra = '') => `<g id="${id}" ${extra}>${body}</g>`;
function add(id, name, body, w, anchor, parts, tags) {
  const category = 'biomes', src = `art/src/${category}/${name}.svg`;
  write(src, svg(body, w, w));
  assets.push({ id, category, src, out: `public/assets/sprites/${category}/${name}.png`, viewBox: [w, w], anchor, frames: 1, parts, tags, phase: 'P0' });
}
const point = (r, a) => `${round(512 + r * Math.sin(a))} ${round(512 - r * Math.cos(a))}`;
function sector(inner, outer, start, end) {
  return `M ${point(outer, start)} A ${outer} ${outer} 0 0 1 ${point(outer, end)} L ${point(inner, end)} A ${inner} ${inner} 0 0 0 ${point(inner, start)} Z`;
}
function edgeMask(segments) {
  const half = Math.PI / segments;
  let strips = path(sector(398, 462, -half - 1 / 400, half + 1 / 400), C('tint-white'), 'stroke="none"');
  for (let i = 0; i < 6; i++) {
    const a = half + (1 + i / 6) / 400, b = half + (1 + (i + 1) / 6) / 400;
    for (const side of [-1, 1]) strips += path(sector(398, 462, side < 0 ? -b : a, side < 0 ? -a : b), C('tint-white'), `stroke="none" opacity="${round((6 - i) / 7)}"`);
  }
  return `<mask id="edge" maskUnits="userSpaceOnUse" x="0" y="0" width="1024" height="1024">${strips}</mask>`;
}

export function wedge(biome, segments = 12) {
  const half = Math.PI / segments, a = half + 2 / 400;
  const band = (inner, outer, color, extra = '') => path(sector(inner, outer, -a, a), color, `stroke="none" ${extra}`);
  let body = '';
  if (biome === 'mushroom-forest') {
    body += band(398, 462, C('oil'));
    body += band(411, 451, C('clay', -.18), 'opacity="0.3"');
    body += band(398, 411, C('oil', -.18));
    body += band(451, 462, C('oil-sheen', -.18));
    body += band(451, 455, C('iron'), 'opacity="0.3"');
  }
  if (biome === 'crystal-grotto') {
    body += band(398, 462, C('rock-dark', -.18));
    body += band(398, 411, C('coal', -.18));
    body += band(411, 416, C('iron', -.18), 'opacity="0.4"');
    body += band(451, 462, C('rock-dark'));
    body += band(451, 455, C('clay'), 'opacity="0.2"');
  }
  if (biome === 'magma-lake') {
    body += band(398, 462, C('coal', -.18));
    body += band(398, 411, C('oil', -.18));
    // Broad continuous liquid channel, unlike the outer lava biome's cracks.
    body += band(412, 447, C('lava'));
    body += band(419, 442, C('ascension'), 'opacity="0.5"');
    body += band(419, 423, C('energy'), 'opacity="0.3"');
    body += band(451, 462, C('coal'));
    body += band(451, 455, C('iron', -.18));
  }
  if (biome === 'primal-sea') {
    body += band(398, 462, C('deep-water', -.18));
    body += band(411, 462, C('ok', -.18), 'opacity="0.4"');
    body += band(398, 411, C('oil', -.18));
    body += band(411, 416, C('iron', -.18), 'opacity="0.2"');
    body += band(451, 462, C('ok', -.18), 'opacity="0.4"');
  }
  // Repeated motifs stay clear of both seams and the continuous surface rim.
  for (let i = -1; i <= 1; i++) {
    const angle = i * half * .56, x = round(512 + 435 * Math.sin(angle)), y = round(512 - 435 * Math.cos(angle));
    let mark = '';
    if (biome === 'mushroom-forest') {
      mark += ellipse(0, 0, 15, 7, C('ok'), 'stroke="none" opacity="0.2"');
      mark += path('M -11 2 Q -14 -4 -6 -4 Q -3 -9 2 -4 Q 12 -6 11 1 Q 8 6 2 3 Q -5 7 -11 2 Z', C('ok', -.18), 'stroke="none"');
      mark += ellipse(-4, -2, 4, 2, C('ok', .18), 'stroke="none"');
      mark += circle(8, 0, 1.5, C('science', .18), 'stroke="none"');
      mark += path('M -8 12 L -1 13 M 9 10 L 12 9', 'none', `stroke="${C('clay', -.18)}" stroke-width="2"`);
    }
    if (biome === 'crystal-grotto') {
      mark += ellipse(0, 5, 14, 3, C('ink'), 'stroke="none" opacity="0.4"');
      mark += path('M -8 5 L -7 -5 Q -6 -8 -4 -9 L 1 -4 L 2 6 Z M 1 6 L 4 -1 L 7 -4 L 11 1 L 10 6 Z', C('glacier'), `stroke="${C('ink')}" stroke-width="2"`);
      mark += path('M -4 -7 L -3 4 L 1 5 L 0 -3 Z M 7 -2 L 7 5 L 10 5 L 10 1 Z', C('science'), 'stroke="none"');
      mark += path('M -6 -3 L -6 1', 'none', `stroke="${C('snow')}" stroke-width="2"`);
    }
    if (biome === 'magma-lake') {
      mark += ellipse(0, 2, 13, 5, C('lava', -.18), 'stroke="none"');
      mark += ellipse(-1, 0, 9, 6, C('lava'), 'stroke="none"');
      mark += path('M -7 0 Q -6 -5 -1 -5', 'none', `stroke="${C('energy')}" stroke-width="2"`);
      mark += circle(11, 7, 2.5, C('lava'), 'stroke="none"');
      mark += path('M -10 -13 Q -3 -11 4 -13', 'none', `stroke="${C('lava', -.18)}" stroke-width="3"`);
    }
    if (biome === 'primal-sea') {
      mark += ellipse(0, 1, 17, 6, C('ok'), 'stroke="none" opacity="0.1"');
      mark += path('M -14 0 Q 0 -6 14 0 M -9 5 Q 0 8 9 5', 'none', `stroke="${C('ok', .18)}" stroke-width="2" opacity="0.5"`);
      mark += circle(-7, -1, 1.5, C('glacier'), 'stroke="none" opacity="0.7"');
    }
    body += `<g transform="translate(${x} ${y}) rotate(${round(angle * 180 / Math.PI)})">${mark}</g>`;
  }
  return `<defs>${edgeMask(segments)}</defs>${group('ground', body, 'mask="url(#edge)"')}`;
}

// Props keep the outer biome convention: 3px ink outline, y=120 ground,
// top-left highlights, bottom-right shadows, and flat translucent glow shapes.
const shadow = () => ellipse(64, 116, 40, 4, C('ink'), 'stroke="none" opacity="0.2"');
function glowingSpot(x, y, rx, ry) {
  return ellipse(x, y, rx + 2, ry + 2, C('ok'), 'stroke="none" opacity="0.2"')
    + ellipse(x, y, rx, ry, C('ok'), 'stroke="none"')
    + ellipse(x - 1, y - 1, round(rx * .5), round(ry * .4), C('ok', .18), 'stroke="none"');
}
function mushroom(variant) {
  let b = '';
  if (variant === 0) {
    b += path('M 50 118.5 Q 59 94 53 58 L 76 58 Q 69 94 82 118.5 Z', C('clay', .18));
    b += path('M 67 65 L 76 61 Q 70 96 80 117 H 66 Q 63 99 67 65 Z', C('clay'), 'stroke="none"');
    b += path('M 57 77 Q 60 89 57 104', 'none', `stroke="${C('cream')}" stroke-width="3"`);
    b += ellipse(64, 60, 40, 11, C('oil-sheen', -.18));
    b += path('M 38 60 Q 64 73 91 59 M 49 60 L 59 68 M 77 60 L 72 68', 'none', `stroke="${C('clay', .18)}" stroke-width="1.5"`);
    b += path('M 20 54 Q 25 22 55 18 Q 88 12 106 52 Q 112 64 101 65 Q 87 68 79 61 Q 68 70 56 62 Q 41 72 23 64 Q 17 62 20 54 Z', C('oil-sheen'));
    b += path('M 22 60 Q 41 65 56 57 Q 69 63 80 56 Q 97 61 104 53 L 107 58 Q 111 65 101 65 Q 87 68 79 61 Q 68 70 56 62 Q 41 72 23 64 Z', C('oil-sheen', -.18), 'stroke="none"');
    b += path('M 31 41 Q 38 27 52 25', 'none', `stroke="${C('crystal', -.18)}" stroke-width="3"`);
    b += group('cap-glow', glowingSpot(45, 42, 7, 5) + glowingSpot(67, 30, 6, 4) + glowingSpot(87, 47, 5, 4));
    b += path('M 46 116 Q 37 112 32 116 M 82 115 Q 91 111 97 116', 'none', `stroke="${C('ok', -.18)}" stroke-width="2"`);
  } else {
    b += path('M 41 118.5 Q 56 99 47 56 L 64 53 Q 61 91 64 103 Q 66 112 72 118.5 Z', C('clay', .18));
    b += path('M 57 59 L 63 56 Q 61 91 64 103 Q 66 112 70 117 H 58 Q 52 93 57 59 Z', C('clay'), 'stroke="none"');
    b += path('M 50 73 Q 54 87 51 99', 'none', `stroke="${C('cream')}" stroke-width="3"`);
    b += path('M 83 118.5 Q 88 103 82 88 L 95 86 Q 92 103 101 118.5 Z', C('clay', .18));
    b += path('M 91 91 L 95 89 Q 92 106 99 117 H 91 Z', C('clay'), 'stroke="none"');
    b += ellipse(53, 58, 31, 9, C('oil-sheen', -.18));
    b += path('M 24 52 Q 34 41 36 24 Q 38 11 49 10 Q 65 9 69 29 Q 73 43 83 52 Q 89 59 80 61 Q 65 65 53 61 Q 36 67 24 61 Q 18 59 24 52 Z', C('oil-sheen'));
    b += path('M 22 57 Q 39 60 52 55 Q 69 59 82 53 Q 89 59 80 61 Q 65 65 53 61 Q 36 67 24 61 Z', C('oil-sheen', -.18), 'stroke="none"');
    b += path('M 40 29 Q 41 19 48 17', 'none', `stroke="${C('crystal', -.18)}" stroke-width="3"`);
    b += path('M 72 87 Q 75 66 89 66 Q 103 65 111 84 Q 115 91 108 92 Q 90 98 73 93 Q 68 92 72 87 Z', C('oil-sheen'));
    b += path('M 72 90 Q 88 93 111 87 Q 116 92 108 93 Q 90 98 73 93 Z', C('oil-sheen', -.18), 'stroke="none"');
    b += group('cap-glow', glowingSpot(48, 31, 5, 6) + glowingSpot(35, 51, 5, 3) + glowingSpot(67, 48, 5, 4) + glowingSpot(87, 79, 4, 3) + glowingSpot(103, 85, 3, 2));
  }
  return b;
}

// Same six-sided spire construction as the outer crystal helper, in pale blue.
function crystal(x, base, height, width) {
  return path(`M ${x - width / 2} ${base - 6} L ${x - width / 2} ${base - height + 14} Q ${x - width / 2} ${base - height + 10} ${x} ${base - height} L ${x + width / 2} ${base - height + 15} L ${x + width / 2} ${base - 6} L ${x} ${base} Z`, C('glacier'))
    + path(`M ${x} ${base - height + 3} L ${x} ${base - 3} L ${x + width / 2 - 2} ${base - 7} L ${x + width / 2 - 2} ${base - height + 16} Z`, C('glacier', -.18), 'stroke="none"')
    + path(`M ${x - width / 2 + 5} ${base - height + 19} L ${x - width / 2 + 5} ${base - 16}`, 'none', `stroke="${C('snow')}" stroke-width="3"`)
    + path(`M ${x + 3} ${base - 17} L ${x + width / 2 - 4} ${base - 21}`, 'none', `stroke="${C('clay', .18)}" stroke-width="1.5" opacity="0.5"`);
}
function crystalProp(variant) {
  let b = ellipse(64, 113, 40, 6, C('science'), 'stroke="none" opacity="0.1"');
  if (variant === 0) b += crystal(87, 117, 40, 22) + crystal(59, 118.5, 98, 38);
  else b += crystal(41, 118.5, 72, 28) + crystal(79, 118.5, 106, 29) + crystal(63, 118, 46, 24);
  b += group('glint', path(variant ? 'M 76 27 L 76 37 M 72 32 L 80 32' : 'M 55 35 L 55 47 M 50 41 L 60 41', 'none', `stroke="${C('snow')}" stroke-width="2"`));
  return b;
}
function ember(x, y) {
  return group('ember', ellipse(x, y + 2, 9, 11, C('lava'), 'stroke="none" opacity="0.2"')
    + path(`M ${x - 4} ${y + 6} Q ${x - 9} ${y} ${x - 2} ${y - 5} Q ${x + 1} ${y - 8} ${x} ${y - 12} Q ${x + 11} ${y - 3} ${x + 5} ${y + 6} Q ${x} ${y + 10} ${x - 4} ${y + 6} Z`, C('lava'), 'stroke-width="2"')
    + path(`M ${x - 2} ${y + 5} Q ${x - 4} ${y + 1} ${x + 1} ${y - 3} Q ${x + 5} ${y + 4} ${x + 1} ${y + 6} Z`, C('ascension'), 'stroke="none"')
    + circle(x - 10, y - 12, 2, C('ascension'), 'stroke="none"'));
}
function vent(variant) {
  const x = variant ? 76 : 61, y = variant ? 81 : 87;
  let b = group('puff', ellipse(x + 1, y - 17, 10, 7, C('rock-dark'), 'stroke="none" opacity="0.3"')
    + ellipse(x - 6, y - 25, 7, 6, C('rock-dark'), 'stroke="none" opacity="0.2"'));
  if (variant === 0) {
    b += path('M 28 118.5 Q 23 116 30 107 L 45 87 Q 51 79 64 80 Q 77 80 83 90 L 100 110 Q 106 118.5 97 118.5 Z', C('coal'));
    b += path('M 74 87 Q 80 89 83 94 L 100 110 Q 106 118.5 97 118.5 H 62 Q 83 107 74 87 Z', C('coal', -.18), 'stroke="none"');
    b += path('M 41 104 L 47 98', 'none', `stroke="${C('rock-dark')}" stroke-width="3"`);
  } else {
    b += path('M 28 118.5 Q 24 116 30 108 L 40 101 L 52 102 L 59 81 Q 63 73 76 74 Q 90 74 93 83 L 101 112 Q 105 118.5 98 118.5 Z', C('coal'));
    b += path('M 82 81 L 92 83 L 101 112 Q 105 118.5 98 118.5 H 76 Z', C('coal', -.18), 'stroke="none"');
    b += ellipse(46, 105, 12, 5, C('rock-dark'), 'stroke-width="2"');
    b += path('M 61 94 L 57 106', 'none', `stroke="${C('rock-dark')}" stroke-width="3"`);
  }
  b += ellipse(x, y, variant ? 18 : 21, 8, C('rock-dark'));
  b += ellipse(x, y, variant ? 12 : 15, 4, C('lava'), 'stroke-width="1.5"');
  b += path(`M ${x - 8} ${y} Q ${x - 3} ${y - 3} ${x + 5} ${y - 1}`, 'none', `stroke="${C('ascension')}" stroke-width="2"`);
  b += path(`M ${x + 3} ${y + 10} L ${x - 1} ${y + 18} L ${x + 7} ${y + 25}`, 'none', `stroke="${C('lava')}" stroke-width="3"`);
  b += ember(x - 1, y - 42);
  return b;
}
function coral(variant) {
  let b = ellipse(64, 115, 40, 4, C('ok'), 'stroke="none" opacity="0.1"');
  if (variant === 0) {
    // Rounded antler coral reads differently from both crystal spires and reeds.
    b += path('M 50 118.5 Q 54 107 53 94 L 36 83 Q 29 78 29 67 L 29 58 Q 29 51 35 51 Q 41 51 41 58 L 41 66 Q 41 72 49 75 L 54 78 L 53 58 L 43 47 Q 37 42 37 34 Q 37 28 43 28 Q 49 28 49 34 Q 49 39 56 43 L 57 25 Q 57 18 63 18 Q 70 18 70 25 L 68 58 L 80 49 L 80 36 Q 80 29 86 29 Q 92 29 92 36 L 92 51 Q 92 57 86 61 L 68 75 L 67 91 L 84 82 Q 90 79 91 70 Q 92 63 98 65 Q 104 66 103 74 Q 101 88 90 94 L 67 108 L 73 118.5 Z', C('ok', -.18));
    b += path('M 63 33 L 61 94 Q 60 109 57 115 M 37 63 Q 35 74 47 79 M 86 39 L 86 49 M 85 87 Q 96 81 97 73', 'none', `stroke="${C('ok')}" stroke-width="3"`);
    b += group('tips', circle(63, 25, 4, C('ok', .18), 'stroke="none"') + circle(43, 34, 3, C('glacier'), 'stroke="none"') + circle(86, 36, 3, C('glacier'), 'stroke="none"') + circle(98, 71, 3, C('ok', .18), 'stroke="none"'));
  } else {
    // Two broad, wavy kelp ribbons give the second prop a softer silhouette.
    b += path('M 61 118.5 Q 42 104 40 88 Q 36 74 42 65 Q 51 53 44 45 Q 34 33 44 20 Q 49 14 54 13 Q 50 29 61 39 Q 76 52 63 69 Q 52 82 59 96 Q 64 104 70 118.5 Z', C('ok', -.18));
    b += path('M 70 118.5 Q 84 100 77 87 Q 69 73 77 62 Q 85 50 79 40 Q 93 42 97 55 Q 100 66 91 78 Q 86 85 92 96 Q 99 112 85 118.5 Z', C('ok', -.18));
    b += path('M 51 26 Q 48 34 55 43 Q 65 54 55 68 Q 44 84 52 100 M 87 52 Q 94 61 84 75 Q 79 86 85 96', 'none', `stroke="${C('ok')}" stroke-width="3"`);
    b += group('tips', ellipse(48, 25, 3, 6, C('ok', .18), 'stroke="none"') + ellipse(87, 53, 3, 5, C('glacier'), 'stroke="none"') + circle(49, 83, 2.5, C('glacier'), 'stroke="none"') + circle(85, 102, 2.5, C('ok', .18), 'stroke="none"'));
  }
  b += path('M 32 118.5 Q 30 114 35 111 Q 43 107 49 112 Q 64 106 78 111 Q 90 107 97 114 Q 101 118.5 95 118.5 Z', C('rock-dark', -.18));
  b += path('M 39 113 L 45 113 M 72 113 L 79 114', 'none', `stroke="${C('iron')}" stroke-width="1.5" opacity="0.5"`);
  return b;
}

for (const biome of biomes) {
  add(`biome.${biome}.wedge.12`, `${biome}-wedge-12`, wedge(biome), 1024, [.5, .5], ['ground'], [biome, 'wedge', 'segments-12']);
}
const propNames = {
  'mushroom-forest': ['giant-mushroom-a', 'giant-mushroom-b'],
  'crystal-grotto': ['crystal-a', 'crystal-b'],
  'magma-lake': ['vent-a', 'vent-b'],
  'primal-sea': ['coral-a', 'coral-b'],
};
for (const [biome, names] of Object.entries(propNames)) names.forEach((name, variant) => {
  const draw = { 'mushroom-forest': mushroom, 'crystal-grotto': crystalProp, 'magma-lake': vent, 'primal-sea': coral }[biome];
  const parts = ['prop', ...(biome === 'mushroom-forest' ? ['cap-glow'] : biome === 'crystal-grotto' ? ['glint'] : biome === 'magma-lake' ? ['puff', 'ember'] : ['tips'])];
  add(`biome.${biome}.prop.${name}`, `${biome}-${name}`, group('prop', shadow() + draw(variant)), 128, [.5, .9375], parts, [biome, 'prop']);
});
write('art/manifest/core-biomes.json', JSON.stringify({ assets }, null, 2) + '\n');
console.log(`Core biomes: ${assets.length} SVG masters generated.`);
