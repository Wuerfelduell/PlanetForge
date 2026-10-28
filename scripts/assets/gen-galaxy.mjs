// Original PlanetForge galaxy art. No external artwork or dependencies.
// Run this generator, then assets:gen and assets:check in scripts/assets.
import {C, svg, round, write} from './common.mjs';

// Keep each delivery checkpoint reproducible from its commit.
const STAGE = 1;
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

write('art/manifest/galaxy.json', JSON.stringify({assets}, null, 2) + '\n');
console.log(`Galaxy art: ${assets.length} ids generated (stage ${STAGE}).`);
