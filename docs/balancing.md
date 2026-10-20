# Balancing

Alle Zahlen stehen in `src/data/balance/` als reine TypeScript-Module (kein DOM, läuft auch in der Supabase Edge Function). Der Einstieg ist `BALANCE` aus `src/data/balance/index.ts`. Wer Werte ändert, lässt danach `npm test` laufen: `balance.test.ts` prüft Verweise, Freischaltreihenfolge und das Pacing.

Die Zahlen sind ein **erster Wurf aus Rechnung, nicht aus Playtests**. Sie sind so gewählt, dass die Kette in sich stimmt, der gemeinsame Modus auf lange Partien (Stufe 10 nach etwa 3 Stunden) und der Gegeneinander-Modus auf kurze Runden (Sieg nach etwa 30 Minuten) ausgelegt ist. Nach den ersten Testrunden werden sie sich verschieben, und genau dafür sind sie an einer Stelle gesammelt.

## Dateien

| Datei | Inhalt |
|---|---|
| `resources.ts` | Ressourcen (Lagergrenze, Wert), Biome mit Vorkommen, Planetentypen |
| `buildings.ts` | Gebäude mit Stufen, Kosten, Arbeitern, Erträgen, Energie, Verschmutzung, Nachbar-Boni; Gießerei-Rezepte |
| `peoples.ts` | 12 Völker mit Lieblingsbiom, Lieblingsressource, Startbonus und Fähigkeit |
| `discoveries.ts` | 24 Entdeckungen als Modifikatoren, Kostenformel |
| `progression.ts` | Grundregeln, Aufstieg, Energie, Verschmutzung, Monster, Kampf, Raumfahrt, Diplomatie, Spielmodi, Pacing-Ziele |
| `pacing.ts` | Überschlagsrechnung, die die Tabellen gegen die Pacing-Ziele prüft |
| `types.ts` | Schema |

## Einheiten

Wie im Prototyp: 10 Ticks pro Sekunde, ein Planetenumlauf (Zyklus) dauert 30 Sekunden. Erträge sind **pro Arbeiter und Sekunde**. Energie ist kein Vorrat, sondern eine laufende Bilanz pro Planet. Verschmutzung ist ein Planetenwert von 0 bis 100.

IDs folgen der Asset-Liste aus dem Codex-Prompt: Biome `forest`, `savanna`, `mountains`, `ocean`, `swamp`, `desert`, `tundra`, `crystal`; Gebäude `housing`, `pump` usw.; Sprite-ID `building.<id>.t<n>` (Helfer `buildingSprite()`). Der Prototyp nutzt noch `meadow`, `mountain`, `sea`, `hut`, `well`. Zuordnung beim Umstellen: meadow → savanna, mountain → mountains, sea → ocean, hut → housing, well → pump.

## Grundgedanke

**Arbeitermangel statt Platzmangel** (Sebs Entscheidung vom 20.10.2026). Der gemeinsame Startplanet hat 32 Felder (gegeneinander hat jeder 24), zu Beginn sind 7 sichtbar, und es gibt immer mehr Arbeitsplätze als Einwohner: Ein voll ausgebauter Planet bietet etwa 1,45 Jobs pro Einwohner (Test `jobsPerCitizen`). Höhere Gebäudestufen bringen vor allem mehr Arbeitsplätze. Die eigentliche Frage ist also nicht „wo baue ich“, sondern „wen setze ich wohin“.

**Nachwuchs wird mit der Größe langsamer.** Sekunden pro Geburt = Grundwert + Wert pro Einwohner × Einwohner auf dem Planeten (gemeinsam 30 + 6 × n, gegeneinander 12 + 3 × n). Bei 10 Einwohnern dauert eine Geburt im gemeinsamen Modus 90 Sekunden, bei 40 schon 4,5 Minuten. Deshalb ist jeder neue Planet mit eigenem Nachwuchs viel wert, und Entdeckungen wie Medizin oder Automatisierung sind echte Hebel. Eine Geburt kostet 15 Beeren.

Jede Gebäudestufe ersetzt die vorige, die Werte addieren sich nicht.

**Nahrung ist ein echter Posten.** 3 Beeren pro Einwohner und Umlauf (der Prototyp hatte 2). Ein Sammler von Hand ernährt 3 Einwohner, eine volle Farm 7 bis 10. Damit stecken grob 25 bis 30 % der Leute in Nahrung, und Farmen neben Savanne lohnen sich.

**Rohstoffe wachsen nach, wenn man sie lässt.** 1 % pro Sekunde auf unberührten Feldern, leer bleibt leer. Das erzwingt Rotation zwischen Feldern und macht Minen und Farmen attraktiv.

