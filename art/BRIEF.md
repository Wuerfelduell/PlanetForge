# PlanetForge art brief

Shared reference for everyone producing art. The work is split into four groups (world, buildings, peoples, ui); each group's task prompt says which parts of section 8 it owns. Sections 1–7 and 10 apply to every group.

---

## 1. What PlanetForge is

PlanetForge is a small, cozy **2D strategy / colony-builder game** ("mini 4X") for phones and browsers, played in **portrait orientation with one thumb**. It is inspired by the *mechanics* of a 2017 mobile game, but **all art, names and sounds must be 100 % original** (see section 2).

How it plays:

- The player leads a **people of cute animals** on a tiny planet.
- A planet is drawn as a **round disc whose surface is split into a ring of segments** (default 24 segments, 15° each; other planets may have 12, 16 or 32). The player rotates this "planet wheel" with a finger.
- Every segment has a **biome** (forest, mountains, ocean, swamp, savanna, desert, tundra, crystal field) and raw resources. At the start only a few segments are explored; the rest is covered by fog.
- The player assigns **citizens** (small animal characters) to segments to gather resources, and **builds one building per segment**: housing, mines, pumps, farms, a foundry that converts resources, power plants, research labs, air filters, a rocket launch pad.
- Raw resources (food, wood, stone, sand, clay, iron, coal, water, oil, biogas, uranium, an exotic crystal) are refined into goods (glass, concrete, steel, plastic, electronics, computers). Special values: energy, science, ascension points, pollution.
- Progress: ascension levels unlock buildings; science buys **discoveries** (passive upgrades shown as cards with icons).
- Expansion: rockets fly citizens to **other planets and asteroids** in a procedurally generated star system (star map view with a sun, planets, orbits, sight radius).
- Other animal peoples (AI factions) live on other planets: trade, peace, alliance, ultimatums, war. Occasionally **monsters** appear.
- **Coop**: 2 to 4 human players share one star system online. Each player has a color; players can ping segments and see each other's cursors.

Tech context (you only need this for file formats): web app with **TypeScript + Vite + PixiJS**, later packaged for Android and iOS with Capacitor. Sprites are rotated by the engine so they stand radially on the planet surface. Target screens: phones from 360×640 CSS px up to tablets, device pixel ratio 2–3.

## 2. Legal / originality rules (strict)

- Do **not** reproduce, trace or imitate art, logos, character designs, UI, or names from "A Planet of Mine" (Tuesday Quest) or any other existing game. Do not search for or reference its screenshots.
- Our peoples deliberately avoid the original's animals. **Do not draw crocodiles, elephants, unicorns, teddy bears, pandas, moles, fennec foxes, penguins, cyclops creatures, nautiluses, or star-nosed creatures as a faction.**
- No text, letters or numbers inside any image except the PlanetForge logo (section 8.10). The game localizes all text in code.
- No third-party assets, fonts, clip art or icon packs. Everything is drawn by you as SVG code.

## 3. Art direction

Mood: **cozy, friendly, hand-made toy universe**. Think soft rounded shapes, chunky silhouettes, warm colors, a little humor in the characters. Readable on a small phone at a glance.

Rules that apply to every asset:

1. **Flat vector style**: solid fills, 2–3 tones per material (base, shadow, highlight). No photo textures, no noise, no realistic rendering. Gradients only for planet bodies, atmospheres, sun glow, sky/space backgrounds and FX glows.
2. **Outline**: every object has a dark outline in `--ink` (`#2B2340`), never pure black. Stroke width **6 px at the 256 px reference size** (scale proportionally: 3 px on 128, 12 px on 512). `stroke-linejoin="round"`, `stroke-linecap="round"`. Inner detail lines are thinner (half width) and may use a darker shade of the fill instead of ink.
3. **Light** comes from the **top-left**. Shadow tone on the bottom-right side of each shape, small highlight spots top-left.
4. **Shapes**: rounded corners everywhere (min radius ~8 px at 256). Slightly exaggerated, toy-like proportions: big roofs, big heads, short legs.
5. **Silhouette test**: every building, character and icon must be recognizable as a solid black silhouette at **32 px**. Distinguish icons by shape first, color second (color-blind safety).
6. **No text** inside images.
7. **Palette**: use only these tokens plus their shade/highlight variants (±15–20 % lightness). Put them in `art/palette.json` and reuse them via a shared source so a later palette change is one edit.

