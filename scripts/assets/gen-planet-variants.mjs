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

function planet(base, crust, details, tone = 0) {
  // Same radius, outline, light position and quiet crust ring as gen-world.mjs.
  const gradient = `<radialGradient id="body-light" cx="32%" cy="28%" r="74%"><stop stop-color="${C(base, tone < 0 ? 0 : .18)}"/><stop offset="0.6" stop-color="${C(base, tone)}"/><stop offset="1" stop-color="${C(base, -.18)}"/></radialGradient>`;
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
    const [dx, dy] = [[-15, 75], [-75, -40], [40, -65]][i];
    b += `<g transform="translate(${dx} ${dy})">`;
    b += path(d, C('clay'), 'stroke="none" transform="translate(0 18)"');
    b += path(d, C('rock-dark'), `stroke="${C('iron')}" stroke-width="12"`);
    b += line(['M 310 353 Q 328 327 367 331 L 406 342', 'M 581 333 Q 608 308 638 325', 'M 546 600 Q 565 572 603 578 L 665 597'][i], 'rock', 13);
    b += '</g>';
  }
  b += path('M 377 675 Q 397 649 425 663 L 471 684 Q 494 698 478 727 Q 452 754 418 734 L 380 715 Q 363 700 377 675 Z', C('clay'), 'stroke="none" transform="translate(0 14)"');
  b += path('M 377 675 Q 397 649 425 663 L 471 684 Q 494 698 478 727 Q 452 754 418 734 L 380 715 Q 363 700 377 675 Z', C('rock-dark'), `stroke="${C('iron')}" stroke-width="10"`);
  b += line('M 388 683 Q 401 670 422 680 L 452 693', 'rock', 11);
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

function ocean(variant) {
  if (variant === 'b') {
    let b = line('M 298 409 Q 338 390 375 411 M 520 287 Q 558 270 598 289 M 551 573 Q 590 552 629 572 M 328 687 Q 363 669 402 689 M 690 483 Q 722 469 751 484', 'water', 14, .6);
    // Small irregular island silhouettes, each with a warm beach and leafy center.
    const island = 'M -27 -12 Q -17 -29 0 -21 Q 11 -25 20 -9 Q 34 0 21 15 Q 8 28 -10 16 Q -32 17 -27 -12 Z';
    for (const [x, y, scale, rotation] of [[356, 337, 1.1, -24], [483, 432, .8, 32], [664, 362, 1, 9], [335, 557, .7, -40], [547, 687, 1.1, 14], [711, 601, .8, -18]]) {
      b += `<g transform="translate(${x} ${y}) rotate(${rotation}) scale(${scale})">`;
      b += ellipse(0, 0, 40, 32, C('water'), 'stroke="none" opacity="0.4"');
      b += path(island, C('sand'), `stroke="${C('deep-water', -.18)}" stroke-width="6"`);
      b += path(island, C('grass'), 'stroke="none" transform="translate(-3 -3) scale(0.6)"');
      b += '</g>';
    }
    return planet('deep-water', 'water', b);
  }
  let b = patch('M 270 371 Q 343 274 427 314 Q 478 339 452 398 Q 415 436 434 486 Q 454 540 395 578 Q 337 610 303 567 Q 280 525 316 482 Q 337 443 285 432 Q 253 416 270 371 Z', 'ok', 0, 'opacity="0.5"');
  b += patch('M 457 646 Q 519 609 571 635 Q 616 656 679 628 Q 723 613 745 657 Q 680 765 546 758 Q 466 749 443 711 Q 425 677 457 646 Z', 'science', .18, 'opacity="0.5"');
  b += line('M 299 373 Q 354 317 396 344 M 485 697 Q 538 723 585 704', 'snow', 14, .4);
  // A broad, open cyclone with an off-center eye, unlike the scattered island world.
  const spiral = 'M 405 502 C 363 409 435 311 556 309 C 689 301 783 397 747 508 C 720 594 604 630 530 575 C 469 530 480 441 550 420 C 604 403 657 439 640 487 C 630 519 587 521 579 493';
  b += line(spiral, 'deep-water', 45, .2);
  b += line(spiral, 'snow', 29, .8);
  b += line('M 441 562 Q 416 605 452 646 M 689 351 Q 729 368 744 403', 'snow', 16, .5);
  return planet('water', 'science', b);
}

