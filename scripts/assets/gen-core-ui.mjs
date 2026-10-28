// Original PlanetForge hollow-world art. No external artwork or random input.
// Run: node scripts/assets/gen-core-ui.mjs
// Then: npm --prefix scripts/assets run assets:gen && npm --prefix scripts/assets run assets:check
import {C, svg, round, write} from './common.mjs';

// Keep each numbered delivery checkpoint independently reproducible.
const RELEASE = 3;
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
  return `<defs>${defs}</defs>` + g('glow', ellipse(32, 38, 30, 26, 'url(#drill-glow)', 'stroke="none"')) + g('drill', bit + cap);
}
if (RELEASE >= 3) emit('space.planet-core-drill-badge', 'space', 'planet-core-drill-badge', drillBadge(), 64, {
  anchor: [.5, 1], tintable: false, parts: ['drill', 'glow'], tags: ['star-map', 'core-reached'],
});

write('art/manifest/core-ui.json', JSON.stringify({assets}, null, 2) + '\n');
console.log(`Core and interior art: ${assets.length} ids generated (release ${RELEASE}).`);
