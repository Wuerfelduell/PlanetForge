// Original PlanetForge irradiated ground and cleanup art.
// node scripts/assets/gen-irradiated.mjs, then npm --prefix scripts/assets run assets:gen
import { C, svg, round, write } from './common.mjs';

const STAGE = 2;
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

function cleanupIcon() {
  return '<g id="clear-irradiated">' +
    // A clean green patch and cream sparkle replace the scorched icon's embers.
    path('M65 107Q70 102 79 104Q87 100 95 104L108 104Q116 106 113 112Q91 118 67 113Q61 111 65 107Z', C('grass')) +
    line('M72 109Q78 106 84 108', 'cream', 2) +
    // The barrel's halo is translucent vector geometry, without an SVG filter.
    ellipse(93, 61, 23, 31, C('uranium'), 'stroke="none" opacity="0.1"') +
    ellipse(93, 61, 19, 27, C('uranium'), 'stroke="none" opacity="0.2"') +
    // Chunky tracked robot, matching the cream/steel/science UI vocabulary.
    '<rect x="20" y="86" width="43" height="17" rx="8" fill="' + C('coal') + '"/>' +
    ellipse(29, 95, 5, 5, C('rock'), 'stroke-width="1.5"') +
    ellipse(52, 95, 5, 5, C('rock'), 'stroke-width="1.5"') +
    line('M37 95H44', 'rock-dark', 2) +
    '<rect x="24" y="62" width="35" height="29" rx="9" fill="' + C('paper') + '"/>' +
    path('M49 64H53Q59 64 59 72V82Q59 91 50 91H44Q52 85 49 64Z', C('paper', -.18), 'stroke="none"') +
    '<rect x="30" y="70" width="17" height="9" rx="4" fill="' + C('science') + '" stroke-width="1.5"/>' +
    line('M30 84H38', 'rock-dark', 1.5) +
    line('M39 33L36 24', 'rock-dark', 3) +
    ellipse(35, 21, 4, 4, C('science')) +
    '<rect x="21" y="34" width="42" height="29" rx="10" fill="' + C('cream') + '"/>' +
    path('M55 36Q63 36 63 45V53Q63 63 53 63H47Q58 56 55 36Z', C('paper'), 'stroke="none"') +
    '<rect x="27" y="42" width="29" height="13" rx="6" fill="' + C('deep-water') + '" stroke-width="1.5"/>' +
    ellipse(35, 48, 2, 2.5, C('snow'), 'stroke="none"') +
    ellipse(47, 48, 2, 2.5, C('snow'), 'stroke="none"') +
    line('M28 39H36', 'cream', 2) +
    // A bent lifting arm holds the drum clear of the ground, toward screen right.
    line('M57 77L67 64L80 65', 'ink', 9) +
    line('M57 77L67 64L80 65', 'rock', 5) +
    ellipse(67, 64, 5, 5, C('paper'), 'stroke-width="2"') +
    // Steel drum with luminous green ribs and contents; no lettering or symbols.
    path('M79 43Q93 36 107 43V79Q107 87 93 87Q79 87 79 79Z', C('rock-dark')) +
    path('M99 43L107 43V79Q107 86 97 87V45Z', C('rock-dark', -.18), 'stroke="none"') +
    path('M79 51Q93 57 107 51V57Q93 63 79 57Z', C('uranium'), 'stroke-width="2"') +
    path('M79 73Q93 79 107 73V79Q93 85 79 79Z', C('uranium'), 'stroke-width="2"') +
    ellipse(93, 43, 14, 6, C('uranium')) +
    ellipse(93, 43, 7, 2, C('uranium', -.18), 'stroke="none"') +
    line('M84 41L89 40', 'cream', 2) +
    line('M84 62V68', 'snow', 2) +
    path('M80 59Q76 57 74 62V68Q76 73 81 70L84 67', 'none', 'stroke-width="4"') +
    line('M77 62V66', 'rock', 2) +
    path('M100 90Q102 99 110 100Q102 102 100 111Q98 102 90 100Q98 98 100 90Z', C('cream'), 'stroke-width="2"') +
    line('M69 100L72 97', 'uranium', 2) + '</g>';
}
if (STAGE >= 2) emit('ui.icon-clear-irradiated', 'ui', 'icon-clear-irradiated', cleanupIcon(), 128, [.5, .5]);

write('art/manifest/irradiated.json', JSON.stringify({ assets }, null, 2) + '\n');
console.log(`Irradiated art: stage ${STAGE}, ${assets.length} ids generated.`);
