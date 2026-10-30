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
  let b = path(`M ${x - stem - 2} 118.5 Q ${x + 1} ${Math.min(114, cap + 15)} ${x - stem} ${cap} H ${x + stem} Q ${x + stem - 3} 108 ${x + stem + 4} 118.5 Z`, C('clay', .18));
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

// A keeps its wide centered mouth; B keeps the offset chimney and side vent.
// Each stage loses heat: small ember, faint cracks, then a cold crater.
function vents(variant, stage) {
  const x = variant ? 76 : 61;
  if (!stage) {
    let b = path(variant
      ? 'M 29 118.5 Q 26 114 34 111 L 48 108 L 58 111 Q 74 103 92 109 Q 101 113 99 118.5 Z'
      : 'M 29 118.5 Q 25 115 34 110 Q 60 103 87 110 Q 100 114 98 118.5 Z', C('coal'));
    b += path('M 78 110 Q 91 110 98 117 H 64 Z', C('coal', -.18), flat);
    b += ellipse(x, 111, variant ? 16 : 22, 5, C('rock-dark'))
      + ellipse(x, 111.5, variant ? 11 : 16, 2.5, C('coal', -.18), 'stroke-width="1.5"')
      + line(`M ${x - 13} 109 Q ${x - 9} 107 ${x - 4} 108`, 'rock-dark', 1.5);
    if (variant) b += ellipse(43, 113, 9, 3, C('coal', -.18), 'stroke-width="1.5"');
    return b + line(`M ${x + 6} 115 L ${x + 3} 118`, 'rock-dark', 1.5);
  }
  const lip = stage === 1 ? 106 : variant ? 89 : 94, half = stage === 1 ? 12 : 17;
  let b = path(variant
    ? `M 31 118.5 Q 28 115 35 110 L 48 108 L 57 110 L 61 ${lip} Q 65 ${lip - 6} 78 ${lip - 6} Q 90 ${lip - 5} 92 ${lip + 3} L 99 115 Q 100 118.5 96 118.5 Z`
    : `M 31 118.5 Q 28 115 35 110 L ${x - half} ${lip} Q ${x - 9} ${lip - 8} ${x + 4} ${lip - 7} Q ${x + half - 3} ${lip - 6} ${x + half + 3} ${lip + 4} L 98 115 Q 101 118.5 95 118.5 Z`, C('coal'));
  b += path(`M ${x + 8} ${lip + 2} L ${x + half} ${lip + 3} L 97 117 H ${x + 1} Q ${x + 13} 110 ${x + 8} ${lip + 2} Z`, C('coal', -.18), flat);
  if (variant) b += ellipse(45, 111, 9, 3.5, C('rock-dark'), 'stroke-width="2"');
  b += ellipse(x, lip, half, stage === 1 ? 4 : 6, C('rock-dark'));
  b += ellipse(x, lip, half - 5, stage === 1 ? 2 : 3, C('lava', stage === 1 ? -.18 : 0), `stroke-width="1.5"${stage === 1 ? ' opacity="0.4"' : ''}`);
  b += line(`M ${x + 4} ${lip + 7} L ${x} ${lip + 11} L ${x + 5} 117`, 'lava', stage === 1 ? 1.5 : 2, stage === 1 ? 'opacity="0.3"' : '');
  b += line(`M ${x - half - 3} 111 L ${x - half} 106`, 'rock-dark', 2);
  if (stage === 2) {
    // Compact form of gen-core-biomes' ember, without the full prop's smoke.
    const y = lip - 20;
    b += ellipse(x, y, 6, 8, C('lava'), `${flat} opacity="0.2"`)
      + path(`M ${x - 3} ${y + 4} Q ${x - 6} ${y - 1} ${x - 1} ${y - 5} L ${x + 1} ${y - 8} Q ${x + 7} ${y - 1} ${x + 4} ${y + 4} Q ${x} ${y + 7} ${x - 3} ${y + 4} Z`, C('lava'), 'stroke-width="2"')
      + ellipse(x - .5, y + 1, 2, 3, C('ascension'), flat);
    b += line(`M ${x - 7} ${lip - 1} Q ${x - 3} ${lip - 3} ${x + 3} ${lip - 1}`, 'ascension', 1.5);
  }
  return b;
}