| Token | Hex | Use |
|---|---|---|
| ink | `#2B2340` | outlines, darkest details |
| space-deep | `#141029` | space background |
| space | `#241B4A` | space background light |
| cream | `#FFF4DE` | UI panels, highlights |
| paper | `#F3E3C3` | UI panel shade |
| grass | `#7BC96F` | forest/savanna ground |
| leaf | `#3E9B5B` | trees, foliage |
| moss | `#5E8C4A` | swamp vegetation |
| water | `#4FB3E8` | ocean, water |
| deep-water | `#2B6CB0` | ocean shade, water icons |
| sand | `#F2D07A` | desert, sand |
| savanna | `#E3B55B` | savanna ground |
| clay | `#D9825B` | clay, roofs |
| rock | `#9AA0B5` | mountains, stone |
| rock-dark | `#6B7089` | mountain shade |
| snow | `#EAF6FF` | tundra |
| iron | `#B86B4B` | iron ore (rusty) |
| coal | `#3D3A4A` | coal |
| oil | `#2E2440` | oil (with violet sheen `#6B4FA0`) |
| toxic | `#A8D84A` | biogas, pollution |
| uranium | `#8CF25A` | uranium glow |
| crystal | `#C77DFF` | exotic crystal "aetherite", magic/discoveries |
| energy | `#FFD23F` | energy |
| science | `#5BC0EB` | science |
| ascension | `#FF9F1C` | ascension |
| danger | `#EF476F` | war, alerts, demolish |
| ok | `#06D6A0` | confirm, positive |
| player-1 | `#FF6B6B` | coop player 1 |
| player-2 | `#4D96FF` | coop player 2 |
| player-3 | `#FFD93D` | coop player 3 |
| player-4 | `#6BCB77` | coop player 4 |

## 4. Repository, folders and naming

Repository `Wuerfelduell/PlanetForge`. The game code lives in `src/` and is built by someone else. **Do not touch `src/`, `index.html`, `vite.config.*`, the root `package.json`, or game logic.** Art owns only these paths:

```
art/
  BRIEF.md                # this file
  palette.json            # color tokens (section 3), already done
  manifest/<group>.json   # one manifest fragment per group: world, buildings, peoples, ui
  src/<category>/         # SVG master files, one asset per file
  preview/index.html      # contact sheet + live planet wheel, already done
scripts/assets/           # Node pipeline (own package.json), already done
  gen-<group>.mjs         # each group's own generator script
public/assets/            # GENERATED by assets:build, never committed
```

`art/manifest.json` and `public/assets/atlas|sprites` are **generated and git-ignored**: `assets:gen` merges the fragments, `assets:build` exports PNG atlases. Never commit them. Each group touches only its own fragment, its own generator and its own `art/src/<category>` folders, so groups can run in parallel without merge conflicts. Do not add npm dependencies.

**File naming**: lowercase kebab-case, `category/<id>[-<variant>][-<state>][-f<frame>].svg`. Examples:
`buildings/housing-t2.svg`, `buildings/mine-construction.svg`, `peoples/burrowbeavers-citizen-walk-f2.svg`, `resources/iron.svg`, `ui/icon-demolish.svg`.

The ids in section 8 are fixed. The game code will reference them; do not rename them.

## 5. SVG technical rules

- Hand-written, clean SVG 1.1. Every file has a `viewBox` and **no** `width`/`height` attributes.
- No `<text>`, no `<image>`, no external references, no filters except `feGaussianBlur` for glows (FX, sun, atmosphere only), no CSS animations, no scripts, no fonts.
- Group parts that the engine might animate separately with an `id`, e.g. `<g id="blades">`, `<g id="smoke-anchor">`, and document them in the manifest (`parts`).
- Keep each file under 30 KB. Round coordinates to at most 1 decimal.
- Colors as hex literals generated from `palette.json` (it is fine to write a small build step that substitutes tokens like `var(--leaf)` in sources; then keep sources tokenized and generate plain-hex SVGs).

**Reference canvases and anchors** (anchor = the point the engine places on the planet surface or screen; values are fractions of width/height):

