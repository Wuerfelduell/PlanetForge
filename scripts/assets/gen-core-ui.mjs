// Original PlanetForge hollow-world art. No external artwork or random input.
// Run: node scripts/assets/gen-core-ui.mjs
// Then: npm --prefix scripts/assets run assets:gen && npm --prefix scripts/assets run assets:check
import {C, svg, round, write} from './common.mjs';

// Keep each numbered delivery checkpoint independently reproducible.
const RELEASE = 1;
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

write('art/manifest/core-ui.json', JSON.stringify({assets}, null, 2) + '\n');
console.log(`Core and interior art: ${assets.length} ids generated (release ${RELEASE}).`);
