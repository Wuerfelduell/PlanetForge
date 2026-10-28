// Original PlanetForge hollow-world art. No external artwork or random input.
// Run: node scripts/assets/gen-core-ui.mjs
// Then: npm --prefix scripts/assets run assets:gen && npm --prefix scripts/assets run assets:check
import {C, svg, round, write} from './common.mjs';

// Keep each numbered delivery checkpoint independently reproducible.
const RELEASE = 4;
const assets = [];
const p = (d, fill = 'none', extra = '') => `<path d="${d}" fill="${fill}" ${extra}/>`;
const circle = (x, y, r, fill, extra = '') => `<circle cx="${round(x)}" cy="${round(y)}" r="${round(r)}" fill="${fill}" ${extra}/>`;
const ellipse = (x, y, rx, ry, fill, extra = '') => `<ellipse cx="${round(x)}" cy="${round(y)}" rx="${round(rx)}" ry="${round(ry)}" fill="${fill}" ${extra}/>`;
const g = (id, body, extra = '') => `<g id="${id}" ${extra}>${body}</g>`;
const shine = (d, width = 3) => p(d, 'none', `stroke="${C('cream')}" stroke-width="${width}"`);
function emit(id, category, name, body, size, extra = {}) {
  const frames = extra.frames ?? 1, stem = name + (frames > 1 ? '-f{f}' : '');
  for (let f = 1; f <= frames; f++) {
    write(`art/src/${category}/${stem.replace('{f}', f)}.svg`, svg(typeof body === 'function' ? body(f) : body, size));
  }
  assets.push({id, category, src: `art/src/${category}/${stem}.svg`, out: `public/assets/sprites/${category}/${stem}.png`, viewBox: [size, size], anchor: [.5, .5], frames, parts: [], tags: [category, name], phase: 'P1', ...extra});
}

function coreSun() {
  const defs = `<radialGradient id="core-light" cx="32%" cy="28%" r="78%"><stop stop-color="${C('cream')}"/><stop offset="0.3" stop-color="${C('cream')}"/><stop offset="0.6" stop-color="${C('energy')}"/><stop offset="1" stop-color="${C('ascension')}"/></radialGradient>
    <radialGradient id="rim-glow"><stop offset="0.8" stop-color="${C('ascension')}" stop-opacity="0"/><stop offset="0.9" stop-color="${C('ascension')}" stop-opacity="0.3"/><stop offset="1" stop-color="${C('ascension')}" stop-opacity="0"/></radialGradient>
    <filter id="heat-soft" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="10"/></filter>
    <clipPath id="core-disc">${circle(512, 512, 388, C('cream'), 'stroke="none"')}</clipPath>`;
  // Same r=400 body as planet-temperate; no star-map rays, crust, or face.
  // Broad convection ribbons suggest slow motion. The engine can rotate the
  // lava-swirl group separately; all artwork remains static SVG 1.1.
  const haze = circle(512, 512, 464, 'url(#rim-glow)', 'stroke="none"') +
    p('M168 294 Q122 403 112 495 M816 244 Q920 381 912 527 M820 790 Q696 900 541 916', 'none', `stroke="${C('energy')}" stroke-width="20" opacity="0.3" filter="url(#heat-soft)"`);
  const ribbons = p('M157 501 C165 288 383 174 563 235 C713 286 780 403 720 498 C690 546 615 556 583 512 C559 480 574 438 612 431 C644 425 667 447 664 467 C693 423 653 368 597 355 C459 314 308 362 271 484 C239 590 320 678 414 704 C279 711 151 637 157 501Z', C('ascension'), 'stroke="none" opacity="0.4"') +
    p('M265 777 C441 871 695 827 774 668 C827 563 781 472 742 438 C858 478 894 625 823 733 C692 921 399 893 265 777Z', C('ascension', -.18), 'stroke="none" opacity="0.3"') +
    p('M242 495 C281 365 439 319 560 349 C438 350 335 405 316 498 C296 587 373 635 461 625 C552 615 596 561 576 529 C635 572 571 675 462 689 C326 709 203 631 242 495Z', C('cream'), 'stroke="none" opacity="0.6"') +
    p('M455 216 C611 172 770 289 794 390 M373 784 C499 831 663 797 724 709', 'none', `stroke="${C('energy', .18)}" stroke-width="12" opacity="0.7"`);
  return `<defs>${defs}</defs>` + g('heat-haze', haze) + g('body', circle(512, 512, 400, 'url(#core-light)') +
    g('lava-swirl', ribbons, 'clip-path="url(#core-disc)"') +
    p('M202 366 Q248 257 356 221', 'none', `stroke="${C('cream')}" stroke-width="18" opacity="0.8"`));
}
emit('planet.core-sun', 'planets', 'core-sun', coreSun(), 1024, {phase: 'P0', tags: [], parts: ['body', 'lava-swirl', 'heat-haze']});

