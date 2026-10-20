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

- Zwei Modi: **Koop** (Standard, auf Langzeit angelegt): alle teilen einen großen Startplaneten (32 Felder), sein Lager und den Aufstieg; jeder Mitspieler bringt 2 Einwohner mit. **Gegeneinander** (kurzweilig): jeder hat einen eigenen Startplaneten, ein eigenes Lager und einen eigenen Aufstieg und darf nur auf seinem Planeten bauen.
- Sternsystem per Seed: Sonne, Startplanet(en) und 2 bis 4 freie Planeten mit Typen (gemäßigt, trocken, Eis, Ozean, Lava, giftig), die die Biome bestimmen. Startbereich garantiert Holz, Nahrung und Stein. Seltene Rohstoffe (Kohle, Öl, Uran, Ätherit) liegen im Koop alle auf dem gemeinsamen Planeten; im Gegeneinander-Modus sind sie so verteilt, dass sich die Startplaneten ergänzen.
- Jeder Einwohner ist eine Einheit mit Besitzer und Volk; nur der Besitzer setzt sie ein. Lager und Aufstieg gehören zur Wirtschaft (Koop: eine gemeinsame, Gegeneinander: eine pro Spieler).
- Lobby-Uhr: Das Spiel läuft nur, solange der Gastgeber die Lobby geöffnet hat und niemand pausiert; geschlossen wird nichts nachgerechnet. Ein Protokoll hält die letzten 200 Ereignisse fest.
- Mitspieler steigen mit `addPlayer(state, playerId, name, now)` in ein laufendes Spiel ein.
- Bisher zeigt das Spiel nur den eigenen Planeten; eine Sternkarte folgt.
- Einwohner von Hand sammeln lassen, Bodenschätze erschöpfen sich und wachsen nach, wenn man sie in Ruhe lässt.
- Gebäude: Hütte, Farm, Mine, Pumpe, Labor; Nachbarschafts-Boni; Bauen deckt Felder auf; Abreißen gibt 50 % zurück.
- Nahrungsverbrauch pro Planetenumlauf, Hunger halbiert die Arbeit, Nachwuchs braucht Wohnraum und Nahrung.
- Aufstiegspunkte pro Umlauf, Stufen schalten Gebäude frei.
- Kontext-Hinweise statt Tutorial, Spieltempo ⏸/1×/3×, automatisches Speichern.
