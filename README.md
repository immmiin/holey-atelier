# Atelier Holey — Hand-distressed by You

Holey sells **one sock with a hole**. At the Atelier you finish it yourself: pick a sock off the
clothesline, sign the artisan badge, and pull the loose thread. The sock unravels row by row into
a heap on the floor. Less sock, higher price ($9 → $99). Your wage: $0.00.

Entry for the Communication Arts 2027 Interactive Competition (Student Work).
Concept, design & code: Minjeong Shin (immmiin), SVA BFA Graphic Design.

## How it works

- **Knit model** (`src/scene/model.ts`, built in a Web Worker): the sock cutout's alpha mask is
  gridded; a harmonic field from the toe hole to the cuff (seeded by a geodesic BFS, re-parametrised
  by arc length) gives knit rows that run across the tube. Rows unravel boustrophedon, so the active
  stitch shuttles back and forth.
- **Conservation**: unravelled yarn length drives the fabric removed. Air yarn is clamped to what
  reaches the hand plus droop; the rest lies in the heap, whose silhouette is ~48% of the sock's.
- **Stick-slip** pulling, verlet thread, pendulum on the clothespin, crimped 2-ply yarn, a heap
  baked loop-by-loop in material order. All synthesised sound (WebAudio); "M" mutes.
- Receipt (thermal strip with a die-cut hole sized to the hole you made) and a canvas-drawn
  Certificate of Authenticity with PNG export.

## Develop

```sh
npm install
npm run dev          # http://localhost:5199  (?tune shows the feel sliders)
node scripts/flowtest.mjs out            # full Playwright flow, desktop
node scripts/flowtest.mjs out 390 844    # mobile
```

Product imagery visualized with AI; all interaction, unravel effects and yarn rendered in code.
