// Original PlanetForge galaxy art. No external artwork or dependencies.
// Run this generator, then assets:gen and assets:check in scripts/assets.
import {C, svg, round, write} from './common.mjs';

// Keep each delivery checkpoint reproducible from its commit.
const STAGE = 3;
const assets = [];
const path = (d, fill = 'none', extra = '') => `<path d="${d}" fill="${fill}" ${extra}/>`;
const circle = (x, y, r, fill, extra = '') => `<circle cx="${round(x)}" cy="${round(y)}" r="${round(r)}" fill="${fill}" ${extra}/>`;
const ellipse = (x, y, rx, ry, fill, extra = '') => `<ellipse cx="${round(x)}" cy="${round(y)}" rx="${round(rx)}" ry="${round(ry)}" fill="${fill}" ${extra}/>`;
const group = (id, body, extra = '') => `<g id="${id}" ${extra}>${body}</g>`;
const line = (d, token, width, extra = '') => path(d, 'none', `stroke="${C(token)}" stroke-width="${width}" ${extra}`);
const shadow = (d, token) => path(d, C(token, -.18), 'stroke="none"');
const shine = (d, width = 2) => line(d, 'cream', width);
function emit(id, stem, draw, {size = [128, 128], anchor = [.5, .5], frames = 1, fps, parts = [], tags = [], ...meta} = {}) {
  for (let f = 1; f <= frames; f++) write(`art/src/space/${stem}${frames > 1 ? `-f${f}` : ''}.svg`, svg(draw(f), ...size));
  const name = `${stem}${frames > 1 ? '-f{f}' : ''}`;
  assets.push({id, category: 'space', src: `art/src/space/${name}.svg`, out: `public/assets/sprites/space/${name}.png`, viewBox: size, anchor, frames, ...(fps ? {fps} : {}), parts, tags, phase: 'P1', ...meta});
}

function warpShip(frame) {
  // A broad cream explorer, rather than the invaders' saucer silhouette.
  // Only the engine plume and coil luminosity pulse; hull and anchor stay fixed.
  const coil = 'M65 26 A16 38 0 1 1 65 102 A16 38 0 1 1 65 26Z';
  const back = path(coil, 'none', `stroke="${C('ink')}" stroke-width="11"`) +
    path(coil, 'none', `stroke="${C('crystal')}" stroke-width="7"`) +
    line('M65 26 A16 38 0 0 1 65 102', 'science', 3);
  const exhaust = path(`M29 55 Q15 52 ${frame === 1 ? 9 : 4} 64 Q15 77 29 73Z`, C('crystal')) +
    path(`M28 59 Q18 58 ${frame === 1 ? 15 : 10} 64 Q18 70 28 69Z`, C('science'), 'stroke="none"') +
    path('M28 62 L19 64 L28 66Z', C('snow'), 'stroke="none"');
  const hull = back +
    path('M37 49 L30 31 Q29 27 34 28 L56 45 M37 79 L30 97 Q29 101 34 100 L56 83', C('deep-water')) +
    path('M26 55 Q23 64 26 73 L39 75 V53Z', C('rock-dark')) +
    path('M35 47 Q77 32 111 53 Q122 60 122 64 Q122 68 111 75 Q77 96 35 81 Q30 64 35 47Z', C('cream')) +
    shadow('M34 72 Q78 86 112 72 L111 75 Q77 96 35 81Z', 'cream') +
    path('M87 45 Q103 48 111 54 L114 61 Q100 65 87 61 Q83 53 87 45Z', C('deep-water')) +
    path('M88 47 Q101 50 108 54 L109 58 Q100 60 89 58Z', C('science'), 'stroke="none"') +
    shine('M91 49 L99 52', 1.5) + shine('M39 49 Q46 46 53 46') +
    line('M91 76 L101 73', 'rock-dark', 1.5) +
    circle(110, 67, 2, C('science'), 'stroke="none"') +
    path('M65 26 A16 38 0 0 0 65 102', 'none', `stroke="${C('ink')}" stroke-width="11"`) +
    line('M65 26 A16 38 0 0 0 65 102', 'crystal', 7) +
    line('M65 27 A16 37 0 0 0 65 101', 'science', frame === 1 ? 3 : 4) +
    line('M61 30 Q53 37 51 46', 'snow', 2) +
    line('M53 82 Q55 92 61 97', 'crystal', 3);
  return group('exhaust', exhaust) + group('hull', hull) + '<g id="engine-anchor" transform="translate(26.8 64)"/>';
}
emit('ship.warp', 'ship-warp', warpShip, {frames: 2, fps: 6, parts: ['hull', 'exhaust', 'engine-anchor'], tags: ['star-map', 'ship', 'nose-right', 'flight', 'loop']});