function lava(variant) {
  if (variant === 'b') {
    let b = patch('M 302 360 Q 320 299 386 310 L 443 362 L 417 449 L 336 472 Q 286 430 302 360 Z M 549 565 L 628 532 L 716 587 L 687 681 Q 632 735 570 691 Z', 'coal', -.18);
    const rivers = 'M 340 277 Q 375 336 416 366 L 392 457 L 448 515 L 414 610 L 458 718 M 416 366 L 510 346 L 576 267 M 510 346 L 557 427 L 661 443 L 734 385 M 392 457 L 298 474 L 259 531 M 448 515 L 539 539 L 557 427 M 539 539 L 578 629 L 548 762 M 578 629 L 669 667 L 728 609 M 414 610 L 326 649 M 661 443 L 692 526 L 769 539 M 539 539 L 619 501 L 692 526';
    b += line(rivers, 'lava', 24, .5);
    b += line(rivers, 'ascension', 13);
    b += line(rivers, 'energy', 5, .8);
    b += line('M 327 386 L 345 356 M 588 325 L 615 340 M 616 711 L 649 719', 'rock-dark', 10, .5);
    return planet('coal', 'lava', b);
  }
  let b = '';
  const lakes = [
    'M 300 361 Q 329 302 393 319 Q 453 332 434 384 Q 420 417 441 444 Q 461 491 406 511 Q 349 532 310 485 Q 273 433 300 361 Z',
    'M 589 407 Q 629 365 682 387 Q 725 404 714 446 Q 700 471 733 504 Q 761 542 723 572 Q 677 604 641 575 Q 620 552 591 549 Q 546 531 565 489 Q 593 455 589 407 Z',
    'M 450 645 Q 492 602 540 632 Q 566 651 601 652 Q 648 656 636 696 Q 616 742 554 745 Q 501 748 466 717 Q 422 691 450 645 Z',
  ];
  for (const [i, d] of lakes.entries()) {
    b += `<g transform="translate(${i === 2 ? -120 : 0} 0)">`;
    b += path(d, C('ascension'), `stroke="${C('coal')}" stroke-width="20"`);
    b += path(d, 'none', `stroke="${C('lava')}" stroke-width="7"`);
    b += '</g>';
  }
  b += patch('M 322 370 Q 341 334 378 342 Q 410 351 396 381 Q 379 412 403 451 Q 414 476 379 480 Q 330 477 320 436 Q 308 406 322 370 Z', 'energy');
  b += patch('M 610 423 Q 637 398 664 411 Q 683 426 663 451 Q 643 475 680 502 Q 704 525 681 544 Q 656 557 640 531 Q 590 520 601 492 Q 624 458 610 423 Z', 'energy');
  b += line('M 355 664 Q 382 642 406 660 Q 433 682 461 676', 'energy', 20);
  b += line('M 464 300 Q 485 313 499 334 M 290 569 L 320 593 M 698 655 L 715 630', 'coal', 12, .4);
  return planet('lava', 'coal', b, -.18);
}

