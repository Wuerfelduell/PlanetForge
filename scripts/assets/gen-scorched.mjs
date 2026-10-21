// Original PlanetForge scorch and cleanup art. Run after the base art generators:
// node scripts/assets/gen-scorched.mjs && npm --prefix scripts/assets run assets:gen
import { C, svg, round, write } from './common.mjs';

const assets = [];
const path = (d, fill = 'none', extra = '') => `<path d="${d}" fill="${fill}" ${extra}/>`;
const ellipse = (x, y, rx, ry, fill, extra = '') => `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="${fill}" ${extra}/>`;
const line = (d, token, width, extra = '') => path(d, 'none', `stroke="${C(token)}" stroke-width="${width}" ${extra}`);
function emit(id, category, name, body, size, anchor, parts = []) {
  const src = `art/src/${category}/${name}.svg`;
  write(src, svg(body, size));
  assets.push({ id, category, src, out: `public/assets/sprites/${category}/${name}.png`, viewBox: [size, size], anchor, frames: 1, parts, tags: ['scorched', category], phase: 'P1' });
}

// Exact sector and feather-mask geometry from gen-world.mjs. Importing that
// generator would regenerate unrelated assets, so keep these pure helpers here.
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

function scorched(segments) {
  const half = Math.PI / segments, a = half + 2 / 400;
  let body = path(sector(398, 462, -a, a), C('coal'), 'stroke="none" opacity="0.5"');
  body += path(sector(398, 462, -a, a), C('iron', -.18), 'stroke="none" opacity="0.2"');
  // Spread the two small craters with the wedge angle, including the narrow 32.
  for (const [side, radius] of [[-1, 428], [1, 438]]) {
    const angle = side * half * .46;
    const x = round(512 + radius * Math.sin(angle)), y = round(512 - radius * Math.cos(angle));
    body += `<g transform="translate(${x} ${y})" stroke-width="2">` +
      ellipse(0, 0, 14, 7, C('iron', -.18), 'stroke="none" opacity="0.5"') +
      ellipse(0, -2, 10, 5, C('coal'), 'stroke="none" opacity="0.7"') +
      line('M-11 -1Q-10 -7 0 -7', 'rock', 2, 'opacity="0.6"') +
      path('M-4 0L0 -2L4 1L0 3Z', C('ascension'), 'stroke="none"') +
      line('M-2 0L0 -1', 'energy', 2) +
      line('M3 -9C-4 -14 8 -17 2 -23', 'paper', 2, 'opacity="0.4"') + '</g>';
  }
  body += line('M502 99L510 102L517 97M524 108L532 106', 'ink', 2, 'opacity="0.5"');
  body += path('M501 91L506 89L508 92L503 94ZM524 100L528 98L531 101L526 103Z', C('ascension'), 'stroke="none" opacity="0.9"');
  return `<defs>${edgeMask(segments)}</defs><g id="overlay" mask="url(#edge)">${body}</g>`;
}

for (const n of [12, 16, 24, 32]) {
  emit(`overlay.scorched.${n}`, 'biomes', `overlay-scorched-${n}`, scorched(n), 1024, [.5, .5], ['overlay']);
}

write('art/manifest/scorched.json', JSON.stringify({ assets }, null, 2) + '\n');
console.log(`Scorched art: ${assets.length} new ids generated.`);
