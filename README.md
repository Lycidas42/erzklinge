# Erzklinge

Idle-Rollenspiel als PWA: Ein Zwergenheld kämpft sich durch vier Zonen, trainiert seine Attribute und sammelt Ausrüstung, die am drehbaren 3D-Modell sichtbar ist. Läuft im Browser auf Handy und Desktop und lässt sich als App installieren.

**Spielen:** https://lycidas42.github.io/erzklinge/

## Spielinhalt

| Bereich | Inhalt |
|---|---|
| Halle | Drehbarer Held mit Ausrüstung, Werte, Navigation |
| Arena | 2,5D-Sidescroller, 4 Zonen à 10 Stufen, Boss auf Stufe 10, „Vorrücken“ oder „Stufe halten“ |
| Trainingshof | Ein Attribut trainiert im Hintergrund; Antippen der Puppe beschleunigt |
| Charakterbogen | Attributpunkte (+5 pro Stufe), Detailwerte, Inventar mit Vergleich |
| Kontor | Kaufen, Verkaufen, Sortiment wechselt alle 10 Minuten |

Attribute: Stärke (Schaden, Rüstung), Geschicklichkeit (Tempo, Kritisch), Intelligenz (Magieschaden, Mana), Vitalität (Leben, Regeneration). Der Spielstand liegt im Browser (`localStorage`). Beim Zurückkehren werden Training und Kämpfe für bis zu 8 Stunden nachgerechnet.

## Aufbau

```
src/
  head.html      Titel, Schriften, Import-Map, gesamtes CSS
  body.html      Bildschirme und Bedienelemente
  data.js        Regeln und Balance: Attribute, Gegenstände, Monster, Zonen, Formeln, Speichern
  gfx-core.js    Renderer, Materialien, Helden-Rig, Ausrüstungs- und Monstermodelle, Animation
  gfx-scenes.js  Szenen: Heldenhalle, Arena je Zone, Trainingshof, Item-Vorschaubilder
  game.js        Oberfläche, Kampfablauf, Training, Shop, Hauptschleife
  pwa.js         Service-Worker-Registrierung und Update-Hinweis (nur Pages-Build)
  sw.js          Service Worker (Offline-Cache)
vendor/three/    Three.js r160 (MIT), lokal für den Offline-Betrieb
assets/icons/    App-Icons (erzeugt mit tools/make_icons.py)
build.py         baut dist/ für GitHub Pages
```

Die JS-Dateien teilen sich einen gemeinsamen Gültigkeitsbereich und werden beim Bauen zu einem Modul zusammengefügt. Balance-Werte stehen gesammelt in `src/data.js`.

## Lokal starten

```bash
python build.py
python -m http.server 8000 -d dist
# http://localhost:8000
```

`python build.py artifact` erzeugt zusätzlich `out/erzklinge-artifact.html`, eine Einzeldatei mit Three.js vom CDN.

## Veröffentlichen

Jeder Push auf `main` baut das Spiel per GitHub Actions und veröffentlicht es auf GitHub Pages (Einstellung: *Settings → Pages → Source: GitHub Actions*). Der Service Worker lädt die Spieldatei immer zuerst aus dem Netz; installierte Apps zeigen bei einer neuen Version einen Hinweis zum Neuladen.

## Grafik

Alle Modelle sind derzeit prozedural in Three.js gebaut (stilisiertes Low-Poly, Fackellicht, Bloom). Geplant ist der schrittweise Ersatz durch GLB-Modelle aus Blender bzw. Meshy:

1. Basisfigur und jedes Ausrüstungsteil als eigenes Modell
2. In Blender säubern, Polygone reduzieren, an ein gemeinsames Skelett binden, Sockel-Knochen für Waffe, Schild und Helm
3. Als GLB nach `assets/models/` exportieren und mit `GLTFLoader` laden