// Bare bedrock copied from the parent coral. The root footprint stays fixed.
function coralRock() {
  return path('M 32 118.5 Q 30 114 35 111 Q 43 107 49 112 Q 64 106 78 111 Q 90 107 97 114 Q 101 118.5 95 118.5 Z', C('rock-dark', -.18))
    + line('M 39 113 L 45 113 M 72 113 L 79 114', 'iron', 1.5, 'opacity="0.5"');
}
function coralRibbon(x, top, width) {
  const h = 118.5 - top, y1 = top + h * .25, y2 = top + h * .5, y3 = top + h * .75;
  return path(`M ${x} 118.5 Q ${x - width} ${y3} ${x - width * .7} ${y2} Q ${x + width * .4} ${y1} ${x - width * .4} ${top + 9} Q ${x - width * .5} ${top + 3} ${x + 3} ${top} Q ${x} ${top + 9} ${x + width * .6} ${y1} Q ${x + width} ${y2 - 3} ${x + width * .2} ${y2 + 7} Q ${x - width * .4} ${y3} ${x + width * .7} 118.5 Z`, C('ok', -.18))
    + line(`M ${x - 1} ${top + 9} Q ${x + width * .4} ${y1} ${x - width * .1} ${y2} Q ${x - width * .6} ${y3} ${x + 1} 111`, 'ok', 2);
}
function corals(variant, stage) {
  if (!stage) return coralRock() + group('tips', circle(variant ? 53 : 62, 110, 1.8, C('ok', .18), `${flat} opacity="0.6"`));
  let b = ellipse(64, 115, stage === 1 ? 24 : 32, 3, C('ok'), `${flat} opacity="0.1"`), tips = '';
  if (variant) {
    b += coralRibbon(56, stage === 1 ? 85 : 46, stage === 1 ? 9 : 14)
      + coralRibbon(81, stage === 1 ? 99 : 67, stage === 1 ? 7 : 11);
    tips += ellipse(55, stage === 1 ? 94 : 55, 2, stage === 1 ? 2.5 : 4, C('ok', .18), flat)
      + ellipse(80, stage === 1 ? 107 : 76, 2, 2.5, C('glacier'), `${flat} opacity="0.6"`);
  } else if (stage === 1) {
    b += path('M 56 118.5 Q 59 108 58 101 L 48 97 Q 43 95 43 90 Q 43 86 47 86 Q 51 86 51 91 L 58 94 V 87 Q 58 81 63 81 Q 68 81 68 87 L 67 101 L 74 96 Q 78 93 81 97 Q 84 101 78 105 L 67 112 L 70 118.5 Z', C('ok', -.18));
    b += line('M 62 89 V 107 M 48 91 L 52 96', 'ok', 2);
    tips += circle(63, 87, 2.5, C('ok', .18), flat) + circle(47, 90, 1.8, C('glacier'), flat);
  } else {
    b += path('M 52 118.5 Q 56 106 55 94 L 40 84 Q 34 80 34 72 V 66 Q 34 61 39 61 Q 44 61 44 66 V 72 Q 44 77 50 79 L 56 82 V 57 Q 56 49 62 49 Q 68 49 68 57 L 67 73 L 78 65 V 59 Q 78 53 83 53 Q 88 53 88 59 V 67 Q 88 72 83 76 L 67 87 V 98 L 80 90 Q 85 87 86 82 Q 87 76 92 78 Q 97 79 96 85 Q 93 95 85 99 L 67 110 L 72 118.5 Z', C('ok', -.18));
    b += line('M 62 61 L 61 98 Q 60 108 58 114 M 40 70 Q 39 78 49 83 M 83 61 V 66 M 85 93 L 91 85', 'ok', 2.5);
    tips += circle(62, 57, 3, C('ok', .18), flat) + circle(39, 66, 2.5, C('glacier'), flat)
      + circle(83, 59, 2.5, C('glacier'), flat) + circle(91, 83, 2, C('ok', .18), flat);
  }
  return b + group('tips', tips) + coralRock();
}

const families = [
  ['mushroom-forest', 'giant-mushroom', mushrooms, ['cap-glow']],
  ['crystal-grotto', 'crystal', crystals, ['glint']],
  ['magma-lake', 'vent', vents, []],
  ['primal-sea', 'coral', corals, ['tips']],
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
