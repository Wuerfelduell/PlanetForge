# PlanetForge · Original Art

Alle Grafiken sind eigene, aus Pfaden und Grundformen aufgebaute SVGs. Keine Fremdassets, Fonts oder Bildgeneratoren. Der Spielcode wird nicht verändert.

## Ausführen

```sh
npm --prefix scripts/assets install
npm --prefix scripts/assets run assets:gen
npm --prefix scripts/assets run assets:check
npm --prefix scripts/assets run assets:build
npm --prefix scripts/assets run assets:preview
```

Vorschau: http://localhost:4173/art/preview/index.html. Alternativ das Repo mit einem beliebigen statischen HTTP-Server öffnen; kein Vite-Build nötig.

`art/manifest/<gruppe>.json` sind die Manifest-Teile je Assetgruppe; `assets:gen` fügt sie zu `art/manifest.json` zusammen (generiert, nicht eingecheckt, genau wie `public/assets/atlas/`). Das ist der Vertrag mit dem Spielcode. `public/assets/atlas/index.json` ordnet alle Frames ihren Atlas-Seiten zu. Die erste Seite heißt `<category>@1x.json`, weitere `-2`, `-3` usw.; entsprechend bei 2x. Texturen sind getrimmt, Source-Größe und Pivot bleiben erhalten. Alle Frames stehen zusätzlich als einzelne PNGs zur Verfügung. Animationen über mehrere Seiten sind im Atlas-Index vollständig aufgeführt.

## Decisions

- Eigene npm-Umgebung in `scripts/assets/`, damit der parallele Entwickler die Root-Konfiguration frei aufbauen kann.
- IDs: `building.<id>.<tier>`, `resource.<id>[.mini]`, `people.<id>.<role>[.<action>]`, `biome.<biome>.wedge.<segments>`, `overlay.<id>.<segments>`. Ein Keil pro Biom und Planetengröße, zentriert auf 12 Uhr; die Engine dreht ihn pro Segment (vorher ein Keil pro Segmentwinkel, das waren über 1.000 Einträge). Singular bezeichnet einen Assettyp; Kategorien/Verzeichnisse bleiben plural.
- Palette: `oil-sheen` ist die im Brief ausdrücklich genannte Ölschimmerfarbe. `tint-white` ist die ausdrücklich verlangte weiße Tönungsmaske. Alle sonstigen Varianten entstehen ausschließlich durch ±18 Prozentpunkte HSL-Helligkeit.
- Lieferung in vier Gruppen auf eigenen Branches (`codex/assets-world`, `-buildings`, `-peoples`, `-ui`), jede mit eigenem Manifest-Teil, damit sie parallel laufen können.
- Gebäude-IDs folgen `buildingSprite()` in `src/data/balance/index.ts`: `building.<id>.t<n>`, bei nur einer Stufe `building.<id>`; Zustände als Suffix `.construction` / `.off`.
- Porträt-Hintergründe mit mehr als 2048 Pixeln Höhe bei 2x bleiben Einzeltexturen; der Atlas-Index kennzeichnet sie als `standalone`.

## Changelog

- Phase 0: Palette, Manifest, isolierte Node-Pipeline, deterministischer PNG-/Atlasexport und responsive Kontaktübersicht mit drehbarem Platzhalterplaneten eingerichtet.