**Ressourcenwert.** Jede Ressource hat einen `value` in Arbeiter-Sekunden. Er wird für Handel, Ultimaten und den Test „Veredeln lohnt sich immer“ genutzt (Holzkohle und Biogas sind absichtlich verlustreiche Notlösungen).

## Freischaltungen pro Aufstiegsstufe

Jede Stufe bringt etwas Neues, und alles auf dem Hauptpfad kommt allein über die Stufe, nicht über Glück bei den Entdeckungen.

| Stufe | Neu |
|---|---|
| 0 | Wohnhaus, Farm |
| 1 | Mine, Pumpe |
| 2 | Labor, Wohnhaus 2, Lager |
| 3 | Gießerei (Holzkohle, Glas, Beton), Markt |
| 4 | Stahl, Farm 2 (Gewächshaus), Windrad, Kohlekraftwerk, Wachturm |
| 5 | Wohnhaus 3, Labor 2, Mine 2, Pumpe 2 (Öl), Luftfilter (mit Ökologie), Biogas |
| 6 | Gießerei 2, Plastik, Hydrofarm, Lager 2, Startrampe, kleine Rakete |
| 7 | Elektronik, Solarfeld |
| 8 | Computer, Monument |
| 9 | Große Rakete, Atomkraftwerk (mit Kernkraft) |

Der Test `homeAvailability` rechnet nach, dass jede Gebäudekosten auf dem Heimatplaneten bis zur Freischaltstufe herstellbar sind. Dafür hat der Heimatplanet immer mindestens ein Feld Wald, Savanne, Gebirge, Meer, Sumpf und Wüste (`RULES.homeGuaranteedBiomes`, muss der Generator einhalten). **Ätherit und Uran liegen nicht in den Heimat-Biomen.** Sie kommen als seltene Vorkommen, die der Generator verteilt (`RARE_RESOURCES` in `src/sim/content.ts`), meist auf anderen Planeten, und werden erst mit Tiefbohrung bzw. Kristallkunde abbaubar. Computer, Monument, große Rakete und Atomkraft ziehen den Spieler deshalb ab Stufe 7 bis 8 in den Weltraum. Ausnahme sind die Echoflatterer, die Ätherit von Anfang an abbauen können.

## Spielmodi und Pacing

Zwei Modi, Solo ist der gemeinsame Modus mit einem Spieler (`MODES` in `progression.ts`):

| | Gemeinsam | Gegeneinander |
|---|---|---|
| Startplanet | ein gemeinsamer | jeder seinen eigenen |
| Ressourcen, Aufstieg, Entdeckungen | geteilt | getrennt |
| Ziel | lange Partie, danach endlos | Stufe 8 zuerst, sonst höchste Stufe nach 35 Minuten |
| Geburt (Sekunden) | 30 + 6 × Einwohner | 12 + 3 × Einwohner |
| Entdeckungskosten | 30 × 1,35ⁿ | halb so viel |

Aufstiegspunkte pro Umlauf sind wie im Prototyp die Einwohnerzahl, dazu kommt das Monument. Die Schwellen hat `pacing.ts` aus dem Geburtenmodell abgeleitet. Die Annahme ist, dass Nahrung und Wohnraum mithalten, also ist das die schnellste realistische Kurve.

| Stufe | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 |
|---|---|---|---|---|---|---|---|---|---|---|
| Schwelle gemeinsam | 25 | 100 | 270 | 600 | 1150 | 2050 | 3300 | 5200 | 8300 | 12900 |
| Minute gemeinsam, allein | 3 | 8 | 15 | 25 | 38 | 55 | 75 | 100 | 135 | 180 |
| Einwohner dabei | 6 | 10 | 14 | 19 | 24 | 29 | 34 | 40 | 48 | 55 |
| Schwelle gegeneinander | 20 | 55 | 130 | 220 | 370 | 600 | 910 | 1210 | 1550 | 1900 |
| Minute gegeneinander | 2 | 4 | 7 | 10 | 14 | 19 | 25 | 30 | 35 | 40 |

Der Test erlaubt ±20 % pro Stufe.

**Mehr Spieler im gemeinsamen Modus.** Ein Planet heißt eine Geburtenwarteschlange. Jeder weitere Spieler bringt nur 2 Einwohner mit, und ab Stufe 6 kann jeder eine eigene Kolonie mit eigenem Nachwuchs betreiben. Die Schwellen steigen dafür mäßig (× 1 / 1,15 / 1,3 / 1,45), ebenso Entdeckungskosten (× 1 / 1,1 / 1,2 / 1,3) und Monsterstärke (× 1 / 1,3 / 1,6 / 1,9). Stufe 10 kommt dann nach 180 / 152 / 141 / 136 Minuten bei 1 / 2 / 3 / 4 Spielern. Zusammen geht es also etwas schneller, bleibt aber eine lange Partie.

