# Balancing

Alle Zahlen stehen in `src/data/balance/` als reine TypeScript-Module (kein DOM, läuft auch in der Supabase Edge Function). Der Einstieg ist `BALANCE` aus `src/data/balance/index.ts`. Wer Werte ändert, lässt danach `npm test` laufen: `balance.test.ts` prüft Verweise, Freischaltreihenfolge und das Pacing.

Die Zahlen sind ein **erster Wurf aus Rechnung, nicht aus Playtests**. Sie sind so gewählt, dass die Kette in sich stimmt und eine Partie ungefähr 75 Minuten dauert. Nach den ersten Testrunden werden sie sich verschieben, und genau dafür sind sie an einer Stelle gesammelt.

## Dateien

| Datei | Inhalt |
|---|---|
| `resources.ts` | Ressourcen (Lagergrenze, Wert), Biome mit Vorkommen, Planetentypen |
| `buildings.ts` | Gebäude mit Stufen, Kosten, Arbeitern, Erträgen, Energie, Verschmutzung, Nachbar-Boni; Gießerei-Rezepte |
| `peoples.ts` | 12 Völker mit Lieblingsbiom, Lieblingsressource, Startbonus und Fähigkeit |
| `discoveries.ts` | 24 Entdeckungen als Modifikatoren, Kostenformel |
| `progression.ts` | Grundregeln, Aufstieg, Energie, Verschmutzung, Monster, Kampf, Raumfahrt, Diplomatie, Koop-Skalierung, Pacing-Ziele |
| `pacing.ts` | Überschlagsrechnung, die die Tabellen gegen die Pacing-Ziele prüft |
| `types.ts` | Schema |

## Einheiten

Wie im Prototyp: 10 Ticks pro Sekunde, ein Planetenumlauf (Zyklus) dauert 30 Sekunden. Erträge sind **pro Arbeiter und Sekunde**. Energie ist kein Vorrat, sondern eine laufende Bilanz pro Planet. Verschmutzung ist ein Planetenwert von 0 bis 100.

IDs folgen der Asset-Liste aus dem Codex-Prompt: Biome `forest`, `savanna`, `mountains`, `ocean`, `swamp`, `desert`, `tundra`, `crystal`; Gebäude `housing`, `pump` usw.; Sprite-ID `building.<id>.t<n>` (Helfer `buildingSprite()`). Der Prototyp nutzt noch `meadow`, `mountain`, `sea`, `hut`, `well`. Zuordnung beim Umstellen: meadow → savanna, mountain → mountains, sea → ocean, hut → housing, well → pump.

## Grundgedanke

**Wenig Platz, viele Abwägungen.** 24 Felder auf dem Heimatplaneten, ein Gebäude pro Feld. Jede Stufe ersetzt die vorige (die Werte addieren sich nicht), damit Aufrüsten den Platz besser nutzt statt nur mehr zu kosten.

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

Der Test `homeAvailability` rechnet nach, dass jede Gebäudekosten auf dem Heimatplaneten bis zur Freischaltstufe herstellbar sind. Dafür hat der Heimatplanet immer mindestens ein Feld Wald, Savanne, Gebirge, Meer, Sumpf und Wüste (`RULES.homeGuaranteedBiomes`, muss der Generator einhalten). **Ätherit und Uran gibt es nur auf anderen Planeten.** Computer, Monument, große Rakete und Atomkraft ziehen den Spieler deshalb ab Stufe 7 bis 8 in den Weltraum. Ausnahme sind die Echoflatterer, die Ätherit von Anfang an abbauen können.

## Pacing

Aufstiegspunkte pro Umlauf = Einwohnerzahl (wie im Prototyp, plus Monument). Schwellen wie im Prototyp: 15, 50, 120, 250, 450, 750, 1200, 1800, 2600, 3600. Mit der erwarteten Bevölkerungskurve aus `PACING.expectedPopulation` ergibt das:

| Stufe | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 |
|---|---|---|---|---|---|---|---|---|---|---|
| Einwohner | 4 | 6 | 9 | 12 | 16 | 20 | 25 | 30 | 35 | 40 |
| Minute (allein) | 2 | 6 | 10 | 17 | 24 | 32 | 42 | 53 | 65 | 79 |

Eine Partie dauert damit gut eine Stunde bis zur Höchststufe, passend zu den 1 bis 2 Stunden des Originals. Der Test erlaubt ±20 % pro Stufe.

## Wissen und Entdeckungen

