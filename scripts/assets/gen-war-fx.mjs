// Original PlanetForge cartoon effects and HUD symbols; no external artwork.
// Run explicitly, then run assets:gen and assets:check in scripts/assets.
import {C, svg, round, write} from './common.mjs';

// Each numbered delivery remains independently reproducible from its commit.
const STAGE = 4;
const assets = [];
const path = (d, token = null, extra = '') => `<path d="${d}" fill="${token ? C(token) : 'none'}" ${extra}/>`;
const circle = (x, y, r, token, extra = '') => `<circle cx="${round(x)}" cy="${round(y)}" r="${round(r)}" ${/\bfill=/.test(extra) ? '' : `fill="${token ? C(token) : 'none'}"`} ${extra}/>`;
const ellipse = (x, y, rx, ry, token, extra = '') => `<ellipse cx="${round(x)}" cy="${round(y)}" rx="${round(rx)}" ry="${round(ry)}" ${/\bfill=/.test(extra) ? '' : `fill="${token ? C(token) : 'none'}"`} ${extra}/>`;
const line = (d, token, width, extra = '') => path(d, null, `stroke="${C(token)}" stroke-width="${width}" ${extra}`);
const shadow = (d, token) => `<path d="${d}" fill="${C(token, -.18)}" stroke="none"/>`;
const shine = (d, width = 4) => line(d, 'cream', width);
const star = (x, y, r, token = 'energy') => path(`M${x} ${round(y-r)} Q${round(x+r*.2)} ${round(y-r*.2)} ${round(x+r)} ${y} Q${round(x+r*.2)} ${round(y+r*.2)} ${x} ${round(y+r)} Q${round(x-r*.2)} ${round(y+r*.2)} ${round(x-r)} ${y} Q${round(x-r*.2)} ${round(y-r*.2)} ${x} ${round(y-r)}Z`, token);
function emit(id, category, stem, draw, {size = 256, frames = 1, fps, tags, ...meta} = {}) {
  for (let f = 1; f <= frames; f++) write(`art/src/${category}/${stem}${frames > 1 ? `-f${f}` : ''}.svg`, svg(draw(f), size));
  const name = `${stem}${frames > 1 ? '-f{f}' : ''}`;
  assets.push({id, category, src: `art/src/${category}/${name}.svg`, out: `public/assets/sprites/${category}/${name}.png`, viewBox: [size, size], anchor: [.5, .5], frames, ...(fps ? {fps} : {}), parts: [], tags, phase: 'P1', ...meta});
}
function glow(id, token) {
  return `<radialGradient id="${id}"><stop stop-color="${C(token)}" stop-opacity="0.8"/><stop offset="0.5" stop-color="${C(token)}" stop-opacity="0.3"/><stop offset="1" stop-color="${C(token)}" stop-opacity="0"/></radialGradient>`;
}
function nukeBlast(frame) {
  const radius = [40, 64, 88, 108, 118][frame - 1], alpha = [1, 1, .9, .6, .2][frame - 1];
  const defs = `<defs>${glow('uranium-glow', 'uranium')}</defs>`;
  const halo = ellipse(128, 128, [62, 86, 108, 122, 124][frame-1], [62, 86, 108, 122, 124][frame-1], null, 'fill="url(#uranium-glow)" stroke="none"');
  const shock = ellipse(128, [156, 176, 194, 205, 212][frame-1], radius, round(radius * .3), null, `stroke-width="${frame < 4 ? 6 : 4}" stroke="${C('ink')}"`) +
    ellipse(128, [156, 176, 194, 205, 212][frame-1], radius, round(radius * .3), null, `stroke-width="${frame < 4 ? 3 : 2}" stroke="${C('uranium')}"`);
  let cloud;
  if (frame === 1) {
    cloud = star(128, 138, 48, 'uranium') + circle(128, 138, 25, 'cream') + star(128, 138, 17, 'snow');
  } else {
    const size = [.5, .6, .8, 1, 1][frame-1];
    const stem = path('M104 122 Q112 153 101 176 Q94 188 80 198 Q73 211 92 215 H168 Q187 212 175 198 Q158 185 152 173 Q141 150 149 122Z', 'uranium') +
      shadow('M139 130 Q136 159 146 181 Q153 199 168 211 H143 Q126 188 128 170Z', 'uranium') +
      shine('M114 157 Q116 177 107 188', 5);
    const cap = path('M43 132 C18 132 12 111 24 96 C13 77 31 56 52 60 C52 35 83 26 101 42 C116 18 148 20 161 40 C184 26 212 46 209 65 C238 64 249 90 233 108 C243 130 221 143 203 139 C177 155 73 153 43 132Z', 'uranium') +
      shadow('M222 79 Q238 92 226 107 Q236 128 211 129 Q190 145 150 137 Q124 150 100 139 Q67 149 48 131 Q77 139 90 125 Q116 137 133 121 Q164 137 178 120 Q210 134 222 108Z', 'uranium') +
      path('M50 84 Q41 71 55 66 Q68 61 75 67 M109 49 Q123 32 141 44', null, `stroke="${C('uranium', .18)}" stroke-width="10"`) +
      shine('M57 58 Q64 42 81 46', 6) + shine('M28 100 Q26 88 34 83', 5) +
      line('M73 107 Q84 96 96 105 M161 95 Q175 84 188 95', 'leaf', 3);
    const core = ellipse(127, 122, 63, 66, null, 'fill="url(#uranium-glow)" stroke="none"') +
      star(126, 118, frame === 2 ? 19 : 12, 'cream');
    cloud = `<g transform="translate(128 145) scale(${size}) translate(-128 -145)">${stem}${cap}${core}</g>`;
  }
  return defs + `<g opacity="${alpha}">${halo}${shock}${cloud}</g>`;
}
emit('fx.nuke-blast', 'fx', 'nuke-blast', nukeBlast, {frames: 5, fps: 12, tags: ['explosion', 'animation', 'once']});

