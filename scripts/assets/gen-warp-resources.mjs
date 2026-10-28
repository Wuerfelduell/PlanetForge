// Original, deterministic PlanetForge warp-resource geometry; no external assets.
// Run this generator before assets:gen, which merges all manifest fragments.
import { C, svg, write } from './common.mjs';

const assets = [];
// Local drawing helpers follow gen-ores.mjs / gen-gems.mjs conventions.
const p = (d, token, extra = '', tone = 0) => `<path d="${d}" fill="${token === 'none' ? 'none' : C(token, tone)}" ${extra}/>`;
const line = (d, token, width) => p(d, 'none', `stroke="${C(token)}" stroke-width="${width}"`);
const circle = (x, y, r, token, extra = '') => `<circle cx="${x}" cy="${y}" r="${r}" fill="${C(token)}" ${extra}/>`;
const rect = (x, y, w, h, r, token) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="${C(token)}"/>`;

function antimatter(mini) {
  // Wide glass chamber between two metal caps. The core remains visible at 20 px.
  return rect(30, 26, 68, 77, 21, 'glacier') +
    p('M82 31Q98 36 98 51V82Q98 99 81 103H69Q85 91 85 74V48Z', 'science', 'stroke="none"') +
    circle(64, 65, 25, 'danger', mini ? 'stroke="none"' : 'stroke-width="1.5"') +
    p('M43 51Q56 35 75 44Q90 51 87 69Q83 53 69 53Q56 53 56 65Q44 66 43 51Z', 'crystal', 'stroke="none"') +
    p('M85 76Q73 94 54 86Q40 80 40 64Q48 79 62 77Q73 75 73 64Q84 64 85 76Z', 'danger', 'stroke="none"', -.18) +
    circle(64, 65, mini ? 11 : 10, 'space-deep', 'stroke="none"') +
    (mini ? '' : line('M48 55Q57 43 71 48M80 76Q70 86 57 81', 'danger', 3) +
      line('M47 50Q51 46 56 46', 'cream', 3)) +
    line(mini ? 'M38 44V57' : 'M38 44V57M38 77V82', 'snow', mini ? 6 : 4) +
    rect(27, 16, 74, 21, 8, 'rock') +
    p('M29 29H99V30Q99 37 91 37H37Q29 37 29 29Z', 'rock-dark', 'stroke="none"') +
    rect(27, 92, 74, 21, 8, 'rock') +
    p('M29 104H99Q99 113 91 113H37Q29 113 29 104Z', 'rock-dark', 'stroke="none"') +
    line('M39 23H64M39 98H55', 'snow', mini ? 5 : 3) +
    (mini ? '' : line('M83 22V29M83 98V105', 'coal', 3));
}

function neutronium(mini) {
  // A compact, grounded cube: broad dark faces, no sparkle or floating debris.
  const outline = 'M29 40L59 25Q64 23 69 26L98 41Q102 43 102 49V86Q102 91 98 94L69 109Q64 112 59 109L29 94Q25 92 25 86V49Q25 43 29 40Z';
  return p(outline, 'deep-water', '', -.18) +
    p('M26 46L64 64V110L29 94Q25 92 25 86V49Z', 'space-deep', 'stroke="none"', .18) +
    p('M64 64L102 46V86Q102 91 98 94L69 109L64 110Z', 'space-deep', 'stroke="none"') +
    p(outline, 'none') +
    line('M27 45L64 64L100 46M64 64V108', 'ink', mini ? 4 : 1.5) +
    line('M32 42L61 28Q64 27 67 29L78 34', 'snow', mini ? 6 : 3) +
    line('M29 51V82', 'glacier', mini ? 4 : 2) +
    // Tiny recessed dents have a lit lower lip and a dark upper edge.
    p('M39 70Q43 67 47 71L45 76L40 75Z', 'space-deep', 'stroke="none"') +
    line('M40 76H44', 'rock-dark', mini ? 3 : 1.5) +
    (mini ? '' : p('M78 83L83 80L87 83L84 88L79 87Z', 'ink', 'stroke="none"') +
      line('M80 88L84 89', 'deep-water', 1.5) +
      p('M61 41L66 39L71 42L67 45Z', 'space-deep', 'stroke="none"') +
      line('M62 45L67 46', 'science', 1.5));
}

function xenocrystal(mini) {
  // Three curved, asymmetrical growths with twisted facet seams, never hex prisms.
  const left = 'M51 105Q29 102 23 82Q18 67 14 52Q13 46 19 49L41 58Q53 65 55 81L60 98Z';
  const right = 'M73 104Q90 102 99 84Q108 67 112 43Q113 37 107 40L88 51Q77 62 76 79L66 99Z';
  const center = 'M48 105Q39 92 44 76Q52 56 52 44Q50 29 68 15Q73 11 72 18Q69 32 79 48Q88 65 77 84Q71 94 78 106Q65 115 48 105Z';
  return p(left, 'ok') +
    p('M18 53Q27 78 44 84L51 103Q34 101 26 85Z', 'ok', 'stroke="none"', -.18) +
    p('M27 62Q33 70 43 73L46 90Q36 84 27 62Z', 'crystal', 'stroke="none"') +
    p(left, 'none') +
    p(right, 'ok', '', -.18) +
    p('M108 44Q97 64 90 73Q82 85 75 101L81 75Q85 56 108 44Z', 'ok', 'stroke="none"') +
    p('M99 59Q95 78 83 89L88 74Z', 'crystal', 'stroke="none"') +
    p(right, 'none') +
    p(center, 'ok') +
    p('M70 20Q66 40 77 51Q87 65 75 84Q68 97 76 105L61 109Q54 93 62 78Q72 61 63 48Q58 37 70 20Z', 'ok', 'stroke="none"', -.18) +
    p('M65 45Q78 59 67 78Q59 92 63 102Q49 93 56 77Q65 61 61 51Z', 'crystal', 'stroke="none"') +
    (mini ? '' : p('M65 57Q70 65 61 80Q57 88 60 94Q52 87 60 72Z', 'crystal', 'stroke="none"', .18)) +
    p(center, 'none') +
    line(mini ? 'M58 39Q59 30 65 25' : 'M58 40Q57 30 65 25M22 56L31 61M99 50L104 46', 'snow', mini ? 5 : 3) +
    (mini ? '' : line('M48 98Q46 88 51 78M80 98Q89 89 93 80', 'leaf', 1.5));
}

for (const [name, draw] of Object.entries({ antimatter, neutronium, xenocrystal })) {
  for (const mini of [false, true]) {
    const size = mini ? 64 : 128;
    const stem = `${name}${mini ? '-mini' : ''}`;
    const src = `art/src/resources/${stem}.svg`;
    // Geometry stays on the 128 grid; minis remove details and use a true 4 px outline.
    const body = mini ? `<g transform="scale(0.5)" stroke-width="8">${draw(true)}</g>` : draw(false);
    write(src, svg(body, size, size, mini ? 4 : 3));
    assets.push({
      id: `resource.${name}${mini ? '.mini' : ''}`, category: 'resources', src,
      out: `public/assets/sprites/resources/${stem}.png`, viewBox: [size, size],
      anchor: [.5, .5], frames: 1, parts: [],
      tags: ['warp-resources', 'rare', name, ...(mini ? ['mini'] : [])], phase: 'P1',
    });
  }
}

write('art/manifest/warp-resources.json', JSON.stringify({ assets }, null, 2) + '\n');
console.log(`Warp resource art: ${assets.length} ids generated.`);
