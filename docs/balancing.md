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

IDs folgen der Asset-Liste aus dem Codex-Prompt: Biome `forest`, `savanna`, `mountains`, `ocean`, `swamp`, `desert`, `tundra`, `crystal`, `glacier`, `lava`, `ash` (siehe „Eis- und Lavafelder“); Gebäude `housing`, `pump` usw.; Sprite-ID `building.<id>.t<n>` (Helfer `buildingSprite()`). Der Prototyp nutzt noch `meadow`, `mountain`, `sea`, `hut`, `well`. Zuordnung beim Umstellen: meadow → savanna, mountain → mountains, sea → ocean, hut → housing, well → pump.

## Eis- und Lavafelder

Eis- und Lavaplaneten haben eigene Felder, damit sie sich anders spielen als die Heimat:

| Feld | Bauen | Vorkommen | Besonderheit | Terraforming |
| --- | --- | --- | --- | --- |
| Gletscher (`glacier`) | nein | Wasser 100 (Hand), Stein 20 (Hand) | Pumpen daneben gehen auch ohne Wasser im Feld, +30 % je Nachbar-Gletscher | Abtauen (30 Holz) → Tundra |
| Lavafeld (`lava`) | nur Mine, Gießerei, Wachturm, Abwehrbatterie | Stein 60 (Hand), Eisen 45, Gold 20 (Stufe 2) | Gießerei +30 % je Nachbar-Lava, Hütten −25 % je Nachbar-Lava (Hitze) | Abkühlen (30 Wasser) → Aschefeld |
| Aschefeld (`ash`) | ja | Sand 50 (Hand), Stein 30 (Hand), Kohle 25 | Fruchtbar: Farm darf drauf, +15 % je Nachbar-Asche | Bäume pflanzen (5 Nahrung) → Wald |

Ein Lavaplanet wird so Schritt für Schritt bewohnbar: Lava abkühlen, auf der Asche Wald pflanzen. Eisplaneten liefern viel Wasser, aber wenig Bauplatz, bis man die Gletscher abtaut. Die Heimat bleibt gemäßigt, die neuen Felder kommen nur auf Eis-, Lava- und (selten Asche) Trockenplaneten vor. Seltenes Uran kann auch auf Lava liegen, seltene Kohle auf Asche.

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
| 1 | Mine (auch Kupfer), Pumpe (auch Öl), Sägewerk (Bretter), Förster |
| 2 | Werkstatt (Werkzeug, Kupferdraht, Stoff), Raffinerie (Treibstoff), Labor, Wohnhaus 2, Lager, Startrampe, Späherrakete (gegeneinander: Sabotage) |
| 3 | Gießerei (Holzkohle, Ziegel, Glas, Beton), Markt, Kampfrakete (gegeneinander) |
| 4 | Siedlerrakete (erste Kolonie), Stahl, Sägewerk 2, Farm 2 (Gewächshaus), Windrad, Kohlekraftwerk, Wachturm |
| 5 | Wohnhaus 3, Labor 2, Werkstatt 2, Mine 2 (auch Gold), Pumpe 2, Luftfilter (mit Ökologie), Biogas |
| 6 | Gießerei 2, Raffinerie 2, Plastik, Hydrofarm, Lager 2, Transportrakete |
| 7 | Elektronik, Solarfeld |
| 8 | Computer, Monument |
| 9 | Große Rakete, Atomkraftwerk (mit Kernkraft) |

Der Test `homeAvailability` rechnet nach, dass jede Gebäudekosten auf dem Heimatplaneten bis zur Freischaltstufe herstellbar sind. Dafür hat der Heimatplanet immer mindestens ein Feld Wald, Savanne, Gebirge, Meer, Sumpf und Wüste (`RULES.homeGuaranteedBiomes`, muss der Generator einhalten). **Ätherit und Uran liegen nicht in den Heimat-Biomen.** Sie kommen als seltene Vorkommen, die der Generator verteilt (`RARE_RESOURCES` in `src/sim/content.ts`), meist auf anderen Planeten, und werden erst mit Tiefbohrung bzw. Kristallkunde abbaubar. Computer, Monument, große Rakete und Atomkraft ziehen den Spieler deshalb ab Stufe 7 bis 8 in den Weltraum. Ausnahme sind die Echoflatterer, die Ätherit von Anfang an abbauen können.

## Tüfteln: Ketten, Nachbarn und Werkzeug

Nach Sebs Playtest (21.10.2026) sollen die Gebäude kniffliger werden, damit man mehr tüftelt. Der Kern bleibt der Arbeitermangel. Dazu kommen vier Stellschrauben:

**Neue Rohstoffe und Zwischenprodukte.** Kupfer (Gebirge, Wüste), Gold (tief im Gebirge, erst mit Mine 2) und Fasern (Savanne, Sumpf, von Hand) sind neu. Daraus entstehen Zwischenprodukte, die spätere Gebäude brauchen:

| Ware | Rezept | Wo | Ab Stufe | Gebraucht für |
|---|---|---|---|---|
| Bretter | 2 Holz | Sägewerk | 1 | Wohnhaus 2, Labor, Lager, Werkstatt, Wachturm, Windrad, Markt |
| Werkzeug | 1 Eisen + 1 Brett → 2 | Werkstatt | 2 | Verschleiß in Minen und Sägewerken, Mine 2 |
| Kupferdraht | 1 Kupfer | Werkstatt | 2 | Windrad, Kohlekraftwerk, Labor 2, Elektronik |
| Stoff | 3 Fasern | Werkstatt | 2 | Markt, Wohnhaus 3, Transportrakete (Fallschirm) |
| Treibstoff | 2 Öl | Raffinerie | 2 | jeder Raketenflug |
| Ziegel | 2 Lehm + 1 Kohle → 2 | Gießerei | 3 | Wohnhaus 3, Kohlekraftwerk, Sägewerk 2, Werkstatt 2 |

Elektronik braucht jetzt Kupferdraht statt Stahl, Computer Gold statt Ätherit. Damit gehen Computer auch auf dem Heimatplaneten. Ätherit bleibt für Monument und große Rakete das Ziel im All.

**Nachbarn helfen oder stören.** Jeder Nachbar kann Boni und Mali geben, die sich addieren (nie unter 0):
- Laut sind Mine, Gießerei und Kohlekraftwerk. Sie kosten Wohnhäusern und Laboren je 25 %. Wald neben dem Wohnhaus gibt +10 %.
- Bei der Farm bringt Savanne +25 % und eine Pumpe als Bewässerung +20 %. Eine Mine kostet sie durch Staub 25 %, ein Kohlekraftwerk 20 %.
- Ein Windrad neben einem Windrad verliert 40 % (Windschatten), Gebirge bringt +25 %. Solar verliert 30 % neben Kohle (Smog).
- Das Sägewerk bekommt +30 % je Wald, die Werkstatt +15 % je Sägewerk oder Mine, die Pumpe +50 % je Meer.

Ein Planet ist ein Ring, jedes Feld hat also genau zwei Nachbarn. Industrie und Wohnen wollen deshalb in getrennte Viertel, und Farmen wollen Pumpen, aber keine Minen nebeneinander.

**Bauregeln.** Das Sägewerk muss neben einem Wald stehen. Mine und Pumpe gehen nur auf ein Feld mit passendem Vorkommen, die Pumpe alternativ neben ein Meer. Der Förster lässt benachbarte Wälder dreimal so schnell nachwachsen und bepflanzt abgeholzte Nachbarfelder neu, das passt zum Bäumepflanzen des Visuals-Threads.

**Werkzeug nutzt sich ab.** Ab Stufe 2 verbraucht jeder Arbeiter in Mine und Sägewerk 0,1 Werkzeug pro Minute. Ohne Werkzeug im Lager arbeiten sie nur mit 60 %. Eine Werkstatt mit 2 Arbeitern macht 12 Werkzeug pro Minute und versorgt damit etwa 120 Arbeiter. Sie läuft also nebenher, aber man muss an sie denken.

Bäume pflanzen und Meer mit Sand oder Lehm (als Erde) auffüllen baut der Thread „Ressourcen-Anzeige und Visuals“ als Befehl `terraform`, mit eigenen Kosten in `src/sim/content.ts`.

## Baumenü und neue Gebäude

Das Baumenü hat Reiter: Wohnraum, Nahrung, Rohstoffe, Produktion, Forschung, Energie, Verteidigung, Raumfahrt (dazu Gelände für Bäume pflanzen und Aufschütten). Ein grüner Punkt zeigt, wo gerade etwas baubar ist.