function toxic(variant) {
  if (variant === 'b') {
    let b = '';
    // Interleaved, tapering cloud ribbons; no bubbles on this gaseous variant.
    b += patch('M 290 369 Q 338 270 454 285 Q 530 291 569 337 Q 622 389 689 365 Q 738 349 760 390 Q 694 443 617 417 Q 566 400 523 361 Q 477 320 415 329 Q 345 336 290 369 Z', 'toxic');
    b += patch('M 266 492 Q 322 438 386 461 Q 447 483 483 456 Q 519 429 494 408 Q 541 422 527 462 Q 514 509 457 515 Q 411 519 373 500 Q 325 476 266 492 Z', 'sand', 0, 'opacity="0.7"');
    b += patch('M 301 612 Q 372 564 446 593 Q 500 617 540 581 Q 569 550 602 497 Q 645 442 709 474 Q 764 511 739 561 Q 722 595 682 588 Q 727 569 703 535 Q 672 503 645 544 Q 616 609 571 650 Q 511 704 432 661 Q 362 623 301 655 Z', 'toxic');
    b += line('M 331 351 Q 399 297 468 321 M 328 615 Q 387 591 434 614 M 612 529 Q 652 468 697 503', 'sand', 15, .7);
    b += line('M 418 739 Q 482 757 531 733 M 566 276 Q 610 285 640 306', 'toxic', 18, .5);
    return planet('moss', 'toxic', b);
  }
  let b = '';
  const pools = [
    'M 282 386 Q 312 324 374 346 Q 426 364 414 409 Q 397 442 427 470 Q 459 512 412 543 Q 370 563 332 528 Q 300 514 280 480 Q 259 435 282 386 Z',
    'M 566 318 Q 617 280 663 320 Q 691 344 674 376 Q 662 402 692 422 Q 734 455 699 487 Q 655 524 619 489 Q 596 460 563 453 Q 525 428 547 390 Q 570 362 566 318 Z',
    'M 489 617 Q 522 579 569 605 Q 605 628 646 603 Q 697 578 723 623 Q 747 669 694 711 Q 658 744 610 721 Q 576 707 548 731 Q 508 757 479 718 Q 446 667 489 617 Z',
  ];
  // Unevenly sized marshes and a small fourth pool avoid face-like symmetry.
  for (const d of pools) b += path(d, C('oil-sheen'), `stroke="${C('oil')}" stroke-width="16"`);
  b += path('M 279 626 Q 285 594 316 603 Q 343 609 337 638 Q 331 664 301 660 Q 274 656 279 626 Z', C('oil-sheen'), `stroke="${C('oil')}" stroke-width="12"`);
  b += ellipse(305, 630, 15, 20, C('toxic'), 'stroke="none"');
  b += patch('M 305 399 Q 330 363 363 378 Q 393 394 365 425 Q 344 448 381 474 Q 402 495 374 510 Q 331 511 314 474 Q 290 441 305 399 Z', 'toxic');
  b += patch('M 587 338 Q 617 315 638 341 Q 652 360 622 380 Q 599 407 643 433 Q 671 452 651 469 Q 619 482 596 444 Q 562 419 582 386 Q 596 361 587 338 Z', 'moss');
  b += patch('M 504 638 Q 531 615 560 641 Q 590 671 638 644 Q 678 624 692 650 Q 703 678 665 691 Q 633 699 604 682 Q 567 668 542 700 Q 511 721 501 688 Q 484 660 504 638 Z', 'toxic');
  for (const [x, y, r] of [[345, 410, 20], [383, 476, 13], [611, 359, 17], [650, 429, 25], [529, 659, 23], [665, 652, 14]]) {
    b += circle(x, y, r, C('toxic'), `stroke="${C('moss', -.18)}" stroke-width="7"`);
    b += ellipse(x - r * .3, y - r * .3, r * .3, r * .2, C('toxic', .18), 'stroke="none"');
  }
  return planet('moss', 'oil', b);
}

for (const [type, draw] of Object.entries({ temperate, arid, ice, ocean, lava, toxic })) {
  for (const variant of ['b', 'c']) add(type, variant, draw(variant));
}
write('art/manifest/planet-variants.json', JSON.stringify({ assets }, null, 2) + '\n');
console.log(`Planet variants: ${assets.length} SVG masters generated.`);
