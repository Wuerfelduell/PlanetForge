# PlanetForge

Ein gemütliches Mini-4X im Hochformat: Ein kleiner Planet als drehbares Rad aus Feldern, Einwohner sammeln, Gebäude decken neue Felder auf, Aufstiegsstufen schalten mehr frei. Später mit Koop, Android und iOS.

**Spielen:** https://wuerfelduell.github.io/PlanetForge/ (wird bei jedem Push auf `main` neu gebaut)

## Entwickeln

```bash
npm install
npm run dev        # Dev-Server, im Handy-Browser über die angezeigte Netzwerk-Adresse testbar
npm test           # Tests der Spiellogik
npm run build      # Typecheck + Produktions-Build nach dist/
```

## Aufbau

| Ordner | Inhalt |
|---|---|
| `src/sim/` | Spiellogik, reines TypeScript ohne DOM, Rendering, `Math.random()` oder `Date.now()`. `createGame(seed, players, { now })`, `advance(state, now)`, `applyCommand(state, playerId, cmd, now)`; rechnet in festen Ticks (10 pro Sekunde), verändert den Eingabe-Zustand nie, Zustand ist reines JSON. Deterministisch per Seed. Läuft unverändert im Browser und in einer Supabase Edge Function (Deno). `npm run typecheck` prüft das mit einer eigenen tsconfig ohne DOM-Typen. |
| `src/sim/content.ts` | Alle Inhalte und Balancing-Werte: Ressourcen, Biome, Gebäude, Regeln. IDs wie in der Asset-Liste (`codex/asset-prompt.md`, Abschnitt 8). |
| `src/client/` | `GameSession`-Schnittstelle, über die Render und UI mit dem Spiel reden. `LocalSession` ist Einzelspieler; eine Netzwerk-Session für Koop ersetzt sie, ohne UI-Code zu ändern. Dazu Speichern in `localStorage`. |
| `src/render/` | PixiJS: Planetenrad, Drehen per Wischen, Antippen wählt ein Feld. Platzhalter-Grafik (Farben und Emojis), bis echte Assets kommen. |
| `src/ui/` | HTML-Overlay: Ressourcenleiste, Feld-Panel, Hinweise, Meldungen. |

## Stand (Prototyp)

- Sternsystem per Seed: Sonne, ein Startplanet pro möglichem Spieler (bis 4) und 2 bis 4 freie Planeten mit Typen (gemäßigt, trocken, Eis, Ozean, Lava, giftig), die die Biome bestimmen. Startbereich garantiert Holz, Nahrung und Stein.
- Seltene Rohstoffe (Kohle, Öl, Uran, Ätherit) werden so auf die Startplaneten verteilt, dass sich Spieler ergänzen. Lager, Einwohner und Nahrung gehören jeweils zum Planeten; nur der Besitzer darf dort bauen. Mitspieler steigen mit `addPlayer` auf einem freien Startplaneten ein.
- Bisher zeigt das Spiel nur den eigenen Planeten; eine Sternkarte folgt.
- Einwohner von Hand sammeln lassen, Bodenschätze erschöpfen sich und wachsen nach, wenn man sie in Ruhe lässt.
- Gebäude: Hütte, Farm, Mine, Pumpe, Labor; Nachbarschafts-Boni; Bauen deckt Felder auf; Abreißen gibt 50 % zurück.
- Nahrungsverbrauch pro Planetenumlauf, Hunger halbiert die Arbeit, Nachwuchs braucht Wohnraum und Nahrung.
- Aufstiegspunkte pro Umlauf, Stufen schalten Gebäude frei.
- Kontext-Hinweise statt Tutorial, Spieltempo ⏸/1×/3×, automatisches Speichern.
