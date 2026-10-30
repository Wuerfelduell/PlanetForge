import { C, svg, round, write } from './common.mjs';

// Original, deterministic surface drawings. Run this file before assets:gen;
// the shared pipeline merges our fragment without importing other generators.
// Primitive and manifest helpers copied from gen-world.mjs to keep ownership local.
const assets = [];
const path = (d, fill = 'none', extra = '') => `<path d="${d}" fill="${fill}" ${extra}/>`;
const circle = (x, y, r, fill, extra = '') => `<circle cx="${round(x)}" cy="${round(y)}" r="${round(r)}" fill="${fill}" ${extra}/>`;
const ellipse = (x, y, rx, ry, fill, extra = '') => `<ellipse cx="${round(x)}" cy="${round(y)}" rx="${round(rx)}" ry="${round(ry)}" fill="${fill}" ${extra}/>`;
const group = (id, body, extra = '') => `<g id="${id}" ${extra}>${body}</g>`;
function add(type, variant, body) {
  const name = `planet-${type}-${variant}`, src = `art/src/planets/${name}.svg`;
  write(src, svg(body, 1024, 1024));
  assets.push({ id: `planet.${name}`, category: 'planets', src,
    out: `public/assets/sprites/planets/${name}.png`, viewBox: [1024, 1024],
    anchor: [.5, .5], frames: 1, parts: ['body'], tags: [], phase: type === 'temperate' ? 'P0' : 'P1' });
}
const line = (d, token, width = 12, opacity = 1) => path(d, 'none', `stroke="${C(token)}" stroke-width="${width}" opacity="${opacity}"`);
const patch = (d, token, tone = 0, extra = '') => path(d, C(token, tone), `stroke="none" ${extra}`);

function planet(base, crust, details) {
  // Same radius, outline, light position and quiet crust ring as gen-world.mjs.
  const gradient = `<radialGradient id="body-light" cx="32%" cy="28%" r="74%"><stop stop-color="${C(base, .18)}"/><stop offset="0.6" stop-color="${C(base)}"/><stop offset="1" stop-color="${C(base, -.18)}"/></radialGradient>`;
  const clip = `<clipPath id="inner-surface">${circle(512, 512, 340, C('tint-white'), 'stroke="none"')}</clipPath>`;
  let b = circle(512, 512, 400, 'url(#body-light)');
  b += circle(512, 512, 364, 'none', `stroke="${C(crust)}" stroke-width="25" opacity="0.2"`);
  b += path('M 240 512 A 272 272 0 0 1 682 301 M 731 668 A 272 272 0 0 1 348 729', 'none', `stroke="${C(base, -.18)}" stroke-width="18" opacity="0.2"`);
  b += `<g clip-path="url(#inner-surface)">${details}</g>`;
  b += ellipse(440, 436, 166, 146, C(base, .18), 'stroke="none" opacity="0.1"');
  return `<defs>${gradient}${clip}</defs>${group('body', b)}`;
}

function temperate(variant) {
  if (variant === 'b') {
    // Exactly two broad, rounded landmasses separated by an open diagonal ocean.
    let b = patch('M 284 332 Q 319 252 399 261 Q 461 261 470 310 Q 479 342 440 366 Q 414 381 438 416 Q 452 454 411 471 Q 376 483 365 528 Q 348 564 305 535 Q 274 516 283 472 Q 241 433 284 332 Z', 'grass');
    b += patch('M 588 505 Q 625 471 661 497 Q 677 521 718 525 Q 775 535 772 589 Q 770 630 723 647 Q 700 665 705 711 Q 694 757 647 752 Q 603 753 601 710 Q 605 667 565 644 Q 540 621 562 584 Q 588 562 588 505 Z', 'grass');
    b += patch('M 429 304 Q 467 330 427 354 Q 398 382 420 423 Q 431 448 395 458 Q 368 474 357 508 Q 333 538 310 517 Q 342 527 344 478 Q 345 439 385 422 Q 401 407 386 378 Q 394 339 429 304 Z', 'leaf');
    b += patch('M 746 557 Q 776 596 724 628 Q 680 647 681 705 Q 670 738 641 728 Q 650 698 631 670 Q 607 645 630 613 Q 675 609 686 581 Q 714 585 746 557 Z', 'leaf');
    b += line('M 317 333 Q 344 291 385 292 M 604 535 Q 625 514 645 529', 'grass', 14);
    b += line('M 500 343 Q 544 323 586 343 M 361 658 Q 404 678 447 657', 'snow', 12, .4);
    return planet('water', 'grass', b);
  }
  let b = patch('M 280 370 Q 341 278 428 305 Q 488 310 518 366 Q 529 416 478 454 Q 458 484 481 529 Q 498 594 437 636 Q 375 647 325 600 Q 284 556 311 505 Q 339 461 294 440 Q 261 419 280 370 Z', 'grass', 0, 'opacity="0.5"');
  b += patch('M 566 380 Q 594 321 662 341 Q 718 356 732 411 Q 737 456 695 488 Q 650 516 682 563 Q 733 610 688 671 Q 638 718 579 679 Q 551 648 575 595 Q 597 550 555 513 Q 510 456 566 380 Z', 'moss');
  b += line('M 283 367 Q 357 327 421 350 Q 482 373 561 347 Q 637 320 704 356', 'snow', 33, .8);
  b += line('M 352 602 Q 420 574 483 598 Q 546 625 616 600 Q 674 579 739 597', 'snow', 27, .8);
  b += line('M 299 408 Q 338 392 367 402 M 620 641 Q 664 625 694 635', 'snow', 14, .5);
  return planet('leaf', 'grass', b);
}