| Reiter | Gebäude (ab Stufe) |
|---|---|
| Wohnraum | Hütte 0 → Holzhaus 2 → Steinhaus 5 → Wohnturm 7 (12 Plätze, Strom), Park 2 (+20 % Platz für Nachbar-Hütten), Monument 8 (+10 Aufstiegspunkte je Umlauf, eins pro Planet) |
| Nahrung | Farm 0, Fischerei 1 (neben Meer, Stufe 2 Fischereihafen ab 3), Gewächshaus 4 (Wasser → Nahrung auf jedem Boden, Strom) |
| Rohstoffe | Förster 1, Mine 1, Pumpe 1 |
| Produktion | Sägewerk 1, Werkstatt 2, Gießerei 3 (jetzt auch Stahl und Beton, Stufe 2 Stahlwerk ab 5), Glashütte 3 (Sand + Kohle → Glas), Biogasanlage 4 (3 Nahrung + 1 Wasser → Biogas), Kunststoffwerk 5 (2 Öl → Plastik), Elektronikwerk 6 (2 Draht + Plastik + Glas → Elektronik, Strom; Stufe 2 Chipfabrik ab 8: 2 Elektronik + Glas + Gold → Computer) |
| Forschung | Labor 2, Bibliothek 3 (+20 % für Nachbar-Labore und -Sternwarten), Sternwarte 4 (0,3 Wissen je Arbeiter, Strom), Rechenzentrum 8 (0,6 Wissen je Arbeiter, kostet Computer, 3 Strom) |
| Energie | Windrad 3, Kohlekraftwerk 4, Gaskraftwerk 5 (+5, 0,08 Biogas/s, kein Lärm), Solarfeld 6, Atomkraftwerk 8 |
| Verteidigung | Wachturm 2 (Stufe 2 Festungsturm ab 5, +2), Abwehrbatterie 5 |
| Raumfahrt | Startrampe 2, Raffinerie 2 |

Markt (Produktion, ab 3, einer pro Planet): solange jemand am Stand arbeitet, tauscht ein Händler jede Ware (außer Wissen) gegen jede andere. Preis = Menge × Wert der gewünschten Ware × 1,5 ÷ Wert der gegebenen Ware, aufgerundet; Werte wie in src/data/balance/resources.ts (`MARKET` in content.ts).

## Spielmodi und Pacing

**Playtest 21.10.2026.** Die Simulation lief mit eigenen, viel schnelleren Zahlen (Geburt 12 s flach, 2 Nahrung pro Umlauf, Schwellen 15 bis 3600). Ein Spieler, der nur Hütten und Farmen baut, war nach 37 Minuten auf Stufe 10, schneller als einer mit der ganzen Produktionskette. Jetzt liest `src/sim` Geburten, Nahrung, Schwellen und Startvorrat direkt aus `src/data/balance`, damit die beiden nicht wieder auseinanderlaufen. Dazu kommen drei Änderungen:

- Ausgebaute Gebäude bringen Aufstiegspunkte (siehe unten), damit die Kette zählt.
- Nahrung über 120 + 10 je Einwohner verdirbt am Ende des Umlaufs (`RULES.foodStock`), statt sich fünfstellig zu stapeln.
- Der Start hat 25 statt 15 Holz, damit die erste Hütte sofort geht.

Der Test `src/sim/pacing.test.ts` lässt einen Hütten-Bot 60 Minuten spielen. Er darf nach 40 Minuten höchstens Stufe 5 und nach 60 Minuten höchstens Stufe 6 haben, muss aber mindestens Stufe 4 erreichen. Vorher lag er nach 40 Minuten bei Stufe 8, jetzt bei 4 bis 5.

Zwei Modi, Solo ist der gemeinsame Modus mit einem Spieler (`MODES` in `progression.ts`):

| | Gemeinsam | Gegeneinander |
|---|---|---|
| Startplanet | ein gemeinsamer, jeder Spieler führt sein eigenes Volk | jeder seinen eigenen |
| Ressourcen, Aufstieg, Entdeckungen | geteilt | getrennt |
| Ende | kein Ende, kein Zyklus-Limit; der Host speichert die Lobby | wenn nur noch ein Volk übrig ist (die anderen ausgelöscht) |
| Abwesende Spieler | ihre Einwohner bleiben ihre, niemand übernimmt sie | – |
| Geburt (Sekunden) | 30 + 6 × Einwohner | 12 + 3 × Einwohner |
| Entdeckungskosten | 30 × 1,35ⁿ | halb so viel |

Aufstiegspunkte: 2 pro Einwohner und Minute (das entspricht 1 pro Einwohner und 30-Sekunden-Umlauf wie im Prototyp), dazu 2 pro Minute für jede Ausbaustufe über der ersten (Wohnhaus 3 zählt also 2) und das Monument. Die Schwellen hat `pacing.ts` aus dem Geburtenmodell abgeleitet. Die Annahme ist, dass Nahrung und Wohnraum mithalten, also ist das die schnellste realistische Kurve.

