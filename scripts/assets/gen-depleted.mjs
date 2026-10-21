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

function rubble(x, y, size, token = 'rock') {
  return path(`M ${x - size} ${y} L ${x - size + 2} ${y - 5} Q ${x} ${y - 9} ${x + size - 2} ${y - 4} L ${x + size} ${y} Z`, C(token), 'stroke-width="2"') + line(`M ${x - size + 3} ${y - 3} L ${x - 1} ${y - 5}`, token === 'snow' ? 'tint-white' : 'rock', 1.5);
}
function quarry(variant, icy = false) {
  const token = icy ? 'snow' : 'rock';
  const b = path('M 35 108 Q 35 103 41 103 L 87 103 Q 93 103 93 109 L 97 118.5 L 31 118.5 Z', C(token));
  return b + path('M 75 105 L 90 105 L 94 116 L 75 116 Z', C(icy ? 'snow' : 'rock', -.18), flat)
    + path('M 36 106 Q 63 98 91 106 Q 66 112 36 106 Z', C(icy ? 'snow' : 'rock', .18), 'stroke-width="1.5"')
    + line('M 47 113 L 45 116 M 56 113 L 54 117 M 64 113 L 62 116', icy ? 'science' : 'rock-dark')
    + rubble(22, 117, 6, token) + rubble(105, 118, 7, token)
    + (variant === 0 && !icy ? path('M 37 104 Q 44 98 52 102 Q 60 99 68 104 Q 61 109 55 106 Q 48 110 43 106 Z', C('snow'), 'stroke-width="2"') : '');
}
function mountains(variant, stage) {
  if (!stage) return quarry(variant);
  const top = stage === 1 ? [90, 94, 87][variant] : [50, 59, 46][variant];
  const half = stage === 1 ? 18 : 34;
  let b = path(`M ${64 - half} 118.5 Q ${60 - half} 117 ${63 - half} 110 L 56 ${top + 9} Q 63 ${top - 4} 71 ${top + 8} L ${64 + half} 110 Q ${69 + half} 118.5 ${60 + half} 118.5 Z`, C('rock'));
  b += path(`M 65 ${top + 4} L ${64 + half} 116 L 68 116 L 58 ${round((top + 116) / 2)} L 69 ${top + 18} Z`, C('rock-dark'), flat);
  if (variant === 0) b += path(`M ${stage === 1 ? 55 : 48} ${top + 15} L 56 ${top + 9} Q 63 ${top - 4} 71 ${top + 8} L ${stage === 1 ? 76 : 82} ${top + 17} Q 73 ${top + 21} 68 ${top + 14} Q 62 ${top + 24} 57 ${top + 15} Z`, C('snow'), 'stroke-width="2"');
  if (variant === 1) b += stage === 1 ? rubble(43, 118, 9) : path('M 31 118 L 38 97 Q 43 87 49 99 L 58 118 Z', C('rock', .18));
  if (variant === 2) b += path(stage === 1 ? 'M 77 118 L 84 106 Q 89 99 94 107 L 100 118 Z' : 'M 80 118 L 91 91 Q 96 82 101 93 L 112 113 Q 115 118 109 118 Z', C('rock-dark'));
  return b + line(`M ${stage === 1 ? 54 : 43} 110 L ${stage === 1 ? 57 : 49} ${stage === 1 ? 104 : 98}`, 'snow', 2);
}
function waterSurface() {
  return ellipse(64, 115, 43, 3.5, C('water'), `${flat} opacity="0.5"`) + line('M 25 114 Q 37 112 48 114 M 80 116 Q 93 114 103 115', 'deep-water', 1.5);
}
function ocean(variant, stage) {
  if (variant === 2) {
    let b = waterSurface();
    if (!stage) return b + line('M 61 109 L 96 99', 'ink', 3) + path('M 95 99 Q 101 91 108 97 L 105 104 Z', C('savanna')) + path('M 36 108 Q 43 103 52 103 L 68 110 Q 68 115 60 118 L 41 118.5 Q 30 115 36 108 Z', C('clay', -.18)) + path('M 44 105 L 51 104 L 60 117 L 52 118 Z', C('paper'));
    const poleTop = stage === 1 ? 99 : 65, width = stage === 1 ? 9 : 15;
    const bodyTop = stage === 1 ? 110 : 96, bottom = 117;
    b += line(`M 64 ${bodyTop} L 64 ${poleTop}`, 'ink', 3);
    b += path(`M 64 ${poleTop} Q ${stage === 1 ? 75 : 80} ${poleTop - 3} ${stage === 1 ? 78 : 84} ${poleTop + 5} Q 73 ${poleTop + 11} 64 ${poleTop + 7} Z`, C('ascension'), 'stroke-width="2"');
    b += path(`M ${64 - width} ${bodyTop + 3} L ${69 - width} ${bodyTop} Q 64 ${bodyTop - 3} ${59 + width} ${bodyTop} L ${64 + width} ${bodyTop + 3} L ${69 + width} ${bottom - 4} Q 64 122 ${59 - width} ${bottom - 4} Z`, C('clay'));
    b += path(`M ${61 - width} ${bottom - 7} Q 64 ${bottom - 1} ${67 + width} ${bottom - 7} L ${68 + width} ${bottom - 4} Q 64 ${bottom + 2} ${60 - width} ${bottom - 4} Z`, C('cream'), 'stroke-width="1.5"');
    return b;
  }
  if (!stage) return waterSurface() + line(variant ? 'M 39 112 H 55 M 66 113 H 81' : 'M 45 113 H 77', 'snow', 2);
  if (variant === 1) {
    const s = stage === 1 ? .3 : .7;
    const p = (x, y) => `${round(64 + (x - 64) * s)} ${round(118.5 + (y - 118.5) * s)}`;
    return path(`M ${p(14, 115)} Q ${p(28, 95)} ${p(47, 103)} Q ${p(58, 108)} ${p(69, 96)} Q ${p(84, 80)} ${p(102, 98)} Q ${p(82, 92)} ${p(85, 106)} Q ${p(92, 114)} ${p(113, 113)} L ${p(111, 118.5)} L ${p(20, 118.5)} Z`, C('water')) + line(`M ${p(23, 110)} Q ${p(34, 102)} ${p(46, 107)} M ${p(68, 103)} Q ${p(79, 89)} ${p(96, 96)}`, 'snow', stage === 1 ? 1 : 2);
  }
  const top = stage === 1 ? 108 : 91, left = stage === 1 ? 36 : 23, right = stage === 1 ? 91 : 105;
  let b = path(`M ${left} 116 Q 50 117 57 ${top + 5} Q 63 ${top - 5} 77 ${top} Q 63 ${top} 67 ${top + 8} Q 73 116 ${right} 114 Q ${right + 7} 115 ${right} 118.5 H ${left + 4} Z`, C('water'));
  b += line(`M 56 ${top + 7} Q 62 ${top - 1} 72 ${top}`, 'snow', 2);
  return b;
}

