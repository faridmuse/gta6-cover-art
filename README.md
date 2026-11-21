# Neon Coast — GTA-style Cover Studio

[![make.fun](https://img.shields.io/badge/make.fun-gta6--cover--art--01-ff2e88)](https://make.fun/c/gta6-cover-art-01)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Offline](https://img.shields.io/badge/offline-100%25-brightgreen)](app/index.html)

Turn any photo and a caption into GTA-style multi-panel cover art — in the browser,
offline, with your photos never leaving your machine. Export a PNG to share.

## What it does

- **Multi-panel covers** — 6 layouts: Hero + 3 (the classic cover grid), Nine Panel
  with a centre title block, Full Bleed, Tilted Snaps, Split Duo, Poster Stack.
- **Any photo** — upload one or several photos; click a panel to pick it, drag to pan,
  zoom slider, flip. Fill every panel with one photo or spread several across them.
- **Vice City sunset / neon grades** — 5 gradient-map colour grades (Vice Sunset,
  Neon Night, Palm Teal, Hot Pink, Noir Gold) applied per panel on canvas.
- **Bold lettering** — Anton title with a sunset gradient + black keyline, Pacifico
  neon script subtitle, halftone title dots, badge ribbon, wanted-star heat meter.
- **Fast to PNG** — one click exports 1080 × 1080, 1080 × 1350 or 1920 × 1080;
  "Export all 3 sizes" grabs all three at once. Undo / redo included.
- **Polish** — live preview, film grain, vignette, white poster frame.

## Try it

No build step, no network. Open `app/index.html` in desktop Chrome, or:

```sh
node serve.ts   # then open http://localhost:8080
```

Two sample photos ship under `app/samples/` (made with an image model for the
make.fun starter kit, free to use) so the app works out of the box.

## Originality

All art, lettering and code are original. Fonts are Anton and Pacifico under the
SIL Open Font License (texts in `app/fonts/`). No Rockstar Games logo, artwork,
character or font is used anywhere.

## Entry

Built for the [make.fun](https://make.fun) competition
[gta6-cover-art-01](https://make.fun/c/gta6-cover-art-01) — "Make GTA 6 Cover Art".
`main.ts` hands `app/` + `screenshots/` in as the entry; see `screenshots/` for
the app at work and the covers it exports.