| Stufe | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 |
|---|---|---|---|---|---|---|---|---|---|---|
| Schwelle gemeinsam | 25 | 100 | 270 | 600 | 1150 | 2050 | 3300 | 5200 | 8300 | 12900 |
| Minute gemeinsam, allein | 3 | 8 | 15 | 25 | 38 | 55 | 75 | 100 | 135 | 180 |
| Einwohner dabei | 6 | 10 | 14 | 19 | 24 | 29 | 34 | 40 | 48 | 55 |
| Schwelle gegeneinander | 20 | 55 | 130 | 220 | 370 | 600 | 910 | 1210 | 1550 | 1900 |
| Minute gegeneinander | 2 | 4 | 7 | 10 | 14 | 19 | 25 | 30 | 35 | 40 |

Der Test erlaubt ±20 % pro Stufe.

**Mehr Spieler im gemeinsamen Modus** (Koop-Design 4.6). Aufstiegsschwellen, Entdeckungskosten und Monsterstärke wachsen mit Basis × (0,7 + 0,3·n), also × 1 / 1,3 / 1,6 / 1,9. Wer beitritt, bringt 3 Einwohner mit, dazu einen pro 2 Team-Stufen (`coopJoinCitizens`). Die Bevölkerungsgrenze pro Planet wächst nicht mit, ein größeres Team muss also früher Kolonien gründen. Das System hat 4 + 2·n Planeten und 1 + n KI-Völker, Ereignisse gibt es × n, höchstens eines pro Spieler gleichzeitig. Im Modell ist ein großes Team bis Stufe 6 etwas langsamer als allein und holt mit den Kolonien auf: Stufe 10 nach 180 / 165 / 162 / 163 Minuten bei 1 / 2 / 3 / 4 Spielern.

**Gegeneinander** skaliert nicht mit der Spielerzahl, jeder spielt seine eigene Wirtschaft. Das System ist kleiner als im Koop: 1 + 2·n Planeten (zu zweit 5) und n KI-Völker. Die Startplaneten sind gespiegelt (gleiche Biome, Vorkommen und Abstände). Nach dem Start kann niemand mehr beitreten, wer die Verbindung verliert, kann aber jederzeit zurück. Handel zwischen Spielern läuft über den Markt und verliert 20 %.

**Angriffe (gegeneinander, `VERSUS_COMBAT`, Koop-Design 5.3).** Sabotage geht ab Stufe 2 (etwa Minute 4), echte Angriffe ab Stufe 3 (etwa Minute 7), mit der Entdeckung Raketentechnik schon ab Stufe 2. Raketentechnik zählt auch als Waffen (+1 Angriff), Befestigung als Schilde. Jeder Flug ist mit Ankunftszeit auf der Sternkarte zu sehen.
- *Sabotage:* Eine Späherrakete mit 1 bis 2 Einwohnern zerstört ein gewähltes Gebäude oder stiehlt 30 % einer Ressource, wenn der beste Wurf + Boni mindestens 5 + Anzahl Wachtürme erreicht. Sonst sterben die Saboteure.
- *Angriff:* Eine Kampfrakete trägt 4 Einwohner und kämpft gegen die unbeschäftigten und die als Verteidiger markierten Einwohner. Pro Runde würfeln beide Seiten 1W6 + Boni. Wer niedriger würfelt, verliert einen Einwohner, bei Gleichstand beide. Verteidiger bekommen +1 Heimvorteil plus Wachtürme. Der Angreifer kann sich zurückziehen, wenn er Öl für den Rückflug mitgenommen hat. Einwohner im Flug und KI-Planeten sind nach dieser Regel nicht angreifbar.
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

Im Spiel (src/sim/content.ts) gibt es bisher den Strom, noch keine Verschmutzung. Jeder Planet hat sein eigenes Netz. Windrad (+2, ab Stufe 3, Windschatten −40 % je Nachbar-Windrad), Kohlekraftwerk (+6 mit 1 Arbeiter, 0,1 Kohle/s, ab 4), Solarfeld (+3, ab 6) und Atomkraftwerk (+15 mit 2 Arbeitern, 0,02 Uran/s, ab 8) liefern. Strom brauchen nur neue Dinge: Wohnturm (Hütte Stufe 4), Gewächshaus, Sternwarte und Stahlwerk (Gießerei Stufe 2), je 1. Die älteren Stufe-2-Gebäude laufen ohne Strom weiter, damit laufende Spiele nicht plötzlich langsamer werden.

