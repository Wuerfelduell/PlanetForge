# Balancing

Alle Zahlen stehen in `src/data/balance/` als reine TypeScript-Module (kein DOM, läuft auch in der Supabase Edge Function). Der Einstieg ist `BALANCE` aus `src/data/balance/index.ts`. Wer Werte ändert, lässt danach `npm test` laufen: `balance.test.ts` prüft Verweise, Freischaltreihenfolge und das Pacing.

Abgestimmt mit dem Koop-Design (`/mnt/project-files/design/koop-design.md`, v3).

Die Zahlen sind ein **erster Wurf aus Rechnung, nicht aus Playtests**. Sie sind so gewählt, dass die Kette in sich stimmt, der gemeinsame Modus auf lange Partien (Stufe 10 nach etwa 3 Stunden) und der Gegeneinander-Modus auf kurze Runden (meist nach 35 bis 50 Minuten entschieden) ausgelegt ist. Nach den ersten Testrunden werden sie sich verschieben, und genau dafür sind sie an einer Stelle gesammelt.

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

10 Ticks pro Sekunde wie im Prototyp. Ein Planetenumlauf (Zyklus) dauert im gemeinsamen Modus 60 Sekunden wie im Original und gegeneinander 20 Sekunden. Damit die Wirtschaft in beiden Modi gleich rechnet, sind Erträge **pro Arbeiter und Sekunde** angegeben, Nahrung und Aufstiegspunkte pro Minute. Zählwerte wie „Ruine hält 2 Umläufe“ sind absichtlich in Umläufen. Der Gastgeber wählt beim Erstellen ein Tempo (`TEMPO`: Gemütlich 0,75×, Normal, Schnell 1,5× auf die ganze Spieluhr) und eine Schwierigkeit (`DIFFICULTY`: KI-Aggression, Ultimaten, Monsterstärke; Gemütlich entspricht dem friedlichen Modus). Die Uhr läuft nur bei offener Lobby, eine offene Lobby ohne Spieler schließt nach 10 Minuten. Energie ist kein Vorrat, sondern eine laufende Bilanz pro Planet. Verschmutzung ist ein Planetenwert von 0 bis 100.

IDs folgen der Asset-Liste aus dem Codex-Prompt: Biome `forest`, `savanna`, `mountains`, `ocean`, `swamp`, `desert`, `tundra`, `crystal`; Gebäude `housing`, `pump` usw.; Sprite-ID `building.<id>.t<n>` (Helfer `buildingSprite()`). Der Prototyp nutzt noch `meadow`, `mountain`, `sea`, `hut`, `well`. Zuordnung beim Umstellen: meadow → savanna, mountain → mountains, sea → ocean, hut → housing, well → pump.

## Grundgedanke

**Arbeitermangel statt Platzmangel** (Sebs Entscheidung vom 20.10.2026). Der gemeinsame Startplanet hat 32 Felder (gegeneinander hat jeder 24), zu Beginn sind 7 sichtbar, und es gibt immer mehr Arbeitsplätze als Einwohner: Ein voll ausgebauter Planet bietet etwa 1,45 Jobs pro Einwohner (Test `jobsPerCitizen`). Höhere Gebäudestufen bringen vor allem mehr Arbeitsplätze. Die eigentliche Frage ist also nicht „wo baue ich“, sondern „wen setze ich wohin“.

**Nachwuchs wird mit der Größe langsamer.** Sekunden pro Geburt = Grundwert + Wert pro Einwohner × Einwohner auf dem Planeten (gemeinsam 30 + 6 × n, gegeneinander 12 + 3 × n). Bei 10 Einwohnern dauert eine Geburt im gemeinsamen Modus 90 Sekunden, bei 40 schon 4,5 Minuten. Dazu isst jeder Einwohner 1 % mehr pro Einwohner auf dem Planeten, das ergibt eine weiche Obergrenze pro Planet. Deshalb ist jeder neue Planet mit eigenem Nachwuchs viel wert, und Entdeckungen wie Medizin sind echte Hebel. Automatisierung lässt in jedem Produktionsgebäude einen Automaten statt eines Einwohners arbeiten, für 2 Energie pro Automat. Eine Geburt kostet 15 Beeren.