function halo(id, token, alpha = .5) {
  return `<radialGradient id="${id}"><stop offset="0.3" stop-color="${C(token)}" stop-opacity="${alpha}"/><stop offset="1" stop-color="${C(token)}" stop-opacity="0"/></radialGradient>`;
}
function sunDefs(token, highlight = C(token, .18)) {
  return `<defs>${halo('sun-glow', token)}<radialGradient id="sun-core" cx="32%" cy="28%" r="75%"><stop stop-color="${highlight}"/><stop offset="0.6" stop-color="${C(token)}"/><stop offset="1" stop-color="${C(token, -.18)}"/></radialGradient><filter id="soft" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="16"/></filter></defs>`;
}
function nebulaSun() {
  const veil = 'M202 670 C62 538 266 261 547 228 C745 205 936 307 825 470 C941 319 723 302 552 340 C330 388 180 539 202 670Z';
  let veils = path(veil, C('crystal'), 'stroke="none" opacity="0.3"') +
    path('M812 351 C970 513 756 793 461 805 C275 812 112 713 198 568 C150 720 347 735 486 695 C703 633 844 481 812 351Z', C('danger', .18), 'stroke="none" opacity="0.3"');
  const glow = circle(512, 512, 496, 'url(#sun-glow)', 'stroke="none"') +
    group('veils-soft', veils, 'filter="url(#soft)"') +
    circle(512, 512, 236, C('crystal'), 'stroke="none" opacity="0.4" filter="url(#soft)"');
  veils += line('M196 614 C167 463 368 275 581 266', 'crystal', 12, 'opacity="0.3"') +
    line('M821 415 C866 564 671 746 457 765', 'danger', 10, 'opacity="0.2"');
  const core = circle(512, 512, 220, 'url(#sun-core)') +
    path('M322 454 C359 392 420 373 456 400 C478 431 419 454 388 464 C350 477 365 503 389 516 C325 513 304 488 322 454Z', C('danger', .18), 'stroke="none" opacity="0.4"') +
    line('M359 418 Q385 370 439 359', 'cream', 20, 'opacity="0.7"') +
    path('M237 669 C349 720 622 642 754 510 C812 451 826 404 812 372 C906 490 686 719 473 746 C350 761 264 726 237 669Z', C('crystal', .18), 'stroke="none" opacity="0.6"') +
    line('M296 694 C427 717 627 630 735 531', 'danger', 12, 'opacity="0.4"');
  return sunDefs('crystal', C('danger', .18)) + group('glow', glow) + group('rays', veils) + group('core', core);
}
function neutronSun() {
  const glow = circle(512, 512, 496, 'url(#sun-glow)', 'stroke="none"') +
    circle(512, 512, 136, C('science', .18), 'stroke="none" opacity="0.7" filter="url(#soft)"') +
    [202, 290, 388].map((r, i) => ellipse(512, 512, r, round(r * .8), 'none', `stroke="${C('science')}" stroke-width="${8 - i * 2}" opacity="${[.3, .2, .1][i]}" transform="rotate(-18 512 512)"`)).join('');
  const beam = path('M503 407 Q506 241 510 70 Q512 56 514 70 Q518 241 521 407Z', C('science'), 'stroke="none" opacity="0.6"') +
    line('M512 398 V85', 'snow', 5) +
    path('M503 617 Q506 783 510 954 Q512 968 514 954 Q518 783 521 617Z', C('science'), 'stroke="none" opacity="0.6"') +
    line('M512 626 V939', 'snow', 5);
  const core = circle(512, 512, 112, 'url(#sun-core)') +
    circle(497, 497, 74, C('snow'), 'stroke="none"') +
    line('M437 479 Q451 442 482 436', 'tint-white', 14) +
    ellipse(471, 453, 8, 5, C('tint-white'), 'stroke="none"');
  return sunDefs('science', C('tint-white')) + group('glow', glow) + group('rays', beam, 'transform="rotate(18 512 512)"') + group('core', core);
}
function crystalShard(x, y, w, h) {
  const l = round(x - w / 2), r = round(x + w / 2), t = round(y - h / 2), b = round(y + h / 2);
  return path(`M${x - 4} ${t + 4} Q${x} ${t - 3} ${x + 4} ${t + 4} L${r - 2} ${y - 4} Q${r + 1} ${y} ${r - 2} ${y + 4} L${x + 4} ${b - 4} Q${x} ${b + 3} ${x - 4} ${b - 4} L${l + 2} ${y + 4} Q${l - 1} ${y} ${l + 2} ${y - 4}Z`, C('ok')) +
    path(`M${x} ${t + 7} L${r - 6} ${y} L${x} ${b - 7} L${x + 5} ${y}Z`, C('ok', -.18), 'stroke="none"') +
    line(`M${l + 9} ${y - 3} L${x - 4} ${t + 18}`, 'snow', 7) +
    line(`M${l + 6} ${y} L${x + 5} ${y} L${r - 6} ${y}`, 'deep-water', 5);
}
function crystalSun() {
  const glow = circle(512, 512, 496, 'url(#sun-glow)', 'stroke="none"') +
    circle(512, 512, 254, C('ok'), 'stroke="none" opacity="0.4" filter="url(#soft)"');
  let rays = ellipse(512, 512, 347, 282, 'none', `stroke="${C('ok')}" stroke-width="12" opacity="0.2" transform="rotate(-24 512 512)"`);
  for (const [x, y, w, h] of [[512, 174, 58, 118], [793, 330, 74, 100], [820, 634, 62, 94], [579, 843, 68, 112], [268, 745, 60, 96], [186, 425, 66, 110]]) rays += crystalShard(x, y, w, h);
  const core = circle(512, 512, 224, 'url(#sun-core)') +
    path('M635 332 A224 224 0 0 1 377 691 Q661 693 635 332Z', C('ok', -.18), 'stroke="none" opacity="0.4"') +
    line('M354 429 Q378 366 439 350', 'cream', 20, 'opacity="0.7"') +
    ellipse(401, 389, 15, 10, C('snow'), 'stroke="none" opacity="0.4"') +
    line('M574 662 Q616 651 641 617', 'science', 10, 'opacity="0.4"');
  return sunDefs('ok') + group('glow', glow) + group('rays', rays) + group('core', core);
}
if (STAGE >= 2) for (const [name, draw] of [['nebula', nebulaSun], ['neutron', neutronSun], ['crystal', crystalSun]]) emit(`space.sun-${name}`, `sun-${name}`, draw, {size: [1024, 1024], parts: ['glow', 'rays', 'core']});

