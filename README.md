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
| `src/sim/` | Spiellogik, reines TypeScript ohne DOM und Rendering. Befehle rein (`applyCommand`), feste Ticks (`step`, 10 pro Sekunde), JSON-Zustand raus. Deterministisch per Seed. Läuft unverändert im Browser, in Node oder in einer Edge Function. `npm run typecheck` prüft das mit einer eigenen tsconfig ohne DOM-Typen. |
| `src/sim/content.ts` | Alle Inhalte und Balancing-Werte: Ressourcen, Biome, Gebäude, Regeln. |
| `src/client/` | `GameSession`-Schnittstelle, über die Render und UI mit dem Spiel reden. `LocalSession` ist Einzelspieler; eine Netzwerk-Session für Koop ersetzt sie, ohne UI-Code zu ändern. Dazu Speichern in `localStorage`. |
| `src/render/` | PixiJS: Planetenrad, Drehen per Wischen, Antippen wählt ein Feld. Platzhalter-Grafik (Farben und Emojis), bis echte Assets kommen. |
| `src/ui/` | HTML-Overlay: Ressourcenleiste, Feld-Panel, Hinweise, Meldungen. |

## Stand (Prototyp)

- Planet mit 24 Feldern und 6 Biomen, prozedural per Seed, Start-Bereich garantiert Holz, Nahrung und Stein.
- Einwohner von Hand sammeln lassen, Bodenschätze erschöpfen sich und wachsen nach, wenn man sie in Ruhe lässt.
- Gebäude: Hütte, Farm, Mine, Brunnen, Labor; Nachbarschafts-Boni; Bauen deckt Felder auf; Abreißen gibt 50 % zurück.
- Nahrungsverbrauch pro Planetenumlauf, Hunger halbiert die Arbeit, Nachwuchs braucht Wohnraum und Nahrung.
- Aufstiegspunkte pro Umlauf, Stufen schalten Gebäude frei.
- Kontext-Hinweise statt Tutorial, Spieltempo ⏸/1×/3×, automatisches Speichern.
