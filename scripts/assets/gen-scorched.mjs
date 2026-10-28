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

function ruin() {
  return '<g id="ruin">' +
    // Smoke is translucent vector strokes, not a blur or an opaque cloud.
    line('M98 119C80 105 109 94 95 77C86 67 89 59 96 53', 'rock', 6, 'opacity="0.4"') +
    line('M164 148C177 136 151 126 162 111', 'rock', 5, 'opacity="0.3"') +
    path('M38 224Q38 205 53 196L78 189L96 201L125 184L150 198L180 186L206 201L219 225Z', C('coal')) +
    // A low, jagged wall without architectural cues to any particular building.
    path('M62 211V133Q62 126 70 127L84 131L91 122L103 139L101 160L122 169L119 211Z', C('rock-dark')) +
    path('M92 125L103 139L101 160L122 169L119 211H99V171L89 158Z', C('coal'), 'stroke="none"') +
    path('M67 181Q77 169 88 181L99 175V211H64Z', C('coal'), 'stroke="none"') +
    line('M69 140V153M70 164H89M72 183H81', 'rock', 3) +
    line('M69 135L80 137', 'paper', 4) +
    // Two snapped beams, with clear thick silhouettes and a charred end.
    path('M69 217L59 204L158 145L158 156L175 152L166 168L181 169L80 224Z', C('iron', -.18)) +
    line('M72 203L137 164', 'clay', 3) +
    path('M168 219L97 165L109 164L108 153L123 166L128 160L185 205Z', C('coal')) +
    line('M124 173L173 210', 'rock-dark', 3) +
    // Rubble uses the same rounded, faceted stone language as the base buildings.
    path('M44 225L46 208L62 199L83 209L88 226Z', C('rock')) +
    path('M64 201L83 209L88 226H66Z', C('rock-dark'), 'stroke="none"') +
    path('M89 225L93 208L116 196L138 208L142 226Z', C('rock-dark')) +
    path('M116 197L138 208L142 226H118Z', C('coal'), 'stroke="none"') +
    path('M153 226L155 207L177 191L195 200L203 225Z', C('rock')) +
    path('M178 193L195 200L203 225H184Z', C('rock-dark'), 'stroke="none"') +
    line('M53 211L61 207M102 210L113 204M164 207L175 199', 'paper', 4) +
    path('M199 226L204 216L216 213L222 226Z', C('rock-dark')) +
    // The same 200 px outlined footprint and y=240 ground as gen-buildings.
    `<rect x="31" y="225" width="194" height="12" rx="6" fill="${C('rock-dark')}"/>` +
    line('M42 233H214', 'coal', 5) +
    path('M126 221L132 217L138 221L132 224Z', C('ascension'), 'stroke="none"') +
    line('M130 220L132 219', 'energy', 3) + '</g>';
}

function cleanupIcon() {
  return '<g id="clear-scorched">' +
    path('M43 111L49 101L59 103L65 96L76 101L86 111Q65 119 43 111Z', C('coal')) +
    path('M51 109L57 105L63 109L58 112ZM69 105L73 102L79 107L74 110Z', C('ascension'), 'stroke="none"') +
    line('M55 108L58 107M72 105L74 104', 'energy', 2) +
    // Shovel behind the broom: an open D grip and a broad, rounded metal blade.
    '<g transform="rotate(-38 64 64)">' +
    `<rect x="60" y="30" width="8" height="54" rx="4" fill="${C('clay')}"/>` +
    path('M54 15Q64 11 74 15V26Q74 35 64 37Q54 35 54 26Z', C('iron')) +
    path('M59 20Q64 18 69 20V26Q69 30 64 31Q59 30 59 26Z', C('cream'), 'stroke-width="1.5"') +
    path('M50 79Q64 83 78 79V94Q78 105 64 113Q50 105 50 94Z', C('rock')) +
    path('M65 83L78 79V94Q78 105 64 113Z', C('rock-dark'), 'stroke="none"') +
    line('M56 87V93', 'cream', 4) +
    line('M64 88V103', 'ink', 1.5) + '</g>' +
    // A full straw fan makes the broom distinct from the shovel at icon size.
    '<g transform="rotate(38 64 64)">' +
    `<rect x="60" y="13" width="8" height="69" rx="4" fill="${C('iron')}"/>` +
    line('M63 20V58', 'sand', 2) +
    path('M54 77H74L85 106Q64 116 43 106Z', C('sand')) +
    path('M68 78H74L85 106Q77 110 70 111Z', C('savanna'), 'stroke="none"') +
    path('M53 78Q64 74 75 78L77 85Q64 89 51 85Z', C('clay')) +
    line('M55 94L52 105M64 94V108M73 94L76 105', 'iron', 1.5) +
    line('M55 81L62 80', 'cream', 3) + '</g></g>';
}

for (const n of [12, 16, 18, 24, 30, 32, 40]) {
  emit(`overlay.scorched.${n}`, 'biomes', `overlay-scorched-${n}`, scorched(n), 1024, [.5, .5], ['overlay']);
}

// This ID already belongs to buildings.json with the required canvas, anchor,
// frame count and path. Reuse that registration instead of duplicating the ID.
// Run this generator after gen-buildings.mjs when rebuilding all source art.
write('art/src/buildings/ruin.svg', svg(ruin(), 256));

emit('ui.icon-clear-scorched', 'ui', 'icon-clear-scorched', cleanupIcon(), 128, [.5, .5]);

write('art/manifest/scorched.json', JSON.stringify({ assets }, null, 2) + '\n');
console.log(`Scorched art: ${assets.length} new ids generated.`);