function galaxyBackground() {
  const defs = `<defs><linearGradient id="space-bg" x2="0" y2="1"><stop stop-color="${C('space-deep')}"/><stop offset="1" stop-color="${C('space')}"/></linearGradient>${halo('galaxy-haze', 'crystal', .1)}${halo('galaxy-core', 'science', .2)}<radialGradient id="galaxy-arm" gradientUnits="userSpaceOnUse" cx="512" cy="1024" r="620" gradientTransform="translate(512 1024) scale(1 1.6) translate(-512 -1024)"><stop stop-color="${C('science')}" stop-opacity="0.3"/><stop offset="0.5" stop-color="${C('crystal')}" stop-opacity="0.2"/><stop offset="1" stop-color="${C('crystal')}" stop-opacity="0"/></radialGradient></defs>`;
  let body = path('M0 0 H1024 V2048 H0Z', 'url(#space-bg)', 'stroke="none"') +
    ellipse(512, 1024, 510, 910, 'url(#galaxy-haze)', 'stroke="none"');
  // Broad translucent strokes feather the arms without sharp dust lanes,
  // point stars, filters or noise competing with system markers.
  for (let arm = 0; arm < 2; arm++) {
    let d = '';
    for (let i = 0; i <= 32; i++) {
      const t = i / 32 * 4.8, r = 40 + 86 * t, angle = t + arm * Math.PI - 1.2;
      d += `${i ? ' L' : 'M'}${round(512 + Math.cos(angle) * r)} ${round(1024 + Math.sin(angle) * r * 1.6)}`;
    }
    let softArm = '';
    for (let width = 180; width >= 20; width -= 8) softArm += path(d, 'none', `stroke="url(#galaxy-arm)" stroke-width="${width}" opacity="0.1"`);
    body += `<g opacity="0.2">${softArm}</g>`;
  }
  body += ellipse(512, 1024, 198, 310, 'url(#galaxy-core)', 'stroke="none"');
  return defs + group('background', body);
}
function systemMarker() {
  const defs = `<defs>${halo('marker-glow', 'tint-white', .4)}</defs>`;
  let orbits = '';
  for (const angle of [-24, 32]) orbits += ellipse(64, 64, 43, 16, 'none', `transform="rotate(${angle} 64 64)" stroke-width="4"`) +
    ellipse(64, 64, 43, 16, 'none', `transform="rotate(${angle} 64 64)" stroke="${C('tint-white')}" stroke-width="1.5" opacity="0.7"`);
  const star = path('M61 39 Q64 31 67 39 L73 53 Q74 55 77 56 L91 61 Q99 64 91 67 L77 72 Q74 73 73 76 L67 90 Q64 98 61 90 L55 76 Q54 73 51 72 L37 67 Q29 64 37 61 L51 56 Q54 55 55 53Z', C('tint-white')) +
    path('M68 43 L73 53 Q74 55 77 56 L91 61 Q99 64 91 67 L77 72 Q74 73 73 76 L67 90 Q64 98 61 90 L60 86 Q74 68 68 43Z', C('snow'), 'stroke="none"') +
    shine('M60 48 L57 56', 1.5);
  return defs + group('glow', circle(64, 64, 59, 'url(#marker-glow)', 'stroke="none"')) + group('orbits', orbits) +
    group('star', star) + circle(27, 83, 4, C('tint-white'), 'stroke-width="1.5"') + circle(100, 84, 3, C('tint-white'), 'stroke-width="1.5"');
}
function alienBadge() {
  // All painted pixels, including the outline, stay in x >= 64, y <= 64.
  const planet = circle(92, 45, 15, C('ok')) +
    path('M100 33 A15 15 0 0 1 81 55 Q103 56 100 33Z', C('ok', -.18), 'stroke="none"') +
    path('M79 39 Q84 31 91 32 L96 38 L90 42 L86 39Z', C('science'), 'stroke-width="1.5"') + shine('M81 41 Q82 36 86 35', 1.5);
  const flag = line('M92 45 V13', 'ink', 4) + line('M92 44 V14', 'cream', 1.5) +
    path('M93 14 Q99 10 106 14 Q112 18 118 14 V29 Q111 33 105 29 Q99 25 93 29Z', C('crystal')) +
    shine('M97 16 Q101 15 105 17', 1.5) + circle(105, 22, 2.5, C('cream'), 'stroke="none"');
  return group('planet', planet) + group('flag', flag);
}
function warpLane() {
  const defs = `<defs>${halo('lane-glow', 'crystal', .5)}</defs>`;
  const dash = ellipse(32, 32, 29, 19, 'url(#lane-glow)', 'stroke="none"') +
    '<rect x="17" y="27" width="30" height="10" rx="5" fill="' + C('crystal') + '"/>' +
    line('M22 30 H42', 'science', 3) + line('M22 29 H31', 'snow', 1.5);
  return defs + group('dot', dash);
}
if (STAGE >= 3) {
  emit('space.galaxy-bg', 'galaxy-bg', galaxyBackground, {size: [1024, 2048], parts: ['background']});
  emit('space.galaxy-system', 'galaxy-system', systemMarker, {parts: ['glow', 'orbits', 'star'], tags: ['star-map', 'system', 'tintable'], tintable: true});
  emit('space.galaxy-system-alien', 'galaxy-system-alien', alienBadge, {parts: ['planet', 'flag'], tags: ['star-map', 'system', 'inhabited', 'overlay']});
  emit('space.warp-lane', 'warp-lane', warpLane, {size: [64, 64], parts: ['dot'], tags: ['star-map']});
}

write('art/manifest/galaxy.json', JSON.stringify({assets}, null, 2) + '\n');
console.log(`Galaxy art: ${assets.length} ids generated (stage ${STAGE}).`);