Jede Gebäudestufe ersetzt die vorige, die Werte addieren sich nicht.

**Nahrung ist ein echter Posten.** 6 Beeren pro Einwohner und Minute (also 3 pro 30 Sekunden, der Prototyp hatte 2), sanft steigend mit der Bevölkerung. Ein Sammler von Hand ernährt 3 Einwohner, eine volle Farm 7 bis 10. Damit stecken grob 25 bis 30 % der Leute in Nahrung, und Farmen neben Savanne lohnen sich.

**Rohstoffe wachsen nach, wenn man sie lässt.** 1 % pro Sekunde auf unberührten Feldern, leer bleibt leer. Das erzwingt Rotation zwischen Feldern und macht Minen und Farmen attraktiv.

**Ressourcenwert.** Jede Ressource hat einen `value` in Arbeiter-Sekunden. Er wird für Handel, Ultimaten und den Test „Veredeln lohnt sich immer“ genutzt (Holzkohle und Biogas sind absichtlich verlustreiche Notlösungen).

## Freischaltungen pro Aufstiegsstufe

Jede Stufe bringt etwas Neues, und alles auf dem Hauptpfad kommt allein über die Stufe, nicht über Glück bei den Entdeckungen.

| Stufe | Neu |
|---|---|
| 0 | Wohnhaus, Farm |
| 1 | Mine, Pumpe (auch Öl, damit Raketen früh fliegen können) |
| 2 | Labor, Wohnhaus 2, Lager, Startrampe, Späherrakete (gegeneinander: Sabotage) |
| 3 | Gießerei (Holzkohle, Glas, Beton), Markt, Kampfrakete (gegeneinander) |
| 4 | Stahl, Farm 2 (Gewächshaus), Windrad, Kohlekraftwerk, Wachturm |
| 5 | Wohnhaus 3, Labor 2, Mine 2, Pumpe 2, Luftfilter (mit Ökologie), Biogas |
| 6 | Gießerei 2, Plastik, Hydrofarm, Lager 2, Transportrakete |
| 7 | Elektronik, Solarfeld |
| 8 | Computer, Monument |
| 9 | Große Rakete, Atomkraftwerk (mit Kernkraft) |

Der Test `homeAvailability` rechnet nach, dass jede Gebäudekosten auf dem Heimatplaneten bis zur Freischaltstufe herstellbar sind. Dafür hat der Heimatplanet immer mindestens ein Feld Wald, Savanne, Gebirge, Meer, Sumpf und Wüste (`RULES.homeGuaranteedBiomes`, muss der Generator einhalten). **Ätherit und Uran liegen nicht in den Heimat-Biomen.** Sie kommen als seltene Vorkommen, die der Generator verteilt (`RARE_RESOURCES` in `src/sim/content.ts`), meist auf anderen Planeten, und werden erst mit Tiefbohrung bzw. Kristallkunde abbaubar. Computer, Monument, große Rakete und Atomkraft ziehen den Spieler deshalb ab Stufe 7 bis 8 in den Weltraum. Ausnahme sind die Echoflatterer, die Ätherit von Anfang an abbauen können.

## Spielmodi und Pacing

Zwei Modi, Solo ist der gemeinsame Modus mit einem Spieler (`MODES` in `progression.ts`):

| | Gemeinsam | Gegeneinander |
|---|---|---|
| Startplanet | ein gemeinsamer, jeder Spieler führt sein eigenes Volk | jeder seinen eigenen |
| Ressourcen, Aufstieg, Entdeckungen | geteilt | getrennt |
| Ende | kein Ende, kein Zyklus-Limit; der Host speichert die Lobby | wenn nur noch ein Volk übrig ist (die anderen ausgelöscht) |
| Abwesende Spieler | ihre Einwohner bleiben ihre, niemand übernimmt sie | – |
| Geburt (Sekunden) | 30 + 6 × Einwohner | 12 + 3 × Einwohner |
| Entdeckungskosten | 30 × 1,35ⁿ | halb so viel |

