// Original PlanetForge irradiated ground and cleanup art.
// node scripts/assets/gen-irradiated.mjs, then npm --prefix scripts/assets run assets:gen
import { C, svg, round, write } from './common.mjs';

const STAGE = 1;
const assets = [];
const path = (d, fill = 'none', extra = '') => `<path d="${d}" fill="${fill}" ${extra}/>`;
const ellipse = (x, y, rx, ry, fill, extra = '') => `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="${fill}" ${extra}/>`;
const line = (d, token, width, extra = '') => path(d, 'none', `stroke="${C(token)}" stroke-width="${width}" ${extra}`);
function emit(id, category, name, body, size, anchor, parts = []) {
  const src = `art/src/${category}/${name}.svg`;
  write(src, svg(body, size));
  assets.push({ id, category, src, out: `public/assets/sprites/${category}/${name}.png`, viewBox: [size, size], anchor, frames: 1, parts, tags: ['irradiated', category], phase: 'P1' });
}

// Pure sector and feather helpers copied exactly from gen-scorched.mjs.
// Do not import another generator: that would write unrelated source artwork.
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

function irradiated(segments) {
  const half = Math.PI / segments, a = half + 2 / 400;
  const at = (r, fraction) => point(r, half * fraction);
  // Dark neutral underpainting keeps the luminous material readable on snow,
  // sand and green biomes as well as on water, lava, ash and violet crystal.
  let body = path(sector(398, 462, -a, a), C('coal'), 'stroke="none" opacity="0.6"');
  body += path(sector(398, 462, -a, a), C('uranium', -.18), 'stroke="none" opacity="0.5"');
  body += path(sector(398, 462, -a, a), C('uranium'), 'stroke="none" opacity="0.2"');
  body += path(sector(398, 405, -a, a), C('coal'), 'stroke="none" opacity="0.5"');
  body += path(sector(456, 460, -a, a), C('uranium'), 'stroke="none" opacity="0.4"');
  // Flat, rounded ash islands; their positions follow the available wedge width.
  for (const [fraction, r, scale] of [[-.7, 443, 1], [.68, 417, .8], [0, 417, .7]]) {
    const d='M-16 1Q-21 -5 -12 -9L-3 -7Q6 -14 13 -6Q23 -4 17 3L9 5Q2 12 -6 6Q-16 9 -16 1Z';
    body += `<g transform="translate(${at(r, fraction)}) scale(${scale})">` +
      path(d, C('coal'), 'stroke="none" opacity="0.8"') +
      line('M-11 -4Q-8 -7 -4 -5', 'rock-dark', 2, 'opacity="0.6"') + '</g>';
  }
  // Broad dark branches with short luminous edges read as damaged earth,
  // rather than the round haze blobs used by overlay.polluted.
  body += line(`M${at(459, -.28)}L${at(445, -.1)}L${at(431, -.28)}L${at(416, -.1)}L${at(403, -.23)} M${at(445, -.1)}L${at(441, .2)}L${at(427, .35)} M${at(431, -.28)}L${at(427, -.63)}L${at(414, -.73)} M${at(418, .17)}L${at(408, .44)}L${at(414, .72)}`, 'ink', 3, 'opacity="0.8"');
  body += line(`M${at(457, -.24)}L${at(445, -.06)} M${at(429, -.24)}L${at(417, -.06)} M${at(440, .23)}L${at(428, .38)}`, 'uranium', 1.5, 'opacity="0.8"');
  // Three small irregular pools, scaled for every segment count, including 40.
  for (const [fraction, r, scale] of [[-.49, 430, 1], [.48, 443, .9], [.2, 409, .6]]) {
    body += `<g transform="translate(${at(r, fraction)}) scale(${scale})" stroke-width="2">` +
      // Concentric translucent vector shapes give an FX glow without filters.
      ellipse(0, 0, 19, 10, C('uranium'), 'stroke="none" opacity="0.1"') +
      ellipse(0, 0, 15, 8, C('uranium'), 'stroke="none" opacity="0.2"') +
      path('M-11 0Q-13 -5 -6 -6Q-3 -9 3 -5Q13 -6 12 0Q15 5 7 5Q1 9 -4 5Q-12 6 -11 0Z', C('uranium')) +
      path('M-8 3Q0 5 9 1Q14 4 7 5Q1 9 -4 5Z', C('uranium', -.18), 'stroke="none"') +
      line('M-7 -2Q-5 -5 -2 -4', 'cream', 2) +
      // Faint specks float upward, but remain clipped to the same ground band.
      ellipse(3, -12, 4, 4, C('uranium'), 'stroke="none" opacity="0.1"') +
      ellipse(3, -12, 1.5, 1.5, C('uranium', .18), 'stroke="none" opacity="0.6"') +
      ellipse(-3, -19, 1, 1.5, C('uranium'), 'stroke="none" opacity="0.3"') + '</g>';
  }
  return `<defs>${edgeMask(segments)}</defs><g id="overlay" mask="url(#edge)">${body}</g>`;
}

for (const n of [12, 16, 18, 24, 30, 32, 40]) {
  emit(`overlay.irradiated.${n}`, 'biomes', `overlay-irradiated-${n}`, irradiated(n), 1024, [.5, .5], ['overlay']);
}

write('art/manifest/irradiated.json', JSON.stringify({ assets }, null, 2) + '\n');
console.log(`Irradiated art: stage ${STAGE}, ${assets.length} ids generated.`);
