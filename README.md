# vdella.github.io: flight-mode portfolio

An interactive CV: fly a hover-ship over a low-poly planet styled like a GitHub contribution graph
(GitHub dark palette) and land on
hexagonal pads to read each section (About, Projects, Experience, Education,
Stack, Contact). A "Classic CV" button shows everything as a plain,
accessible page. It is also the fallback when WebGL is unavailable.

Built with plain ES modules + three.js (vendored, MIT). No build step.

## Run locally
```bash
python3 -m http.server 8000   # then open http://localhost:8000
```
(ES modules don't load from file://, so you need a local server.)

## Deploy on GitHub Pages
1. Copy every file in this folder into the root of the `vdella/vdella.github.io` repo.
2. Commit and push to the default branch.
3. In Settings → Pages, set the source to "Deploy from a branch", branch `main`, folder `/ (root)`.
`.nojekyll` tells Pages to serve the files as-is.

## Edit content
All text lives in `js/content.js`. Each section has a `position: [x, z]` that
places its pad in the world (keep it within a radius of ~150 from the centre).

## Controls
| Action | Keyboard | Touch |
|---|---|---|
| Fly | WASD / arrows | drag on the left half |
| Boost | Shift / Space | Boost button |
| Open section | E / Enter | tap the prompt |
| Close | Esc | × |
| Respawn | R | n/a |

## Structure
```
index.html        page shell, HUD, panels
css/style.css     palette + UI styles
js/content.js     CV data (single source of truth)
js/main.js        renderer, lights, camera rig, main loop
js/world.js       terrain height function, lake, trees, rocks, clouds, orbs
js/ship.js        ship model + hover/arcade physics
js/zones.js       landing pads, beacons, labels, trigger detection
js/trail.js       engine particle trail (custom shader)
js/input.js       keyboard + virtual joystick
js/ui.js          panels, classic mode, minimap, speedometer
js/noise.js       deterministic value noise / fBm / seeded RNG
vendor/           three.js r187 (MIT)
```