| Category | viewBox | Content area | Anchor |
|---|---|---|---|
| buildings | `0 0 256 256` | footprint 200 px wide centered, ground line at **y = 240** | (0.5, 0.9375) bottom-center on ground line |
| props (trees, rocks on biomes) | `0 0 128 128` | ground line at y = 120 | (0.5, 0.9375) |
| citizens (small characters) | `0 0 128 128` | ground line at y = 120, character ~80–96 px tall | (0.5, 0.9375) |
| portraits (people, monsters) | `0 0 512 512` | bust/head, centered, transparent background | (0.5, 0.5) |
| resource & discovery & UI icons | `0 0 128 128` | 8 px safe margin | (0.5, 0.5) |
| emblems / flags | `0 0 256 256` | | (0.5, 0.5) |
| planet bodies | `0 0 1024 1024` | disc radius 400 centered | (0.5, 0.5) |
| sun | `0 0 1024 1024` | core radius ~240 + glow to edge | (0.5, 0.5) |
| UI 9-slice panels | `0 0 192 192` | slice insets 48 px each side | — |
| app icon | `0 0 1024 1024` | full bleed, safe zone circle r = 340 for Android adaptive | — |

All sprites that stand on the planet are drawn **upright** (ground at the bottom). The engine rotates them radially.

**Planet wheel geometry** (reference planet, 24 segments): planet body radius `R = 400`, the walkable ground band from `r = 400` to `r = 460`, buildings and props stand on `r = 460` pointing outward. One 15° segment is about 120 px wide at `r = 460`, so the engine scales a 200 px building footprint to the segment width. Biome ground wedges must work for 12, 16, 24 and 32 segments, so **generate them** with a script (section 8.1) instead of drawing one fixed wedge.

## 6. Manifest (the contract with the game)

`art/manifest/<group>.json` lists every asset of that group; the merged `art/manifest.json` is what the game reads. Fragment format:

```json
{
  "assets": [
    {
      "id": "building.housing.t2",
      "category": "buildings",
      "src": "art/src/buildings/housing-t2.svg",
      "out": "public/assets/sprites/buildings/housing-t2.png",
      "viewBox": [256, 256],
      "anchor": [0.5, 0.9375],
      "frames": 1,
      "parts": ["chimney-smoke-anchor"],
      "tags": ["housing", "tier2"],
      "phase": "P0"
    }
  ]
}
```

Animated assets: one SVG per frame (`-f1`, `-f2`, …), one manifest entry with `"frames": n` and `"src"`/`"out"` using `{f}` as a placeholder, plus `"fps"`.

## 7. Build, export and validation scripts (already in place)

Run from the repo root:

```sh
npm --prefix scripts/assets install
npm --prefix scripts/assets run assets:gen     # merge manifest fragments
npm --prefix scripts/assets run assets:check   # validates ids, files, viewBox, colors, forbidden SVG content
npm --prefix scripts/assets run assets:build   # PNG export + PixiJS atlases into public/assets (not committed)
npm --prefix scripts/assets run assets:preview # http://localhost:4173/art/preview/
```

`scripts/assets/common.mjs` has helpers you should reuse: `C(token, tone)` for palette colors and shades (only `±0.18` tones pass the check), `svg(body, w, h)` for the root element with the ink outline, `round()`, `write()`. `assets:check` must pass before every push.

**Asset ids**: `biome.<biome>.wedge.<segments>`, `biome.<biome>.prop.<name>`, `overlay.<id>.<segments>`, `planet.<id>`, `space.<id>`, `resource.<id>[.mini]`, `building.<id>.t<n>` (or `building.<id>` when the building has only one tier) with states `building.<id>.t<n>.construction` / `.off`, `people.<id>.portrait[.happy|.angry]`, `people.<id>.citizen.<idle|walk|work>`, `people.<id>.emblem`, `monster.<id>.<portrait|sprite>`, `discovery.<id>`, `ui.<id>`, `fx.<id>`, `brand.<id>`.

## 8. Asset list

Priority per item: **P0** = needed for the first playable prototype, **P1** = full single-player game, **P2** = polish. Ids in `code` style are fixed. German display names are suggestions for the game, not part of the files.

### 8.1 Biomes (ground wedges + props) – P0

Biome ids: `forest`, `mountains`, `ocean`, `swamp`, `savanna`, `desert`, `tundra`, `crystal`.