function desert(variant, stage) {
  if (variant === 2) {
    if (!stage) return ellipse(64, 115, 43, 3.5, C('sand'), 'stroke-width="2"') + ellipse(64, 114, 29, 2.5, C('sand', -.18), flat) + line('M 31 113 Q 40 110 48 111 M 88 116 L 98 116', 'paper', 2);
    const top = stage === 1 ? 109 : 94, left = stage === 1 ? 40 : 27, right = stage === 1 ? 90 : 103;
    return path(`M ${left} 117 Q 52 ${top + 6} 59 ${top + 1} Q 66 ${top - 3} 73 ${top + 2} Q 88 113 ${right} 116 Q ${right + 4} 118.5 ${right - 5} 118.5 H ${left + 5} Z`, C('sand')) + path(`M 68 ${top} Q 75 114 ${right - 3} 117 H 57 Q 62 ${top + 7} 68 ${top} Z`, C('sand', -.18), flat) + line(`M ${left + 11} 114 Q 58 ${top + 1} 63 ${top + 2}`, 'paper', 2);
  }
  if (!stage) return path(`M 54 118.5 L 56 ${103 + variant} Q 64 100 73 ${103 + variant} L 76 118.5 Z`, C('moss')) + ellipse(64.5, 103 + variant, 8.5, 3, C('paper')) + line('M 59 110 L 58 115 M 69 111 L 70 116', 'moss', 1.5) + path('M 39 116 L 44 112 L 48 117 Z', C('moss'), 'stroke-width="2"');
  const h = stage === 1 ? 28 : 66, top = 118.5 - h, left = stage === 1 ? 59 : 56, right = stage === 1 ? 71 : 74;
  let b = '';
  if (stage === 2) b += path('M 57 92 L 46 92 Q 40 92 40 85 L 40 75 Q 40 68 47 71 Q 50 72 50 77 L 50 82 L 57 82 Z', C('leaf')) + path('M 73 101 L 84 101 Q 93 101 93 91 L 93 85 Q 93 78 86 80 Q 83 81 83 87 L 83 91 L 73 91 Z', C('leaf'));
  b += path(`M ${left} 118.5 L ${left} ${top + 9} Q ${left} ${top} 65 ${top} Q ${right} ${top} ${right} ${top + 9} L ${right} 118.5 Z`, C('leaf'));
  b += path(`M ${right - 4} ${top + 12} V 117 H ${right - 1} V ${top + 10} Z`, C('leaf', -.18), flat) + line(`M ${left + 4} ${top + 10} V 114`, 'grass', 2);
  if (stage === 2) b += line('M 58 73 L 54 71 M 75 87 L 71 89', 'cream', 1.5) + (variant ? circle(65, top + 1, 4, C('danger')) + circle(64, top, 1.5, C('energy'), flat) : '');
  return b;
}
function swamp(variant, stage) {
  if (variant === 2) {
    if (!stage) return path('M 54 118.5 L 54 112 Q 64 106 74 112 L 74 118.5 Z', C('cream')) + ellipse(64, 111, 11, 4, C('paper')) + ellipse(64, 111, 6, 1.8, C('clay', -.18), flat) + ellipse(88, 117, 5, 1.5, C('moss'), flat);
    const top = stage === 1 ? 94 : 62, capY = stage === 1 ? 107 : 94, half = stage === 1 ? 14 : 30, stem = stage === 1 ? 5 : 9;
    let b = path(`M ${64 - stem} 118.5 Q ${67 - stem} 110 ${64 - stem} ${capY} L ${64 + stem} ${capY} Q ${61 + stem} 110 ${64 + stem + 2} 118.5 Z`, C('cream'));
    b += path(`M 67 ${capY + 1} L ${63 + stem} ${capY + 1} Q ${61 + stem} 111 ${64 + stem} 117 H 66 Z`, C('paper'), flat);
    b += path(`M ${64 - half} ${capY} Q ${64 - half} ${top + 4} 59 ${top} Q ${64 + half - 10} ${top - 5} ${64 + half} ${capY} Q ${67 + half} ${capY + 4} ${60 + half} ${capY + 6} Q 64 ${capY + 12} ${68 - half} ${capY + 6} Q ${60 - half} ${capY + 4} ${64 - half} ${capY} Z`, C('crystal'));
    b += path(`M ${68 - half} ${capY + 5} Q 64 ${capY + 9} ${62 + half} ${capY + 2} Q ${61 + half} ${capY + 6} 64 ${capY + 8} Z`, C('crystal', -.18), flat) + ellipse(stage === 1 ? 59 : 52, top + (stage === 1 ? 6 : 14), stage === 1 ? 3 : 7, stage === 1 ? 2 : 5, C('cream'), flat);
    if (stage === 2) b += ellipse(75, 80, 5, 3.5, C('cream'), flat);
    return b;
  }
  let b = ellipse(64, 116, 31, 3.5, C('clay', -.18), `${flat} opacity="0.5"`);
  for (let i = 0; i < 3; i++) {
    const x = 50 + i * 14, h = [86, 74, 62][(i + variant) % 3];
    const top = !stage ? 107 + (i + variant) % 3 * 3 : round(118.5 - h * (stage === 1 ? .3 : .7));
    if (!stage) {
      b += path(`M ${x - 2} 118.5 L ${x - 2} ${top} L ${x + 2} ${top} L ${x + 2} 118.5 Z`, C('moss'), 'stroke-width="2"') + ellipse(x, top, 2, 1, C('paper'), 'stroke="none"');
    } else {
      b += line(`M ${59 + (i - 1) * 7} 118 Q ${x} 102 ${x} ${top + 4}`, 'moss', 2);
      if (stage === 2 || i === 1) b += `<rect x="${x - (stage === 1 ? 2 : 3)}" y="${top}" width="${stage === 1 ? 4 : 6}" height="${stage === 1 ? 7 : 19}" rx="3" fill="${C('clay')}" stroke-width="2"/>` + line(`M ${x - 1} ${top + 3} V ${top + (stage === 1 ? 5 : 9)}`, 'sand', 1);
    }
  }
  if (stage) b += path(stage === 1 ? 'M 62 118 Q 49 113 45 104 Q 57 106 62 118 M 69 118 Q 75 104 84 103 Q 80 115 69 118' : 'M 61 118 Q 45 109 40 94 Q 55 99 61 118 M 69 118 Q 80 96 93 92 Q 88 111 69 118', C('moss'), 'stroke-width="2"');
  return b;
}