Bei Energiemangel laufen alle Verbraucher mit Angebot ÷ Nachfrage, aber nie unter 25 %. Ein kleines Defizit ist also eine kleine Strafe und blockiert nichts. Verschmutzung baut sich mit 0,3 % des aktuellen Werts pro Sekunde ab und pendelt sich so bei Ausstoß ÷ 0,003 ein. Verschmutzung bremst den Nachwuchs (Koop-Design 2.5): über 30 dauert eine Geburt 25 % länger, über 60 dauert sie 60 % länger, über 85 gibt es keinen Nachwuchs mehr. Ein Kohlekraftwerk allein landet bei 20, mit einer Gießerei, die Stahl kocht, bei etwa 37 und damit über der ersten Schwelle. Ein Luftfilter (−0,12) holt das fast auf 0 zurück.

## Kampf und Monster

Einwohner hinschicken, jeder würfelt 1W6, dazu kommt die Verteidigung (Wachturm +2, Völker, Entdeckungen). Summe ≥ Stärke gewinnt, jede gewürfelte 1 kostet einen Einwohner. Monster erscheinen ab Stufe 3, 5 und 7 mit Stärke 12, 20 und 30, frühestens nach 20 Umläufen und nie direkt nacheinander. Im friedlichen Modus gibt es keine Ultimaten und keinen KI-Krieg.

## Raumfahrt

Nach Sebs Playtest (21.10.2026) war Fliegen zu leicht, man war zu schnell durch. Deshalb gilt jetzt:

- **Raketen fliegen mit Treibstoff, nicht mit Holz.** Treibstoff macht die Raffinerie (ab Stufe 2) aus 2 Öl. Öl kommt aus der Pumpe auf einem Öl-Vorkommen (Sumpf, Wüste). Die Raffinerie bekommt +25 % je Nachbar-Pumpe, stinkt aber wie die lauten Gebäude (−25 % für Wohnhaus und Labor daneben) und verbraucht Werkzeug.
- **Jeder Start kostet extra.** Treibstoff pro Flug = ⌈Startkosten + Entfernung × (je Feld + je Passagier × Passagiere)⌉. Die Siedlerrakete (3 Plätze) braucht 6 + Entfernung × (1,5 + 1 × Passagiere), zum Nachbarplaneten mit 3 Einwohnern also 24 Treibstoff = 48 Öl.
- **Öl ist knapp.** Leere Vorkommen wachsen nicht nach. Das Öl auf dem Heimatplaneten (je ein Sumpf- und Wüstenfeld, etwa 90) reicht für knapp zwei Kolonieflüge. Wer weiter will, braucht eine Kolonie mit Öl oder Handel. Plastik braucht ebenfalls Öl, man muss also abwägen. Der Test „flying is hard“ hält das bei 1,5 bis 3 Flügen.
- **Kolonisieren erst ab Stufe 4.** Die Siedlerrakete kostet 20 Bretter, 15 Eisen, 5 Werkzeug und 3 Stoff. Gegeneinander bleiben Sabotage (Stufe 2, 12 Treibstoff für einen Saboteur) und Angriff (Stufe 3) früh, kosten aber auch Treibstoff.

Die Transportrakete (Stufe 6) fliegt weiter und schneller, die große Rakete mit Uran viel weiter. Eine Rakete wird beim Landen verbraucht und gibt etwas Stahl und Plastik für die neue Kolonie. Die Werte stehen in `SPACE.rockets` in `progression.ts`, die Kurzformel in `rocketFuel()`.

## Was zuerst im Playtest prüfen

1. Ob die Nachbar-Mali Spaß machen oder nerven. Stellschraube: `NOISY` in `buildings.ts` und die `adjacency`-Listen.
2. Ob Stufe 1 bis 3 sich flott genug anfühlt (Ziel gemeinsam: erste Mine nach 3 Minuten, Gießerei nach 15). Falls zu zäh, zuerst `birthBase` senken.
3. Ob die Nahrung mit 3 pro Einwohner zu streng ist. Falls ja, zuerst `foodPerInhabitantPerMinute` auf 5 senken.
4. Ob der Sprung ins All ab Stufe 6 genug Zug hat, oder ob Ätherit schon früher lockt.
5. Ob sich Arbeitermangel gut anfühlt oder nur frustriert. Stellschraube ist `birthPerCitizen`.
6. Ob Fliegen jetzt schwer genug ist, aber nicht festfährt. Stellschrauben: `takeoffFuel` und `fuelPerPassenger` in `SPACE.rockets`, das Öl-Verhältnis im Rezept `fuel`.
