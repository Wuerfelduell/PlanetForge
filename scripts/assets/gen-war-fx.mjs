// Original PlanetForge cartoon effects and HUD symbols; no external artwork.
// Run explicitly, then run assets:gen and assets:check in scripts/assets.
import {C, svg, round, write} from './common.mjs';

// Each numbered delivery remains independently reproducible from its commit.
const STAGE = 1;
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

write('art/manifest/war-fx.json', JSON.stringify({assets}, null, 2) + '\n');
console.log(`War FX: ${assets.length} ids generated (stage ${STAGE}).`);