function cutawayPlanet() {
  // A whole round silhouette with one exposed quadrant, concentric mantle,
  // and a warm core. Both navigation directions use identical planet art.
  return circle(53, 77, 38, C('water')) +
    p('M18 63 Q24 44 43 40 L53 51 L44 62 L32 60 L27 76Z', C('grass')) +
    p('M24 89 L41 83 L49 94 L43 110 Q28 106 24 89Z', C('leaf')) +
    p('M53 39 A38 38 0 0 1 91 77 H53Z', C('clay')) +
    p('M53 48 A29 29 0 0 1 82 77 H53Z', C('ascension'), 'stroke-width="1.5"') +
    p('M53 58 A19 19 0 0 1 72 77 H53Z', C('energy'), 'stroke="none"') +
    p('M88 82 Q84 108 55 114 Q77 111 79 82Z', C('deep-water'), 'stroke="none"') +
    circle(53, 77, 13, C('energy')) + circle(50, 74, 7, C('cream'), 'stroke="none"') +
    shine('M25 57 Q31 48 40 46');
}
function navigation(up) {
  const sky = up ? p('M61 29 Q57 21 67 19 Q68 9 79 11 Q87 10 91 19 Q104 15 108 26 Q116 27 112 35 H64Z', C('snow')) : '';
  const arrow = up ? 'M78 64 V34 H68 Q63 34 67 29 L84 12 Q87 9 90 12 L107 29 Q111 34 106 34 H96 V64 Q96 69 91 69 H83 Q78 69 78 64Z' :
    'M78 14 Q78 10 83 10 H91 Q96 10 96 14 V45 H106 Q111 45 107 50 L90 67 Q87 70 84 67 L67 50 Q63 45 68 45 H78Z';
  return sky + cutawayPlanet() + p(arrow, C('cream')) +
    p(up ? 'M91 36 V62 H95 V35Z' : 'M91 14 H95 V46 L87 58 L82 53 L87 54 L91 48Z', C('paper'), 'stroke="none"');
}
function quakeBadge() {
  // Existing badge envelope: r=28 on 64px, proportional 1.5px outline.
  return circle(32, 32, 28, C('ascension')) + circle(32, 32, 23, C('paper'), 'stroke-width="0.8"') +
    p('M15 37 L23 30 H44 L50 37 L47 49 H18Z', C('rock')) +
    p('M15 37 H49 L46 49 H18Z', C('rock-dark'), 'stroke="none"') +
    p('M33 30 L29 36 L35 40 L30 48', 'none', 'stroke-width="2.5"') +
    p('M20 19 Q18 17 20 15 L26 14 L29 19 L25 24 L21 23Z', C('rock')) +
    p('M39 25 L41 18 L47 20 L48 25 L44 28Z', C('rock-dark')) +
    p('M22 26 V28 M43 30 V32', 'none', 'stroke-width="1.5"') +
    shine('M12 24 Q15 13 26 10', 1.5) + shine('M19 34 H26', 1.5);
}
if (RELEASE >= 2) {
  emit('ui.icon-interior', 'ui', 'icon-interior', navigation(false), 128, {phase: 'P0'});
  emit('ui.icon-surface', 'ui', 'icon-surface', navigation(true), 128, {phase: 'P0'});
  emit('ui.badge-quake', 'ui', 'badge-quake', quakeBadge(), 64, {phase: 'P0'});
}