- Labor 1: 2 Arbeiter × 0,1 = 6 Wissen pro Umlauf. Labor 2: 3 × 0,15 = 13,5.
- Jede neue Stufe gibt 15 × Stufe Wissen und bietet 3 neue Entdeckungen an.
- Die n-te gekaufte Entdeckung kostet 30 × 1,35ⁿ: 30, 41, 55, 74, 100, 135, 182, 245, 331, 447, 603, 814 …
- In einer ganzen Partie kommen so etwa 3300 Wissen zusammen, das reicht für **12 der 24 Entdeckungen**. Jede Partie sieht also anders aus.

Entdeckungen sind Abkürzungen und Seitenwege, nie Pflicht. Ihre Wirkung ist als generischer Modifikator beschrieben (`{ stat, mul | add, scope }`), damit die Simulation nur einen Mechanismus braucht. Völker-Fähigkeiten nutzen dasselbe Format. Ein `battleRoll` mit `scope.building` gilt pro Gebäude dieser Art.

## Völker

Jedes Volk bekommt +30 % auf seinem Lieblingsbiom und +25 % auf seine Lieblingsressource, dazu eine Fähigkeit, die etwa +15 % Wirtschaft wert ist. Fähigkeiten ändern, *wie* man spielt (Raketen, Handel, Kampf, Verschmutzung), nicht wie schnell. Dammbiber und Stachelvolk sind die einfachsten zum Lernen, passend zu P0 in der Asset-Liste.

## Energie und Verschmutzung

Bei Energiemangel laufen alle Verbraucher mit Angebot ÷ Nachfrage, aber nie unter 25 %. Ein kleines Defizit ist also eine kleine Strafe und blockiert nichts. Verschmutzung baut sich mit 0,3 % des aktuellen Werts pro Sekunde ab und pendelt sich so bei Ausstoß ÷ 0,003 ein. Über 30 wächst nichts mehr nach, über 60 gibt es 25 % weniger Nahrung, über 85 keinen Nachwuchs. Ein Kohlekraftwerk allein landet bei 20, mit einer Gießerei, die Stahl kocht, bei etwa 37 und damit über der ersten Schwelle. Ein Luftfilter (−0,12) holt das fast auf 0 zurück.

## Kampf und Monster

Einwohner hinschicken, jeder würfelt 1W6, dazu kommt die Verteidigung (Wachturm +2, Völker, Entdeckungen). Summe ≥ Stärke gewinnt, jede gewürfelte 1 kostet einen Einwohner. Monster erscheinen ab Stufe 3, 5 und 7 mit Stärke 12, 20 und 30, frühestens nach 20 Umläufen und nie direkt nacheinander. Im friedlichen Modus gibt es keine Ultimaten und keinen KI-Krieg.

## Raumfahrt

Treibstoff pro Flug = ⌈Entfernung × (2 + 1,5 × Passagiere)⌉ Öl bei der kleinen Rakete (3 Plätze). Das belohnt wie im Original, wenige Einwohner pro Flug zu schicken. Die große Rakete fliegt mit Uran viel weiter. Eine Rakete wird beim Landen verbraucht und gibt etwas Stahl und Plastik für die neue Kolonie.

## Koop

Annahme, bis der Koop-Design-Thread etwas anderes entscheidet: **Aufstieg und Wissen sind ein gemeinsamer Team-Topf**, jeder Spieler hat eigene Einwohner und eigenes Startkapital, Entdeckungen gelten für alle, Völker-Fähigkeiten nur für die eigenen Einwohner.

Weil mehr Spieler mehr Einwohner und mehr Labore haben, wachsen die Kosten mit, aber langsamer als linear. Zusammen geht es also etwas schneller, ohne trivial zu werden:

| Spieler | 1 | 2 | 3 | 4 |
|---|---|---|---|---|
| Aufstiegsschwellen × | 1 | 1,7 | 2,4 | 3,1 |
| Entdeckungskosten × | 1 | 1,6 | 2,2 | 2,8 |
| Monsterstärke × | 1 | 1,5 | 2 | 2,5 |
| Extra KI-Völker / Planeten | 0 / 0 | 0 / 1 | 1 / 2 | 1 / 3 |
| Stufe 10 nach (Minuten) | 79 | 67 | 63 | 61 |
| Entdeckungen pro Partie | 12 | 12 | 12 | 11 |

Wenn sich das Koop-Design für getrennte Aufstiegsstufen pro Spieler entscheidet, werden die Multiplikatoren einfach alle 1.

## Was zuerst im Playtest prüfen

1. Ob Stufe 1 bis 3 sich flott genug anfühlt (Ziel: erste Mine nach 2 Minuten, Gießerei nach 10).
2. Ob die Nahrung mit 3 pro Einwohner zu streng ist. Falls ja, zuerst `foodPerInhabitantPerCycle` auf 2,5 senken.
3. Ob der Sprung ins All ab Stufe 6 genug Zug hat, oder ob Ätherit schon früher lockt.