function tundra(variant, stage) {
  if (variant === 2) {
    if (!stage) return quarry(variant, true);
    const top = stage === 1 ? 102 : 80, half = stage === 1 ? 15 : 33;
    let b = path(`M ${64 - half} 118.5 Q ${60 - half} 116 ${64 - half} 110 L ${63 - half} ${top + 10} Q ${65 - half} ${top + 5} ${72 - half} ${top + 3} L 69 ${top} Q 75 ${top - 1} 79 ${top + 6} L ${64 + half} 111 Q ${69 + half} 118.5 ${59 + half} 118.5 Z`, C('snow'));
    b += path(`M 70 ${top + 2} L 66 ${top + 17} L ${61 + half} 116 H 58 L 51 ${top + 18} Z`, C('snow', -.18), flat) + line(`M ${70 - half} ${top + 11} L ${76 - half} ${top + 7} L ${83 - half} ${top + 6}`, 'tint-white', 2);
    if (stage === 1) b += rubble(39, 118, 6, 'snow') + rubble(91, 118, 5, 'snow');
    return b;
  }
  if (!stage) return stump(variant, true) + chips(variant, true);
  const top = stage === 1 ? 88 : 46, bottom = stage === 1 ? 114 : 108;
  const w = (stage === 1 ? 13 : 28) + variant * (stage === 1 ? 2 : 4);
  const y1 = round(top + (bottom - top) * .38), y2 = round(top + (bottom - top) * .7);
  const w1 = round(w * .5), w2 = round(w * .75);
  let b = trunk(bottom - 4, stage === 1 ? 6 : 9);
  b += path(`M ${64 - w} ${bottom} Q ${67 - w} ${bottom - 6} ${68 - w2} ${y2} H ${64 - w2} Q ${68 - w2} ${y2 - 7} ${68 - w1} ${y1} H ${64 - w1} Q 59 ${top + 6} 61 ${top} Q 64 ${top - 5} 67 ${top} Q 69 ${top + 6} ${64 + w1} ${y1} H ${60 + w1} Q ${60 + w2} ${y2 - 7} ${64 + w2} ${y2} H ${60 + w2} Q ${61 + w} ${bottom - 6} ${64 + w} ${bottom} Q 64 ${bottom + 9} ${64 - w} ${bottom} Z`, C('leaf'));
  b += path(`M ${64 - w1} ${y1} Q 59 ${top + 6} 61 ${top} Q 64 ${top - 5} 67 ${top} Q 69 ${top + 6} ${64 + w1} ${y1} Q 70 ${y1 + 4} 65 ${y1} Q 59 ${y1 + 5} ${64 - w1} ${y1} Z`, C('snow'), 'stroke-width="2"');
  b += path(`M ${64 - w2} ${y2} L ${68 - w2} ${y2 - 6} Q 64 ${y2 + 1} ${60 + w2} ${y2 - 6} L ${64 + w2} ${y2} Q 74 ${y2 + 6} 65 ${y2} Q 54 ${y2 + 6} ${64 - w2} ${y2} Z`, C('snow'), 'stroke-width="2"');
  b += path(`M ${64 - w} ${bottom} L ${68 - w} ${bottom - 6} Q 64 ${bottom + 1} ${60 + w} ${bottom - 6} L ${64 + w} ${bottom} Q 64 ${bottom + 9} ${64 - w} ${bottom} Z`, C('snow'), 'stroke-width="2"');
  return b;
}
function crystalTip(x, height, width, broken = false) {
  x = round(x); height = round(height); width = round(width);
  const left = round(x - width / 2), right = round(x + width / 2), top = round(116 - height), shoulder = round(top + Math.min(14, height * .3));
  if (broken) return path(`M ${left} 112 L ${left} ${top + 3} L ${round(x - 3)} ${top} L ${round(x + 2)} ${top + 4} L ${right} ${top + 1} L ${right} 112 L ${x} 118 Z`, C('crystal', -.18)) + path(`M ${left + 2} ${top + 4} L ${round(x - 3)} ${top + 2} L ${round(x + 2)} ${top + 6} L ${right - 2} ${top + 3} L ${right - 2} ${top + 7} L ${x} ${top + 10} Z`, C('rock'), flat);
  return path(`M ${left} 112 L ${left} ${shoulder} Q ${left} ${shoulder - 3} ${x} ${top} L ${right} ${shoulder} L ${right} 112 L ${x} 116 Z`, C('crystal'))
    + path(`M ${x} ${top + 2} V 113 L ${right - 2} 111 V ${shoulder + 1} Z`, C('crystal', -.18), flat)
    + line(`M ${left + 3} ${shoulder + 3} V 109`, 'cream', 1.5);
}
function crystals(variant, stage) {
  const formations = [
    [[42, 48, 24], [78, 60, 27], [62, 91, 30]],
    [[41, 70, 26], [83, 44, 31], [63, 57, 27]],
    [[62, 98, 43], [91, 36, 21]],
  ][variant];
  let b = formations.map(([x, h, w], i) => !stage
    ? crystalTip(x, 12 + i * 2, w * .8, true)
    : crystalTip(64 + (x - 64) * (stage === 1 ? .6 : .8), h * (stage === 1 ? .3 : .7), w * (stage === 1 ? .45 : .75))).join('');
  if (!stage) b += path('M 30 116 L 34 112 L 39 116 L 35 118 Z', C('crystal', -.18), 'stroke-width="1.5"');
  if (stage === 2) b += line('M 98 80 V 86 M 95 83 H 101', 'crystal', 2);
  return b;
}