function empPulse(frame) {
  const r = [32, 57, 84, 110][frame - 1], alpha = [1, .8, .5, .1][frame - 1];
  const defs = `<defs><radialGradient id="pulse-glow"><stop offset="0.6" stop-color="${C('science')}" stop-opacity="0"/><stop offset="0.8" stop-color="${C('science')}" stop-opacity="0.4"/><stop offset="1" stop-color="${C('science')}" stop-opacity="0"/></radialGradient></defs>`;
  const ring = circle(128, 128, r + 13, null, 'fill="url(#pulse-glow)" stroke="none"') +
    circle(128, 128, r, null, 'stroke-width="10"') +
    circle(128, 128, r, null, `stroke="${C('player-2')}" stroke-width="7"`) +
    circle(128, 128, r - 1, null, `stroke="${C('science')}" stroke-width="3"`) +
    line(`M${round(128-r*.8)} ${round(128-r*.6)} A${r} ${r} 0 0 1 ${round(128-r*.2)} ${round(128-r)}`, 'snow', 3);
  let sparks = '';
  for (const angle of [24, 110, 200, 285]) {
    const a = (angle + frame * 5) * Math.PI / 180, x = round(128 + Math.cos(a) * r), y = round(128 + Math.sin(a) * r);
    const bolt = path('M3 -12 Q5 -15 4 -10 L1 -3 H8 Q11 -3 8 1 L-3 12 Q-6 15 -4 10 L-2 3 H-9 Q-11 3 -8 0Z', 'energy', 'stroke-width="3"');
    sparks += `<g transform="translate(${x} ${y}) rotate(${angle + frame * 5 + 45})">${bolt}</g>`;
  }
  return defs + `<g opacity="${alpha}">${ring}${sparks}</g>`;
}
if (STAGE >= 2) emit('fx.emp-pulse', 'fx', 'emp-pulse', empPulse, {frames: 4, fps: 10, tags: ['emp-pulse', 'animation', 'once']});

function empBadge() {
  const backing = circle(32, 32, 28, 'paper');
  const ring = circle(32, 32, 20, null, 'stroke-width="3.5" stroke-dasharray="18 6 12 6"') +
    circle(32, 32, 20, null, `stroke="${C('science')}" stroke-width="2" stroke-dasharray="18 6 12 6"`) +
    line('M13 19 L17 23 M46 16 L43 20 M48 46 L44 43', 'science', 2);
  const cable = line('M25 39 V43 Q25 48 32 48 H36', 'ink', 5) + line('M25 39 V43 Q25 48 32 48 H36', 'rock-dark', 2.5);
  const plug = line('M20 25 V17 M29 25 V17', 'ink', 5) + line('M20 24 V17 M29 24 V17', 'rock', 2) +
    '<rect x="16" y="24" width="18" height="16" rx="5" fill="' + C('rock-dark') + '"/>' +
    shadow('M29 26 H32 V34 Q32 38 28 38 H22 Q29 36 29 26Z', 'rock-dark') +
    shine('M19 28 V32', 1.5) + line('M22 36 H28', 'science', 1.5);
  const bolt = path('M42 22 Q44 19 43 23 L41 31 H48 Q50 31 48 34 L39 44 Q37 46 38 42 L40 36 H35 Q33 36 35 33Z', 'energy', 'stroke-width="1.5"');
  return backing + ring + cable + plug + bolt;
}
if (STAGE >= 3) emit('ui.badge-emp', 'ui', 'badge-emp', empBadge, {size: 64, tags: ['ui', 'badge-emp']});

function incomingMissileBadge() {
  const backing = circle(32, 32, 28, 'paper');
  const radar = circle(32, 40, 17, null, `stroke="${C('danger')}" stroke-width="2.5"`) +
    circle(32, 40, 13, 'deep-water', 'stroke-width="1.5"') +
    circle(32, 40, 8, null, `stroke="${C('science')}" stroke-width="1"`) +
    line('M19 40 H45 M32 27 V53', 'science', 1) +
    path('M32 40 L42 33 Q47 40 41 47Z', 'science', 'stroke="none" opacity="0.5"') +
    line('M32 40 L42 33', 'snow', 1) + circle(37, 44, 2, 'energy', 'stroke-width="1"');
  const fins = path('M28 14 L23 10 Q21 8 21 12 L22 21 L28 23 M36 14 L41 10 Q43 8 43 12 L42 21 L36 23', 'rock-dark', 'stroke-width="1.5"');
  const missile = fins + path('M28 13 Q32 10 36 13 V23 Q36 28 32 33 Q28 28 28 23Z', 'cream', 'stroke-width="1.5"') +
    shadow('M34 13 L35 14 V23 Q35 27 32 31 L32 26 Q34 21 34 13Z', 'cream') +
    path('M28 23 H36 Q36 28 32 33 Q28 28 28 23Z', 'danger', 'stroke-width="1.5"') +
    shine('M30 15 V20', 1.5) + line('M32 8 V10', 'energy', 2);
  return backing + radar + missile;
}
if (STAGE >= 4) emit('ui.badge-incoming-missile', 'ui', 'badge-incoming-missile', incomingMissileBadge, {size: 64, tags: ['ui', 'badge-incoming-missile']});

write('art/manifest/war-fx.json', JSON.stringify({assets}, null, 2) + '\n');
console.log(`War FX: ${assets.length} ids generated (stage ${STAGE}).`);