**Gegeneinander** skaliert nicht mit der Spielerzahl, jeder spielt seine eigene Wirtschaft. Pro Spieler kommt ein freier Planet dazu, um den man sich streiten kann. Handel zwischen Spielern läuft über den Markt und verliert 20 %.

## Wissen und Entdeckungen

- Labor 1: 2 Arbeiter × 0,1 = 6 Wissen pro Umlauf. Labor 2: 3 × 0,15 = 13,5.
- Jede neue Stufe gibt 15 × Stufe Wissen und bietet 3 neue Entdeckungen an.
- Die n-te gekaufte Entdeckung kostet 30 × 1,35ⁿ: 30, 41, 55, 74, 100, 135, 182, 245, 331, 447, 603, 814 …
- Im gemeinsamen Modus kommen bis Stufe 10 etwa 5300 Wissen zusammen, das reicht für **13 der 24 Entdeckungen**. Gegeneinander sind es bis zum Sieg etwa 10. Jede Partie sieht also anders aus.

Entdeckungen sind Abkürzungen und Seitenwege, nie Pflicht. Ihre Wirkung ist als generischer Modifikator beschrieben (`{ stat, mul | add, scope }`), damit die Simulation nur einen Mechanismus braucht. Völker-Fähigkeiten nutzen dasselbe Format. Ein `battleRoll` mit `scope.building` gilt pro Gebäude dieser Art.

## Völker

Jedes Volk bekommt +30 % auf seinem Lieblingsbiom und +25 % auf seine Lieblingsressource, dazu eine Fähigkeit, die etwa +15 % Wirtschaft wert ist. Fähigkeiten ändern, *wie* man spielt (Raketen, Handel, Kampf, Verschmutzung), nicht wie schnell. Dammbiber und Stachelvolk sind die einfachsten zum Lernen, passend zu P0 in der Asset-Liste.

## Energie und Verschmutzung

Bei Energiemangel laufen alle Verbraucher mit Angebot ÷ Nachfrage, aber nie unter 25 %. Ein kleines Defizit ist also eine kleine Strafe und blockiert nichts. Verschmutzung baut sich mit 0,3 % des aktuellen Werts pro Sekunde ab und pendelt sich so bei Ausstoß ÷ 0,003 ein. Über 30 wächst nichts mehr nach, über 60 gibt es 25 % weniger Nahrung, über 85 keinen Nachwuchs. Ein Kohlekraftwerk allein landet bei 20, mit einer Gießerei, die Stahl kocht, bei etwa 37 und damit über der ersten Schwelle. Ein Luftfilter (−0,12) holt das fast auf 0 zurück.

## Kampf und Monster

Einwohner hinschicken, jeder würfelt 1W6, dazu kommt die Verteidigung (Wachturm +2, Völker, Entdeckungen). Summe ≥ Stärke gewinnt, jede gewürfelte 1 kostet einen Einwohner. Monster erscheinen ab Stufe 3, 5 und 7 mit Stärke 12, 20 und 30, frühestens nach 20 Umläufen und nie direkt nacheinander. Im friedlichen Modus gibt es keine Ultimaten und keinen KI-Krieg.

## Raumfahrt

Treibstoff pro Flug = ⌈Entfernung × (2 + 1,5 × Passagiere)⌉ Öl bei der kleinen Rakete (3 Plätze). Das belohnt wie im Original, wenige Einwohner pro Flug zu schicken. Die große Rakete fliegt mit Uran viel weiter. Eine Rakete wird beim Landen verbraucht und gibt etwas Stahl und Plastik für die neue Kolonie.

## Was zuerst im Playtest prüfen

1. Ob Stufe 1 bis 3 sich flott genug anfühlt (Ziel gemeinsam: erste Mine nach 3 Minuten, Gießerei nach 15). Falls zu zäh, zuerst `birthBase` senken.
2. Ob die Nahrung mit 3 pro Einwohner zu streng ist. Falls ja, zuerst `foodPerInhabitantPerCycle` auf 2,5 senken.
3. Ob der Sprung ins All ab Stufe 6 genug Zug hat, oder ob Ätherit schon früher lockt.
4. Ob sich Arbeitermangel gut anfühlt oder nur frustriert. Stellschraube ist `birthPerCitizen`.
