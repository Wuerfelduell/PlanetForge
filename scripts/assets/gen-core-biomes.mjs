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
    body += band(419, 442, C('ascension'));
    body += band(419, 423, C('energy'), 'opacity="0.6"');
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

for (const biome of biomes) {
  add(`biome.${biome}.wedge.12`, `${biome}-wedge-12`, wedge(biome), 1024, [.5, .5], ['ground'], [biome, 'wedge', 'segments-12']);
}
write('art/manifest/core-biomes.json', JSON.stringify({ assets }, null, 2) + '\n');
console.log(`Core biomes: ${assets.length} SVG masters generated.`);