function arid(variant) {
  if (variant === 'b') {
    const canyon = 'M 320 280 Q 414 320 395 386 Q 368 442 433 468 Q 511 493 493 551 Q 477 607 555 633 Q 620 660 635 754 M 397 382 Q 471 363 515 308 M 433 468 Q 352 502 303 582 M 493 551 Q 573 527 619 469 Q 655 427 732 434 M 555 633 Q 476 667 448 733';
    let b = line(canyon, 'ascension', 54, .5);
    b += line(canyon, 'iron', 30, .9);
    b += path(canyon, 'none', `stroke="${C('clay', -.18)}" stroke-width="12"`);
    b += line('M 294 413 Q 325 373 350 354 M 570 371 Q 617 339 673 366 M 651 572 Q 694 539 744 565 M 330 652 Q 359 683 395 694', 'sand', 15, .5);
    return planet('clay', 'sand', b);
  }
  let b = '';
  const plateaus = [
    'M 298 344 Q 320 302 368 308 L 424 322 Q 450 337 438 368 L 423 421 Q 414 449 383 449 L 315 437 Q 278 427 283 395 Z',
    'M 570 307 Q 605 277 649 303 L 700 338 Q 721 363 698 396 L 671 423 Q 640 445 609 423 L 562 389 Q 537 358 570 307 Z',
    'M 528 583 Q 566 543 617 553 L 707 581 Q 751 601 735 645 L 695 696 Q 660 731 618 708 L 532 679 Q 494 651 528 583 Z',
  ];
  for (const [i, d] of plateaus.entries()) {
    const [dx, dy] = [[0, 0], [15, 105], [-95, 25]][i];
    b += `<g transform="translate(${dx} ${dy})">`;
    b += path(d, C('clay'), 'stroke="none" transform="translate(0 18)"');
    b += path(d, C('rock-dark'), `stroke="${C('iron')}" stroke-width="12"`);
    b += line(['M 310 353 Q 328 327 367 331 L 406 342', 'M 581 333 Q 608 308 638 325', 'M 546 600 Q 565 572 603 578 L 665 597'][i], 'rock', 13);
    b += '</g>';
  }
  b += line('M 300 562 Q 361 535 410 554 M 329 596 Q 366 578 393 587 M 461 476 Q 512 456 553 477 M 397 732 Q 429 720 457 727', 'sand', 12);
  return planet('sand', 'clay', b);
}

function ice(variant) {
  if (variant === 'b') {
    let b = patch('M 286 350 Q 355 262 438 278 Q 482 317 447 384 Q 427 419 449 471 Q 459 510 405 535 Q 350 552 311 505 Q 281 466 300 428 Q 265 401 286 350 Z', 'snow', 0, 'opacity="0.7"');
    b += patch('M 569 565 Q 638 508 713 558 Q 760 593 726 656 Q 697 728 617 734 Q 572 718 585 663 Q 543 613 569 565 Z', 'snow', 0, 'opacity="0.6"');
    const cracks = 'M 422 246 L 402 338 Q 402 350 416 361 L 476 401 L 445 477 Q 441 490 457 501 L 520 545 L 491 618 L 537 690 L 524 777 M 406 346 L 335 374 L 306 451 M 450 483 L 367 503 L 338 555 M 519 545 L 610 498 L 641 414 L 718 382 M 491 618 L 408 652 L 390 709 M 609 500 L 686 538 L 728 613';
    b += line(cracks, 'science', 18, .7);
    b += path(cracks, 'none', `stroke="${C('snow')}" stroke-width="7" transform="translate(-9 -5)"`);
    return planet('glacier', 'science', b);
  }
  let b = patch('M 296 436 Q 321 388 394 407 Q 447 425 490 403 Q 555 375 601 414 Q 630 440 686 425 Q 754 407 773 465 Q 801 536 735 574 Q 707 589 700 634 Q 676 686 611 659 Q 557 631 507 655 Q 455 680 424 640 Q 397 600 350 614 Q 287 631 272 576 Q 251 523 281 487 Z', 'deep-water');
  b += line('M 317 471 Q 369 451 411 473 Q 467 496 518 470 M 527 583 Q 579 557 621 579 Q 665 599 704 574', 'science', 15, .5);
  b += patch('M 330 288 Q 512 179 686 291 Q 661 333 616 318 Q 587 359 540 334 Q 489 367 449 336 Q 395 351 376 320 Q 347 327 330 288 Z', 'snow');
  b += patch('M 350 733 Q 374 693 414 710 Q 449 680 492 708 Q 528 684 568 712 Q 610 693 652 727 Q 517 817 350 733 Z', 'snow');
  b += line('M 369 298 Q 416 276 453 290 M 407 737 Q 439 724 462 734', 'glacier', 10, .7);
  b += line('M 395 440 L 430 497 L 405 535 M 645 458 L 614 507 L 653 537', 'glacier', 9, .6);
  return planet('glacier', 'science', b);
}

for (const [type, draw] of Object.entries({ temperate, arid, ice })) {
  for (const variant of ['b', 'c']) add(type, variant, draw(variant));
}
write('art/manifest/planet-variants.json', JSON.stringify({ assets }, null, 2) + '\n');
console.log(`Planet variants: ${assets.length} SVG masters generated.`);