function drillBadge() {
  const defs = `<radialGradient id="drill-glow"><stop offset="0.2" stop-color="${C('energy')}" stop-opacity="0.6"/><stop offset="0.5" stop-color="${C('ascension')}" stop-opacity="0.3"/><stop offset="1" stop-color="${C('ascension')}" stop-opacity="0"/></radialGradient>`;
  const cap = `<rect x="20" y="8" width="24" height="14" rx="5" fill="${C('clay')}"/>` +
    p('M38 10 H43 V17 Q43 22 38 22 H34Z', C('clay', -.18), 'stroke="none"') + shine('M24 12 H33', 1.5);
  const bit = p('M23 22 H41 L40 46 Q38 53 32 61 Q26 53 24 46Z', C('rock')) +
    p('M35 23 H40 L39 46 L32 59 L32 49Z', C('rock-dark'), 'stroke="none"') +
    p('M24 30 L40 25 M24 39 L40 34 M25 48 L40 43 M29 55 L36 52', 'none', 'stroke-width="3"') +
    shine('M26 25 V28 M27 34 V36', 1.5) +
    p('M29 55 L32 60 L35 55Z', C('ascension'), 'stroke-width="1"') + shine('M31 55 L32 57', 1);
  return `<defs>${defs}</defs>` + g('glow', ellipse(32, 37, 30, 24, 'url(#drill-glow)', 'stroke="none"')) + g('drill', bit + cap);
}
if (RELEASE >= 3) emit('space.planet-core-drill-badge', 'space', 'planet-core-drill-badge', drillBadge(), 64, {
  anchor: [.5, 1], tintable: false, parts: ['drill', 'glow'], tags: ['star-map', 'core-reached'],
});