Aufstiegspunkte: 2 pro Einwohner und Minute (das entspricht 1 pro Einwohner und 30-Sekunden-Umlauf wie im Prototyp), dazu kommt das Monument. Die Schwellen hat `pacing.ts` aus dem Geburtenmodell abgeleitet. Die Annahme ist, dass Nahrung und Wohnraum mithalten, also ist das die schnellste realistische Kurve.

| Stufe | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 |
|---|---|---|---|---|---|---|---|---|---|---|
| Schwelle gemeinsam | 25 | 100 | 270 | 600 | 1150 | 2050 | 3300 | 5200 | 8300 | 12900 |
| Minute gemeinsam, allein | 3 | 8 | 15 | 25 | 38 | 55 | 75 | 100 | 135 | 180 |
| Einwohner dabei | 6 | 10 | 14 | 19 | 24 | 29 | 34 | 40 | 48 | 55 |
| Schwelle gegeneinander | 20 | 55 | 130 | 220 | 370 | 600 | 910 | 1210 | 1550 | 1900 |
| Minute gegeneinander | 2 | 4 | 7 | 10 | 14 | 19 | 25 | 30 | 35 | 40 |

Der Test erlaubt ±20 % pro Stufe.

**Mehr Spieler im gemeinsamen Modus** (Koop-Design 4.6). Aufstiegsschwellen, Entdeckungskosten und Monsterstärke wachsen mit Basis × (0,7 + 0,3·n), also × 1 / 1,3 / 1,6 / 1,9. Wer beitritt, bringt 3 Einwohner mit, dazu einen pro 2 Team-Stufen (`coopJoinCitizens`). Die Bevölkerungsgrenze pro Planet wächst nicht mit, ein größeres Team muss also früher Kolonien gründen. Das System hat 4 + 2·n Planeten und 1 + n KI-Völker, Ereignisse gibt es × n, höchstens eines pro Spieler gleichzeitig. Im Modell ist ein großes Team bis Stufe 6 etwas langsamer als allein und holt mit den Kolonien auf: Stufe 10 nach 180 / 165 / 162 / 163 Minuten bei 1 / 2 / 3 / 4 Spielern.

**Gegeneinander** skaliert nicht mit der Spielerzahl, jeder spielt seine eigene Wirtschaft. Das System ist kleiner als im Koop (3 / 4 / 6 / 7 Planeten bei 1 bis 4 Spielern). Handel zwischen Spielern läuft über den Markt und verliert 20 %.

**Angriffe (gegeneinander, `VERSUS_COMBAT`, Koop-Design 5.3).** Sabotage geht ab Stufe 2 (etwa Minute 4), echte Angriffe ab Stufe 3 (etwa Minute 7). Jeder Flug ist mit Ankunftszeit auf der Sternkarte zu sehen.
- *Sabotage:* Eine Späherrakete mit 1 bis 2 Einwohnern zerstört ein gewähltes Gebäude oder stiehlt 30 % einer Ressource, wenn der beste Wurf + Boni mindestens 5 + Anzahl Wachtürme erreicht. Sonst sterben die Saboteure.
- *Angriff:* Eine Kampfrakete trägt 4 Einwohner und kämpft gegen die unbeschäftigten und die als Verteidiger markierten Einwohner. Pro Runde würfeln beide Seiten 1W6 + Boni. Wer niedriger würfelt, verliert einen Einwohner, bei Gleichstand beide. Verteidiger bekommen +1 Heimvorteil plus Wachtürme.
- *Sieg:* Der Angreifer besetzt den Planeten, Gebäude und Lager gehören ihm. Arbeiter des Verteidigers werden Gefangene und zählen weiter für ihr Volk, bis sie sterben oder nach 10 Umläufen assimiliert sind (mit Diplomatie sofort).
- *Ende:* Ausgelöscht ist, wer keinen Einwohner mehr hat. Die Verbliebenen können sich auf ein Unentschieden einigen. Nach 300 Umläufen ohne Kampf bietet das Spiel eines an.

Jeder Angreifer fehlt als Arbeiter, und Nachwuchs ist langsam. Ein verlorener Angriff ist deshalb ein schwerer Rückschlag. Zu zweit sollte eine Partie nach 30 bis 60 Minuten entschieden sein.