For each biome:
- **Ground wedge generator**: a function `wedge(biome, segments)` that returns **one** annular sector per biome and planet size, **centered on 12 o'clock** (the engine rotates it to each segment; do not export one file per segment angle), from `r = 400` to `r = 460` (plus a 2 px overlap to avoid seams) with the biome's ground pattern: base color, a lighter top edge (grass line, sand ridge, snow cap, water surface with 2–3 small wave arcs, swamp puddles, crystal shards), and a darker bottom edge where it meets the planet body. Patterns must tile seamlessly across neighboring wedges of the same biome and look intentional where two different biomes meet (soft transition, no hard color seam). Generate for 12, 16, 24, 32 segments.
- **Props** (stand on the surface, 128 canvas), 3 variants each: forest `tree-a/b/c` (round cozy trees), mountains `peak-a/b/c` (rounded peaks, one with snow), ocean `wave-a/b` and `buoy`… (keep ocean mostly flat; props are small waves, a fish jumping), swamp `reed-a/b`, `mushroom`, savanna `bush-a/b` (berry bushes with red-orange berries = food source), `acacia`, desert `cactus-a/b`, `dune`, tundra `pine-snow-a/b`, `ice-rock`, crystal `crystal-a/b/c` (glowing violet).
- **Overlays** (wedge-shaped, generated, one per segment count, centered on 12 o'clock like the wedges): `fog` (unexplored: soft cloudy dark-violet cover with a subtle question-mark-free swirl pattern), `depleted` (cracked, desaturated), `polluted` (toxic-green haze spots), `selected` (bright cream rim highlight), `hover` (thin rim), and `player-ping` (white, tinted by engine to the player color).

### 8.2 Planets and space – P0 (planet-temperate, sun-yellow, starfield), rest P1

- Planet bodies (1024 canvas, disc r = 400, the ground wedges sit on top): `planet-temperate`, `planet-arid`, `planet-ice`, `planet-lava`, `planet-toxic`, `planet-ocean`. Show stylized core layers or crust texture inside the disc (the center is visible behind UI, keep it calm, low contrast), plus a soft atmosphere ring as a separate file `atmosphere-<type>` (r 460–520).
- Small star-map versions (256 canvas): `mini-<type>` for each planet type, readable at 40 px, plus `mini-owned-ring` (white ring, engine-tinted to player/faction color).
- Suns (1024): `sun-yellow`, `sun-red`, `sun-blue`, `sun-white`, each with a friendly but faceless look (no face), glow via blur, plus `sun-corona` as a separate slowly rotatable layer.
- Asteroids (256): `asteroid-a/b/c/d`, plus `asteroid-rich` with visible crystal veins.
- Background: `starfield-tile` (512×512, seamlessly tileable, two densities of small dots in cream/science/crystal tints on transparent), `nebula-a/b` (1024, soft large blobs, transparent), `bg-space` (gradient space-deep → space, 1024×2048 portrait).
- Star map elements: `orbit-dash` (tileable dashed line segment 64×8), `sight-radius-edge` (soft ring 1024), `travel-path-dot`, `waypoint`.

### 8.3 Resources (icons, 128) – P0

Each resource has an icon `resource.<id>`. Draw them as small chunky objects (a pile, a log, a droplet…), clearly different silhouettes:

| id | Look (suggestion) | German name (game) |
|---|---|---|
| `food` | round red-orange berries "plumberries" in a small cluster with a leaf | Pflaumbeeren |
| `wood` | two stacked logs with rings | Holz |
| `stone` | three grey rounded stones | Stein |
| `sand` | small sand pile with a sparkle | Sand |
| `clay` | lump of terracotta clay with a fingerprint dent | Lehm |
| `iron` | rusty ore chunk with metal veins | Eisen |
| `coal` | black faceted lumps with a tiny ember | Kohle |
| `water` | droplet | Wasser |
| `oil` | dark violet-black droplet with sheen | Öl |
| `biogas` | small green gas bubble cluster | Biogas |
| `uranium` | glowing green rod/pellet (no hazard symbol text) | Uran |
| `aetherite` | violet floating crystal (exotic late-game) | Ätherit |
| `glass` | glass pane/bottle with reflection | Glas |
| `concrete` | grey block with rough sides | Beton |
| `steel` | steel ingot/girder | Stahl |
| `plastic` | colorful bendy pellets or a cube with rounded edges | Plastik |
| `electronics` | circuit chip with pins | Elektronik |
| `computer` | tiny cute retro computer box with screen glow | Computer |
| `energy` | lightning bolt | Energie |
| `science` | flask with bubbles | Wissenschaft |
| `ascension` | rising star/spark with upward arrow shape | Aufstieg |
| `pollution` | dark smog cloud | Verschmutzung |
| `population` | small group of three generic animal heads (neutral) | Bevölkerung |

Also a 64-canvas **mini** variant for every resource (`resource.<id>.mini`, simplified, thicker outline 4 px) for use inside text and resource bars.

### 8.4 Buildings (256) – P0 marked, rest P1

For **every** building: the finished sprite, plus states drawn as separate files: `-construction` (scaffolding over the outline of the building), `-idle` is the normal sprite, `-off` (grey-blue desaturated, lights off; may be generated by script from the normal sprite). Status badges are separate UI icons (8.8), not baked in. Mark animatable parts with group ids.

| id | Description | Tiers / variants | Parts | Phase |
|---|---|---|---|---|
| `housing` | t1 small round hut with straw/leaf roof → t2 cozy clay house with chimney → t3 tall stacked apartment tower made of 3 rounded pods | `t1`, `t2`, `t3` | `chimney-smoke-anchor`, `windows` (for night glow) | P0 |
| `mine` | wooden frame entrance in a hill with mine cart and rails | `t1`, `t2` (steel frame, conveyor) | `cart`, `wheel` | P0 |
| `pump` | hand pump → small derrick with rocking head (for water, oil, biogas) | `t1`, `t2` | `pump-arm` | P0 |
| `farm` | small field rows with berry bushes and a tiny shed | `t1`, `t2` (greenhouse) | — | P0 |
| `foundry` | chunky brick furnace with big chimney and glowing mouth; recipe is shown by an icon badge, not by separate sprites | `t1`, `t2` | `glow`, `smoke-anchor` | P0 |
| `lab` | round observatory-like research lab with small dome and antenna | `t1`, `t2` | `dome`, `antenna-light` | P0 |
| `power-coal` | squat power plant with two cooling towers | single | `smoke-anchor` | P1 |
| `power-wind` | wind turbine with three round blades | single | `blades` (rotates around hub) | P1 |
| `power-solar` | tilted solar panels on a stand | single | — | P1 |
| `power-atomic` | rounded reactor dome with green glow | single | `glow` | P2 |
| `air-filter` | big friendly fan tower with leaf emblem | single | `fan` | P1 |
| `hydro-farm` | stacked glowing hydroponic shelves in a glass box | single | `glow` | P1 |
| `storage` | barn-like warehouse with crates | `t1`, `t2` | — | P1 |
| `market` | market stall with awning (trade post) | single | `flag` | P1 |
| `launchpad` | launch platform with gantry tower | single | — | P0 |
| `rocket-small` | small round-nosed rocket standing on the pad (separate sprite, can fly) | single | `flame-anchor` | P0 |
| `rocket-big` | larger late-game ship with fins and crystal engine | single | `flame-anchor` | P1 |
| `watchtower` | defense/lookout tower with banner (for war/monsters) | single | `banner` | P1 |
| `monument` | ascension monument: tall obelisk with floating star | single | `star` | P2 |
| `ruin` | generic rubble pile left after demolition or war | single | — | P1 |
| `escape-pod` | crashed survival capsule (openable bonus) | `closed`, `open` | — | P1 |

### 8.5 Peoples (playable / AI factions) – 2 in P0, rest P1

Twelve original animal peoples. Each has a fixed id, an animal, a favorite biome and a signature color (palette token). Keep each people's design **very distinct in silhouette** (ears, tails, body shape). They wear small simple clothing/gear that hints at their trait.

| id | Animal | Favorite biome | Color token | Character idea | German name |
|---|---|---|---|---|---|
| `burrowbeavers` (P0) | beaver | forest | clay | builders, hard hats, big tails | Dammbiber |
| `quillfolk` (P0) | hedgehog | savanna | savanna | gatherers, berry baskets, spiky round | Stachelvolk |
| `axolings` | axolotl | swamp | crystal (pink-violet tint) | cheerful, gills like frills, healers | Axolinge |
| `shellguards` | armadillo | mountains | rock | sturdy miners, roll up | Panzerlinge |
| `dunehoppers` | jerboa | desert | sand | tiny, huge feet and ears, fast | Dünenhüpfer |
| `starowls` | owl | mountains | science | astronomers with goggles (bigger sight radius) | Sterneulen |
| `tideotters` | otter | ocean | water | swimmers, life vests | Gezeitenotter |
| `hornbeetles` | rhinoceros beetle | savanna | iron | strong, metal workers | Hornkäfer |
| `frostseals` | seal | tundra | snow | round, knitted scarves | Frostrobben |
| `swapcoons` | raccoon | forest | coal (grey) | traders with backpacks full of goods | Tauschbären |
| `glowsnails` | snail | swamp | toxic | slow, glowing shells, pollution-tolerant | Glimmschnecken |
| `echobats` | bat | crystal | crystal | cave dwellers, crystal miners | Echoflatterer |

Per people:
- `peoples/<id>-portrait.svg` (512): friendly bust, slight 3/4 view, expressive face. P0 for the two P0 peoples.
- `peoples/<id>-portrait-angry.svg` and `-happy.svg` (512): expression variants for diplomacy. P1.
- `peoples/<id>-citizen-idle-f1..f2.svg`, `-walk-f1..f4.svg`, `-work-f1..f2.svg` (128): tiny full-body character on the planet surface, side view facing right (engine mirrors). Big head, short body, ~80–96 px tall. Work frames show a generic tool swing.
- `peoples/<id>-emblem.svg` (256): round badge/flag symbol of the people (e.g. beaver: crossed logs), no letters.
- Extra for coop: `peoples/citizen-ring.svg` (128) – white ellipse marker under a citizen's feet, engine-tinted to player color.

### 8.6 Monsters – P1

Three original, cute-but-dangerous creatures, each with a portrait (512) and a planet sprite (256, standing on the surface, anchor bottom-center, 2 idle frames):
- `rockmunch` – a giant rock-eating worm/caterpillar with pebble teeth.
- `stormjelly` – a floating electric jellyfish cloud.
- `thornback` – a big spiky shelled lizard that crushes buildings.

Also `fx-dice` (128, a rounded six-sided die, faces with dots only, faces 1–6 as frames) for the battle roll.

### 8.7 Discoveries (icons, 128, on a round badge) – P1

Each discovery icon sits on a shared badge background `ui/discovery-badge.svg` (rounded hexagon, cream with crystal rim; plus `-locked` grey and `-available` glowing variants). Icon ids:

`diplomacy` (handshake of two paws), `ecology` (leaf + droplet), `space-mining` (pickaxe + asteroid), `pure-science` (flask with star), `deep-drilling` (drill bit), `efficient-housing` (house + plus), `green-thumb` (sprout from hand), `rocketry` (rocket + orbit), `long-range-sight` (telescope), `trade-routes` (two arrows exchanging a crate), `recycling` (circular arrows around a crate), `fortification` (wall + shield), `crystal-lore` (aetherite + sparkles), `atomic-power` (glowing atom of round dots), `automation` (gear + robot arm), `cartography` (folded map with dotted path), `medicine` (bandage/heart), `festival` (bunting flags, boosts happiness), `weather-control` (cloud + sun), `terraforming` (planet + sprout), `survival-kits` (escape pod), `storage-tech` (stacked crates), `energy-grid` (bolt connecting three dots), `swift-feet` (winged paw).

### 8.8 UI kit – P0 core, rest P1

Style: chunky, soft, cream panels with ink outline and a 6 px darker bottom edge (pressed look), rounded corners radius 24 at 192 canvas. All UI drawn in neutral colors so the engine can place icons on top.

- **9-slice panels** (192): `panel`, `panel-dark` (space-colored for star map), `panel-tooltip` (with small pointer as separate `tooltip-pointer` 64), `card` (discovery/building card), `bar-bg` (resource top bar), `toast`.
- **Buttons** (192 9-slice, plus states): `button-primary` (ascension orange), `button-secondary` (cream), `button-danger`, `button-ok`; each with `-pressed` and `-disabled`. `button-round` (128) with the same states for icon buttons.
- **Tab icons** (128): `tab-planet`, `tab-starmap`, `tab-build`, `tab-people`, `tab-diplomacy`, `tab-discoveries`, `tab-coop` (two linked paws), `tab-settings`.
- **Action icons** (128): `icon-build`, `icon-demolish`, `icon-upgrade`, `icon-assign`, `icon-unassign`, `icon-move`, `icon-launch`, `icon-trade`, `icon-peace`, `icon-alliance`, `icon-war`, `icon-ultimatum`, `icon-info`, `icon-close`, `icon-back`, `icon-confirm`, `icon-cancel`, `icon-rotate-left`, `icon-rotate-right`, `icon-speed-1`, `icon-speed-2`, `icon-speed-3`, `icon-pause`, `icon-ping`, `icon-chat`, `icon-invite` (link + paw), `icon-sound-on`, `icon-sound-off`, `icon-help`.
- **Status badges** (64, round, shown above buildings): `badge-no-energy`, `badge-no-workers`, `badge-storage-full`, `badge-depleted`, `badge-polluted`, `badge-hungry`, `badge-producing` (small gear), `badge-upgrade-ready`, `badge-attack`.
- **Bars**: `progress-bg` and `progress-fill` (9-slice horizontal, 128×32), `ring-progress` (128, circular for build timers, fill drawn by engine).
- **Coop**: `cursor-player` (64, white paw-shaped pointer, engine-tinted), `ping-marker` (128, animated 3 frames: drop pin + expanding ring), `avatar-frame` (128, round frame, engine-tinted), `crown-host` (64).
- **Tutorial helper**: `guide-mascot` (512) – a small friendly robot-drone mascot (not an animal people) with 4 expressions as frames (`neutral`, `point`, `happy`, `worried`) that explains the game. The original game's weak tutorial is a known problem; this mascot is our fix, so give it charm.
- `segment-selector` (256): arrow/bracket that hovers above the selected segment.

### 8.9 FX (sprite frames) – P1

`fx-smoke` (64, 4 frames puff growing and fading), `fx-dust` (128, 4 frames construction dust), `fx-sparkle` (64, 3 frames), `fx-resource-pop` (64, 3 frames, round burst behind a resource icon), `fx-rocket-flame` (128, 3 frames looping), `fx-explosion` (256, 5 frames, cartoon cloud with stars, not gory), `fx-ascension` (512, 4 frames, rising ring of light), `fx-heart` (64, diplomacy happy), `fx-anger` (64, diplomacy angry, cartoon steam).

### 8.10 Brand – P0 logo, P1 rest

- `brand/logo` (1024×512): the word "PlanetForge" in a custom chunky rounded hand-drawn lettering built from paths (no font), next to a small planet with a hammer/anvil spark. Also `logo-mark` (512) without text.
- `brand/app-icon` (1024): a cozy planet with one building and one beaver citizen on top, on a space background, full bleed. Plus `app-icon-foreground` (transparent, content inside r = 340) and `app-icon-background` (plain space gradient) for Android adaptive icons.
- `brand/splash` (1080×1920 portrait): space background, centered logo mark, generous empty space.

## 9. Delivery

Each group works on its own branch (named in its task prompt), commits and **pushes after every small batch** (about 10 assets), and opens one pull request to `main`. Do not edit `art/README.md`, `art/preview/`, `common.mjs`, `check.mjs` or `build.mjs` (shared files, other groups run in parallel). Put changelog and decisions in your PR description instead.

## 10. Quality checklist (check before every commit)

- [ ] Same outline color and proportional width everywhere.
- [ ] Light from top-left everywhere.
- [ ] Only palette colors (and their shades).
- [ ] No text in images (except the logo wordmark).
- [ ] Silhouette recognizable at 32 px; icons differ in shape, not only color.
- [ ] Buildings and citizens stand exactly on the ground line; nothing floats or sinks on the planet wheel in the preview.
- [ ] Biome wedges have no visible seams for 12/16/24/32 segments.
- [ ] Characters and buildings feel like they belong to the same cozy toy world.
- [ ] Nothing resembles the original game's characters, UI or logo.
- [ ] Manifest complete, ids exactly as listed here.

If something in this brief is ambiguous, choose the option that keeps the art consistent and readable on a small phone, note the decision in your PR description, and continue.