function glacierIce(x, height, width, lean = 0) {
  const top = round(118.5 - height), left = round(x - width / 2), right = round(x + width / 2);
  const bevel = Math.min(7, round(width / 4)), cap = Math.min(8, round(height / 3));
  const b = path(`M ${left} 118.5 L ${left + lean} ${top + cap} L ${left + lean + bevel} ${top} H ${right + lean - bevel} L ${right + lean} ${top + cap} L ${right} 118.5 Z`, C('glacier'))
    + path(`M ${x + lean + 2} ${top + cap + 3} L ${right + lean - 1} ${top + cap} L ${right - 1} 117 H ${x + 2} Z`, C('glacier', -.18), flat)
    + path(`M ${left + lean} ${top + cap} L ${left + lean + bevel} ${top} H ${right + lean - bevel} L ${right + lean} ${top + cap} L ${x + lean + 2} ${top + cap + 3} Z`, C('snow'), 'stroke-width="1.5"')
    + (height > 22 ? line(`M ${left + lean + 5} ${top + cap + 7} L ${left + 5} 111`, 'snow', 2) : '')
    + (height > 45 ? line(`M ${x - 2} ${top + 22} L ${x + 2} ${top + 32} L ${x - 3} ${top + 39}`, 'science', 1.5) : '');
  // Arithmetic on tenths can produce floating-point tails in SVG path strings.
  return b.replace(/-?\d+\.\d{2,}/g, n => String(round(Number(n))));
}
function glacier(variant, stage) {
  let b = ellipse(64, 114, 43, 4.5, C('water'), 'stroke-width="2"') + line('M 28 114 Q 36 111 44 113 M 90 115 H 99', 'snow', 1.5);
  if (!stage) return b + glacierIce(60 + variant * 4, variant === 2 ? 8 : 12, variant === 2 ? 28 : 20, variant === 1 ? 2 : 0);
  const scale = stage === 1 ? .3 : .7, spread = stage === 1 ? .5 : .8;
  if (variant < 2) {
    const blocks = variant === 0 ? [[60, 96, 43, 4], [89, 49, 24, -2]] : [[43, 62, 35, -7], [78, 90, 34, 6]];
    for (const [x, h, w, lean] of blocks) b += glacierIce(round(64 + (x - 64) * spread), round(h * scale), round(w * spread), round(lean * scale));
  } else {
    const top = round(118.5 - 28 * scale), left = stage === 1 ? 43 : 30, right = stage === 1 ? 87 : 100, cap = stage === 1 ? 3 : 6;
    b += path(`M ${left} ${top + cap} L ${left + 8} ${top} H ${right - 16} L ${right} ${top + cap + 1} L ${right - 4} 118.5 H ${left + 4} Z`, C('glacier'));
    b += path(`M 67 ${top + cap + 4} L ${right - 1} ${top + cap + 1} L ${right - 4} 117 H 67 Z`, C('glacier', -.18), flat);
    b += path(`M ${left} ${top + cap} L ${left + 8} ${top} H ${right - 16} L ${right} ${top + cap + 1} L 67 ${top + cap + 4} Z`, C('snow'), 'stroke-width="1.5"');
    if (stage === 2) b += line(`M 63 ${top + 1} L 58 ${top + 5} L 67 ${top + 9} L 66 116`, 'science', 1.5);
  }
  return b;
}

const renderers = { forest: tree, savanna, mountains, ocean, desert, swamp, tundra, crystal: crystals, glacier };
const stages = ['depleted', 'regrow-1', 'regrow-2'];
const fullProps = JSON.parse(read('art/manifest/world.json')).assets.filter(a => /^biome\.[^.]+\.prop\.[^.]+$/.test(a.id));
if (fullProps.length !== Object.keys(renderers).length * 3) throw new Error(`Expected three full props per renderer, found ${fullProps.length}`);
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
