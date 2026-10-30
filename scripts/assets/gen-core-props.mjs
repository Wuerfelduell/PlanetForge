import { C, svg, round, write } from './common.mjs';

// Cave harvest stages. Run this file before assets:gen (which merges fragments).
// Drawing helpers copied from gen-core-biomes.mjs and gen-depleted.mjs.
// Change geometry, not SVG scale: every stage retains the 3px outer outline.
const flat = 'stroke="none"';
const path = (d, fill = 'none', extra = '') => `<path d="${d}" fill="${fill}" ${extra}/>`;
const ellipse = (x, y, rx, ry, fill, extra = '') => `<ellipse cx="${round(x)}" cy="${round(y)}" rx="${round(rx)}" ry="${round(ry)}" fill="${fill}" ${extra}/>`;
const circle = (x, y, r, fill, extra = '') => ellipse(x, y, r, r, fill, extra);
const line = (d, token, width = 1.5, extra = '') => path(d, 'none', `stroke="${C(token)}" stroke-width="${width}" ${extra}`);
const group = (id, body) => `<g id="${id}">${body}</g>`;
const shadow = () => ellipse(64, 116, 40, 4, C('ink'), `${flat} opacity="0.2"`);
function glowingSpot(x, y, rx, ry) {
  return ellipse(x, y, rx + 2, ry + 2, C('ok'), `${flat} opacity="0.2"`)
    + ellipse(x, y, rx, ry, C('ok'), flat)
    + ellipse(x - 1, y - 1, rx * .5, ry * .4, C('ok', .18), flat);
}

// Round umbrella for A; narrow bell and companion mushroom for B.
function youngMushroom(x, height, half, bell = false) {
  const top = 118.5 - height, cap = top + height * (bell ? .43 : .34);
  const stem = half * .24;
  let b = path(`M ${x - stem - 2} 118.5 Q ${x + 1} ${cap + 15} ${x - stem} ${cap} H ${x + stem} Q ${x + stem - 3} 108 ${x + stem + 4} 118.5 Z`, C('clay', .18));
  b += path(`M ${x + 2} ${cap + 2} H ${x + stem - 1} Q ${x + stem - 3} 108 ${x + stem + 2} 117 H ${x + 2} Z`, C('clay'), flat);
  if (height > 40) b += line(`M ${x - 2} ${cap + 11} Q ${x} 99 ${x - 2} 109`, 'cream', 2);
  b += ellipse(x, cap + 2, half - 2, height > 40 ? 6 : 3.5, C('oil-sheen', -.18));
  if (height > 40) b += line(`M ${x - half + 8} ${cap + 2} Q ${x} ${cap + 10} ${x + half - 7} ${cap + 1}`, 'clay', 1.5);
  b += path(bell
    ? `M ${x - half} ${cap - 2} Q ${x - half * .5} ${cap - 12} ${x - half * .5} ${top + 8} Q ${x - 3} ${top - 3} ${x + 3} ${top + 1} Q ${x + half * .5} ${top + 3} ${x + half * .5} ${top + 12} Q ${x + half * .7} ${cap - 6} ${x + half} ${cap - 2} Q ${x + half + 4} ${cap + 4} ${x + half - 4} ${cap + 5} Q ${x + 6} ${cap + 8} ${x} ${cap + 4} Q ${x - half + 5} ${cap + 10} ${x - half} ${cap + 4} Z`
    : `M ${x - half} ${cap - 2} Q ${x - half + 2} ${top + 2} ${x - 5} ${top} Q ${x + half - 8} ${top - 4} ${x + half} ${cap - 2} Q ${x + half + 4} ${cap + 5} ${x + half - 3} ${cap + 5} Q ${x + half * .5} ${cap + 8} ${x + half * .3} ${cap + 3} Q ${x} ${cap + 9} ${x - half * .2} ${cap + 4} Q ${x - half * .7} ${cap + 10} ${x - half} ${cap + 4} Z`, C('oil-sheen'));
  b += path(`M ${x - half + 2} ${cap + 2} Q ${x - 5} ${cap + 6} ${x + 1} ${cap} Q ${x + half - 4} ${cap + 5} ${x + half} ${cap - 2} Q ${x + half + 4} ${cap + 5} ${x + half - 3} ${cap + 5} Q ${x + 5} ${cap + 8} ${x} ${cap + 4} Q ${x - half + 4} ${cap + 9} ${x - half + 2} ${cap + 2} Z`, C('oil-sheen', -.18), flat);
  b += path(`M ${x - half * .55} ${top + height * .18} Q ${x - half * .4} ${top + 5} ${x - 4} ${top + 4}`, 'none', `stroke="${C('crystal', -.18)}" stroke-width="2"`);
  const glow = glowingSpot(x - half * .3, top + height * .2, height > 40 ? 4 : 2.5, height > 40 ? 3 : 2)
    + (height > 40 ? glowingSpot(x + half * .42, cap - 7, 3, 2) : '');
  return { body: b, glow };
}
function cutStalk(x, half, top) {
  return path(`M ${x - half - 3} 118.5 Q ${x - half + 1} 112 ${x - half} ${top} H ${x + half} Q ${x + half - 1} 112 ${x + half + 4} 118.5 Z`, C('clay', .18))
    + path(`M ${x + 2} ${top + 2} H ${x + half - 1} L ${x + half + 2} 117 H ${x + 2} Z`, C('clay'), flat)
    + ellipse(x, top, half, 3.5, C('paper'))
    + ellipse(x, top, half * .5, 1.2, C('clay', -.18), flat);
}
function mushrooms(variant, stage) {
  if (!stage) {
    const x = variant ? 55 : 64;
    return cutStalk(x, variant ? 9 : 12, 105)
      + (variant ? cutStalk(90, 6, 111) : '')
      + group('cap-glow', glowingSpot(x - 14, 100, 2, 1.5) + glowingSpot(x + 11, 94, 2, 2) + glowingSpot(x + 20, 111, 1.5, 1));
  }
  const main = youngMushroom(variant ? 56 : 64, stage === 1 ? (variant ? 33 : 30) : (variant ? 75 : 69), stage === 1 ? (variant ? 13 : 17) : (variant ? 24 : 32), !!variant);
  const companion = variant ? youngMushroom(stage === 1 ? 81 : 88, stage === 1 ? 15 : 34, stage === 1 ? 8 : 15) : { body: '', glow: '' };
  return main.body + companion.body + group('cap-glow', main.glow + companion.glow);
}