## Wissen und Entdeckungen

- Labor 1: 2 Arbeiter × 0,1 = 12 Wissen pro Minute. Labor 2: 4 × 0,15 = 36 pro Minute.
- Jede neue Stufe gibt 15 × Stufe Wissen und bietet 3 neue Entdeckungen an.
- Die n-te gekaufte Entdeckung kostet 30 × 1,35ⁿ: 30, 41, 55, 74, 100, 135, 182, 245, 331, 447, 603, 814 …
- Im gemeinsamen Modus kommen bis Stufe 10 etwa 5300 Wissen zusammen, das reicht für **13 der 24 Entdeckungen**. Gegeneinander sind es bis Stufe 8 etwa 10. Jede Partie sieht also anders aus.

Entdeckungen sind Abkürzungen und Seitenwege, nie Pflicht. Ihre Wirkung ist als generischer Modifikator beschrieben (`{ stat, mul | add, scope }`), damit die Simulation nur einen Mechanismus braucht. Völker-Fähigkeiten nutzen dasselbe Format. Ein `battleRoll` mit `scope.building` gilt pro Gebäude dieser Art.

## Völker

Jedes Volk bekommt +30 % auf seinem Lieblingsbiom und +25 % auf seine Lieblingsressource, dazu eine Fähigkeit, die etwa +15 % Wirtschaft wert ist. Fähigkeiten ändern, *wie* man spielt (Raketen, Handel, Kampf, Verschmutzung), nicht wie schnell. Dammbiber und Stachelvolk sind die einfachsten zum Lernen, passend zu P0 in der Asset-Liste.

## Energie und Verschmutzung

Bei Energiemangel laufen alle Verbraucher mit Angebot ÷ Nachfrage, aber nie unter 25 %. Ein kleines Defizit ist also eine kleine Strafe und blockiert nichts. Verschmutzung baut sich mit 0,3 % des aktuellen Werts pro Sekunde ab und pendelt sich so bei Ausstoß ÷ 0,003 ein. Verschmutzung bremst den Nachwuchs (Koop-Design 2.5): über 30 dauert eine Geburt 25 % länger, über 60 dauert sie 60 % länger, über 85 gibt es keinen Nachwuchs mehr. Ein Kohlekraftwerk allein landet bei 20, mit einer Gießerei, die Stahl kocht, bei etwa 37 und damit über der ersten Schwelle. Ein Luftfilter (−0,12) holt das fast auf 0 zurück.

## Kampf und Monster

Einwohner hinschicken, jeder würfelt 1W6, dazu kommt die Verteidigung (Wachturm +2, Völker, Entdeckungen). Summe ≥ Stärke gewinnt, jede gewürfelte 1 kostet einen Einwohner. Monster erscheinen ab Stufe 3, 5 und 7 mit Stärke 12, 20 und 30, frühestens nach 20 Umläufen und nie direkt nacheinander. Im friedlichen Modus gibt es keine Ultimaten und keinen KI-Krieg.

## Raumfahrt

Treibstoff pro Flug = ⌈Entfernung × (2 + 1,5 × Passagiere)⌉ Öl bei der kleinen Rakete (3 Plätze). Das belohnt wie im Original, wenige Einwohner pro Flug zu schicken. Die große Rakete fliegt mit Uran viel weiter. Eine Rakete wird beim Landen verbraucht und gibt etwas Stahl und Plastik für die neue Kolonie.

## Was zuerst im Playtest prüfen

1. Ob Stufe 1 bis 3 sich flott genug anfühlt (Ziel gemeinsam: erste Mine nach 3 Minuten, Gießerei nach 15). Falls zu zäh, zuerst `birthBase` senken.
2. Ob die Nahrung mit 3 pro Einwohner zu streng ist. Falls ja, zuerst `foodPerInhabitantPerCycle` auf 2,5 senken.
3. Ob der Sprung ins All ab Stufe 6 genug Zug hat, oder ob Ätherit schon früher lockt.
4. Ob sich Arbeitermangel gut anfühlt oder nur frustriert. Stellschraube ist `birthPerCitizen`.
