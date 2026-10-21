import { C, svg, round, write, read } from './common.mjs';

// Original growth drawings, on the same 128px stage as gen-world.mjs.
// Geometry changes with maturity; outlines stay 3px instead of scaling down.
const flat = 'stroke="none"';
const path = (d, fill = 'none', extra = '') => `<path d="${d}" fill="${fill}" ${extra}/>`;
const ellipse = (x, y, rx, ry, fill, extra = '') => `<ellipse cx="${round(x)}" cy="${round(y)}" rx="${round(rx)}" ry="${round(ry)}" fill="${fill}" ${extra}/>`;
const circle = (x, y, r, fill, extra = '') => ellipse(x, y, r, r, fill, extra);
const line = (d, token, width = 1.5, extra = '') => path(d, 'none', `stroke="${C(token)}" stroke-width="${width}" ${extra}`);
const shadow = () => ellipse(64, 116, 40, 4, C('ink'), `${flat} opacity="0.2"`);
const leaf = (x, y, side, token = 'grass') => path(`M ${x} ${y} Q ${x + side * 12} ${y - 14} ${x + side * 17} ${y - 6} Q ${x + side * 14} ${y + 2} ${x} ${y} Z`, C(token));

function canopy(x, y, rx, ry, token) {
  return ellipse(x, y, rx, ry, C(token))
    + path(`M ${round(x + rx - 2)} ${y - 3} Q ${round(x + rx + 2)} ${round(y + ry)} ${x} ${round(y + ry - 1)} Q ${round(x + rx / 2)} ${round(y + ry / 2)} ${round(x + rx - 2)} ${y - 3}`, C(token, -.18), flat)
    + ellipse(x - rx * .3, y - ry * .35, rx * .36, ry * .2, C(token, .18), flat);
}
function chips(variant, snowy = false) {
  return path(`M ${30 + variant * 3} 115 L ${38 + variant * 3} 111 L ${43 + variant * 3} 115 L ${36 + variant * 3} 117 Z`, C(snowy ? 'snow' : 'paper'), 'stroke-width="1.5"')
    + path('M 87 113 L 94 111 L 99 115 L 91 117 Z', C(snowy ? 'snow' : 'clay'), 'stroke-width="1.5"');
}
function stump(variant, snowy = false, short = false) {
  const top = short ? 110 : 101 + variant * 2, half = 10 + variant * 2;
  let b = path(`M ${64 - half} ${top} L ${64 - half - 3} 118.5 L ${64 + half + 3} 118.5 L ${64 + half} ${top} Z`, C('clay'));
  b += path(`M 67 ${top + 3} L ${71 + variant} 117 L ${63 + half} 117 L ${62 + half} ${top + 3} Z`, C('clay', -.18), flat);
  b += ellipse(64, top, half, 4, C('paper')) + ellipse(64, top, half * .5, 1.5, 'none', `stroke="${C('clay')}" stroke-width="1.5"`);
  if (snowy) b += path(`M ${53 - variant} ${top - 1} Q 57 ${top - 7} 65 ${top - 5} Q 73 ${top - 6} ${76 + variant} ${top} Q 70 ${top + 5} 65 ${top + 1} Q 58 ${top + 4} ${53 - variant} ${top - 1} Z`, C('snow'));
  return b;
}
function trunk(top, width = 12) {
  return path(`M ${64 - width / 2} 118.5 L ${66 - width / 2} ${top} Q 64 ${top - 4} ${62 + width / 2} ${top} L ${64 + width / 2} 118.5 Z`, C('clay')) + line(`M 66 ${top + 6} L 67 115`, 'clay', 1.5);
}
function tree(variant, stage) {
  if (!stage) return stump(variant) + chips(variant);
  if (stage === 1) return stump(variant, false, true) + line('M 64 110 Q 63 102 64 96', 'ink', 4) + line('M 64 110 Q 63 102 64 96', 'leaf', 1.5) + leaf(64, 101, -1, variant === 2 ? 'moss' : 'leaf') + leaf(64, 97, 1, variant === 1 ? 'grass' : 'leaf');
  let b = trunk(78);
  if (variant === 0) b += canopy(64, 75, 28, 28, 'leaf');
  if (variant === 1) b += canopy(51, 82, 19, 19, 'leaf') + canopy(77, 80, 18, 20, 'leaf') + canopy(63, 63, 19, 19, 'grass');
  if (variant === 2) b += canopy(64, 70, 21, 28, 'moss') + canopy(65, 89, 27, 16, 'leaf') + circle(53, 86, 2.5, C('clay'));
  return b;
}
function savanna(variant, stage) {
  if (!stage) return stump(variant, false, true) + line('M 60 110 L 49 100 L 47 91 M 50 101 L 40 100 M 68 111 L 80 98 L 83 89 M 80 99 L 91 98', 'ink', 4) + line('M 60 110 L 49 100 L 47 91 M 50 101 L 40 100 M 68 111 L 80 98 L 83 89 M 80 99 L 91 98', 'clay', 1.5);
  if (variant === 2) {
    if (stage === 1) return trunk(102, 8) + canopy(57, 98, 12, 6, 'moss') + canopy(72, 94, 13, 7, 'grass');
    return path('M 57 118.5 L 60 91 L 46 77 L 51 74 L 65 86 L 75 71 L 80 75 L 69 92 L 70 118.5 Z', C('clay')) + canopy(47, 69, 18, 12, 'moss') + canopy(79, 65, 20, 13, 'moss') + canopy(63, 59, 20, 13, 'grass');
  }
  if (stage === 1) return stump(variant, false, true) + leaf(62, 108, -1, 'moss') + leaf(65, 105, 1, 'grass');
  let b = trunk(98, 8) + canopy(49, 100, 17, 17, 'moss') + canopy(77, 99, 18, 18, 'leaf') + canopy(62, variant ? 85 : 91, 18, 17, 'grass');
  for (const [x, y] of [[50, 100], [77, 98]]) b += circle(x, y, 3, C(variant ? 'ascension' : 'clay')) + circle(x - 1, y - 1, 1, C('sand'), flat);
  return b;
}

const renderers = { forest: tree, savanna };
const stages = ['depleted', 'regrow-1', 'regrow-2'];
const fullProps = JSON.parse(read('art/manifest/world.json')).assets.filter(a => /^biome\.[^.]+\.prop\.[^.]+$/.test(a.id));
if (fullProps.length !== 24) throw new Error(`Expected 24 full props, found ${fullProps.length}`);
const assets = [];
for (const [biome, render] of Object.entries(renderers)) {
  const props = fullProps.filter(a => a.id.split('.')[1] === biome);
  if (props.length !== 3) throw new Error(`Expected three ${biome} props`);
  props.forEach((full, variant) => stages.forEach((state, stage) => {
    const name = full.src.split('/').at(-1).replace(/\.svg$/, '') + `-${state}`;
    const src = `art/src/biomes/${name}.svg`;
    write(src, svg(`<g id="prop">${shadow()}${render(variant, stage)}</g>`));
    assets.push({ id: `${full.id}.${state}`, category: 'biomes', src, out: `public/assets/sprites/biomes/${name}.png`, viewBox: [128, 128], anchor: [.5, .9375], frames: 1, parts: ['prop'], tags: [biome, 'prop', state], phase: 'P0' });
  }));
}
write('art/manifest/depleted.json', JSON.stringify({ assets }, null, 2) + '\n');
console.log(`Depleted/regrowing: ${assets.length} SVGs across ${Object.keys(renderers).length} biomes.`);