// gen-depleted's crystalTip geometry, using the parent grotto's glacier palette
// and y=118.5 base. Short shoulders keep tiny stubs from self-intersecting.
function crystalTip(x, height, width, broken = false) {
  const left = x - width / 2, right = x + width / 2, top = 118.5 - height;
  const shoulder = top + Math.min(14, height * .3);
  if (broken) return path(`M ${left} 112 L ${left} ${top + 3} L ${x - 3} ${top} L ${x + 2} ${top + 4} L ${right} ${top + 1} L ${right} 112 L ${x} 118.5 Z`, C('glacier', -.18))
    + path(`M ${left + 1} ${top + 3} L ${x - 3} ${top} L ${x + 2} ${top + 4} L ${right - 1} ${top + 1} L ${right - 1} ${top + 6} L ${x} ${top + 8} Z`, C('glacier'), 'stroke-width="1.5"');
  return path(`M ${left} 112 L ${left} ${shoulder} Q ${left} ${shoulder - 3} ${x} ${top} L ${right} ${shoulder} L ${right} 112 L ${x} 118.5 Z`, C('glacier'))
    + path(`M ${x} ${top + 3} V 116 L ${right - 2} 111 V ${shoulder + 1} Z`, C('glacier', -.18), flat)
    + line(`M ${left + 3} ${shoulder + 4} V 109`, 'snow', height > 40 ? 2 : 1.5);
}
function crystals(variant, stage) {
  let b = ellipse(64, 114, stage === 2 ? 32 : 25, 4, C('science'), `${flat} opacity="0.1"`);
  if (!stage) {
    b += variant
      ? crystalTip(43, 15, 23, true) + crystalTip(79, 19, 25, true) + crystalTip(63, 12, 19, true)
      : crystalTip(87, 12, 18, true) + crystalTip(59, 19, 31, true);
    b += path('M 29 115 L 34 111 L 39 115 L 35 118 Z', C('glacier', -.18), 'stroke-width="1.5"');
  } else if (stage === 1) {
    b += variant ? crystalTip(49, 22, 16) + crystalTip(77, 33, 19) : crystalTip(82, 13, 13, true) + crystalTip(60, 30, 20);
  } else {
    b += variant ? crystalTip(45, 49, 22) + crystalTip(77, 73, 24) + crystalTip(62, 12, 16, true) : crystalTip(85, 15, 18, true) + crystalTip(60, 67, 30);
  }
  const x = variant ? 74 : 56, y = !stage ? 103 : stage === 1 ? (variant ? 95 : 97) : (variant ? 61 : 68);
  b += group('glint', line(`M ${x} ${y - 3} V ${y + 3} M ${x - 3} ${y} H ${x + 3}`, 'snow', 1.5, !stage ? 'opacity="0.4"' : ''));
  return b;
}

const families = [
  ['mushroom-forest', 'giant-mushroom', mushrooms, ['cap-glow']],
  ['crystal-grotto', 'crystal', crystals, ['glint']],
];
const assets = [];
for (const [biome, prop, draw, parts] of families) {
  for (const [variant, suffix] of ['a', 'b'].entries()) {
    for (const [stage, state] of ['depleted', 'regrow-1', 'regrow-2'].entries()) {
      const name = `${biome}-${prop}-${suffix}-${state}`, src = `art/src/biomes/${name}.svg`;
      // Round arithmetic tails only after geometry is assembled, as in gen-depleted.
      const body = group('prop', shadow() + draw(variant, stage)).replace(/-?\d+\.\d{2,}/g, n => String(round(Number(n))));
      write(src, svg(body));
      assets.push({ id: `biome.${biome}.prop.${prop}-${suffix}.${state}`, category: 'biomes', src, out: `public/assets/sprites/biomes/${name}.png`, viewBox: [128, 128], anchor: [.5, .9375], frames: 1, parts: ['prop', ...parts], tags: [biome, 'prop', state], phase: 'P0' });
    }
  }
}
write('art/manifest/core-props.json', JSON.stringify({ assets }, null, 2) + '\n');
console.log(`Core prop harvest stages: ${assets.length} SVG masters generated.`);