// The scalloped dust vocabulary comes from gen-buildings.mjs's dust/explosion
// puff. Keep it local so this generator never runs or mutates another group.
function dustPuff(x, y, scale, opacity, token = 'sand') {
  return `<g transform="translate(${x} ${y}) scale(${scale}) translate(-64 -95)" opacity="${opacity}" stroke-width="${round(6 / scale)}">` +
    p('M30 95C10 94 10 66 27 63C20 39 47 29 60 44C75 23 103 39 98 61C122 61 120 94 100 95Z', C(token)) +
    shine('M34 62Q32 48 46 47', round(3 / scale)) + '</g>';
}
function pebble(x, y, angle, scale = 1) {
  return `<g transform="translate(${x} ${y}) rotate(${angle}) scale(${scale})">` +
    p('M-8 6 L-10 -3 Q-10 -7 -4 -8 L6 -9 Q10 -7 10 -2 L8 7 Q0 12 -8 6Z', C('rock')) +
    p('M4 -7 L9 -3 L7 6 L0 8Z', C('rock-dark'), 'stroke="none"') + shine('M-5 -3 L-1 -5', 3) + '</g>';
}
function quake(f) {
  const index = f - 1, reach = [45, 74, 98, 108][index], opacity = [1, 1, .9, .4][index];
  const left = 128 - reach, right = 128 + reach;
  const plate = p(`M${left} 231 Q${left + 12} 219 95 219 H161 Q${right - 12} 219 ${right} 231 Q${right + 2} 237 ${right - 8} 237 H${left + 8} Q${left - 2} 237 ${left} 231Z`, C('rock-dark')) +
    p(`M${left + 7} 228 Q80 222 113 225 M146 224 Q174 222 ${right - 8} 229`, 'none', `stroke="${C('rock')}" stroke-width="3"`);
  // Each frame extends the same central fissure; branch tips grow outward.
  const cracks = 'M128 237 L120 230 L133 224 L126 219' +
    (f >= 2 ? ' M121 230 L98 228 L89 222 M133 224 L155 229 L168 224' : '') +
    (f >= 3 ? ' M98 228 L75 233 L61 228 L43 232 M168 224 L181 231 L199 227 L214 232 M155 229 L162 236' : '') +
    (f === 4 ? ' M43 232 L29 234 M214 232 L230 234' : '');
  const spread = [0, 10, 22, 31][index], puffScale = [.3, .5, .6, .8][index], puffOpacity = [.5, .9, .6, .2][index];
  const dust = dustPuff(82 - spread, 231 - index * 5, puffScale, puffOpacity) +
    dustPuff(176 + spread, 232 - index * 4, round(puffScale * .8), puffOpacity, 'paper');
  const rocks = [
    [[109, 212, -10], [151, 217, 15], [129, 209, 0]],
    [[91, 181, -35], [174, 194, 45], [136, 168, 25]],
    [[70, 193, -65], [194, 205, 80], [146, 178, 65]],
    [[54, 223, -100], [207, 227, 110], [157, 228, 105]],
  ][index].map(([x, y, a], i) => pebble(x, y, a, i === 2 ? .7 : 1)).join('');
  return g('cracks', plate + p(cracks, 'none', 'stroke-width="5"'), `opacity="${opacity}"`) +
    g('dust', dust) + g('rocks', rocks, `opacity="${f === 4 ? .5 : 1}"`);
}
function magmaBlob(x, y, r, angle) {
  const d = `M${-r} 0 C${-r} ${-r} ${round(-r * .2)} ${round(-r * 1.1)} ${round(-r * .2)} ${round(-r * 1.7)} Q${round(r * 1.3)} ${-r} ${r} 4 Q${round(r * .8)} ${r} 0 ${r} Q${-r} ${r} ${-r} 0Z`;
  return `<g transform="translate(${x} ${y}) rotate(${angle})">` + p(d, C('lava')) +
    ellipse(-2, 0, round(r * .6), round(r * .7), C('ascension'), 'stroke="none"') +
    ellipse(round(-r * .3), round(-r * .3), round(r * .3), round(r * .4), C('energy'), 'stroke="none"') + '</g>';
}
function magmaBurst(f) {
  const index = f - 1, glowOpacity = [.5, .8, .6, .2][index];
  const defs = `<radialGradient id="magma-glow"><stop stop-color="${C('energy')}" stop-opacity="0.4"/><stop offset="0.5" stop-color="${C('ascension')}" stop-opacity="0.2"/><stop offset="1" stop-color="${C('ascension')}" stop-opacity="0"/></radialGradient>`;
  const glow = ellipse(128, 177, 104, 62, 'url(#magma-glow)', `stroke="none" opacity="${glowOpacity}"`);
  const pool = p('M89 237 Q80 230 96 225 Q112 220 127 224 Q146 219 160 225 Q179 233 164 237Z', C('lava')) +
    ellipse(127, 228, 25, 4, C('ascension'), 'stroke="none"');
  const jets = [
    'M105 230 Q117 218 116 201 Q112 181 125 176 Q140 174 137 190 Q132 210 153 229Z',
    'M101 230 Q122 204 112 177 Q102 157 115 142 Q126 131 119 113 Q115 101 128 100 Q147 102 141 122 Q135 141 148 154 Q162 172 148 193 Q141 210 159 230Z',
    'M101 230 Q113 217 108 204 Q102 189 115 188 Q127 188 128 205 Q129 182 141 180 Q154 182 147 201 Q140 216 160 230Z',
    'M67 237 Q57 233 67 227 L85 228 Q96 224 92 215 Q88 207 95 207 Q105 208 104 224 Q120 216 137 226 Q153 218 160 205 Q165 199 169 205 Q173 212 165 225 L195 228 Q206 233 194 237Z',
  ];
  const innerJets = [
    'M118 226 Q128 211 124 193 Q134 204 139 226Z',
    'M115 226 Q133 205 124 180 Q114 161 129 149 Q143 166 135 183 Q129 207 146 226Z',
    'M119 226 Q124 214 119 202 Q133 211 136 226Z',
    'M81 232 Q109 224 127 231 Q150 227 181 232Z',
  ];
  const drops = [
    [[102, 182, 7, -25], [150, 193, 8, 35]],
    [[87, 139, 12, -35], [166, 153, 10, 35], [141, 75, 9, -5]],
    [[68, 163, 13, -65], [184, 176, 12, 60], [131, 105, 16, 20]],
    [[53, 222, 7, -95], [205, 224, 8, 85], [139, 204, 10, 65]],
  ][index].map(args => magmaBlob(...args)).join('');
  const motion = f === 1 ? '' : p(f === 2 ? 'M78 167 L73 155 M173 182 L180 168 M144 104 L147 93' :
    f === 3 ? 'M57 134 L61 143 M192 148 L187 158 M126 72 L128 80' : 'M48 205 L50 211 M211 207 L208 215 M133 181 L135 190', 'none', `stroke="${C('ascension')}" stroke-width="3" opacity="0.6"`);
  return `<defs>${defs}</defs>` + g('glow', glow) + g('magma', pool + p(jets[index], C('lava')) +
    p(innerJets[index], C('energy'), 'stroke="none"') + drops + motion, `opacity="${f === 4 ? .7 : 1}"`);
}
if (RELEASE >= 4) {
  for (const [name, draw, parts] of [['quake', quake, ['cracks', 'dust', 'rocks']], ['magma-burst', magmaBurst, ['glow', 'magma']]]) {
    emit(`fx.${name}`, 'fx', name, draw, 256, {anchor: [.5, .9375], frames: 4, fps: 10, parts, tags: [name, 'animation', 'once']});
  }
}

write('art/manifest/core-ui.json', JSON.stringify({assets}, null, 2) + '\n');
console.log(`Core and interior art: ${assets.length} ids generated (release ${RELEASE}).`);
