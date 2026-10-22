# Holey × Atelier — Hand-distressed by you

Holey sells **one sock with a hole**. This is the Holey site (shop, product pages, cart, FAQ,
About, the Laundry Day film) with **the Atelier** built into the home page clothesline: take a
sock down, and it comes forward onto a big peg while the others recede; pull its loose thread and
it unravels row by row into a heap on the floor. Less sock, higher price ($9 → $99). Your wage:
$0.00. "Add to basket" puts the sock in the cart at its distressed price, prints an Atelier
receipt, and issues a Certificate of Authenticity (PNG).

Entry for the Communication Arts 2027 Interactive Competition (Student Work).
Concept, design & code: Minjeong Shin (immmiin), SVA BFA Graphic Design.
Product imagery visualized with AI; all interaction, unravel effects and yarn rendered in code.

## Where things are

- `src/sections/Atelier.jsx` — the home clothesline turned Atelier (pick, depth, HUD, basket flow)
- `src/components/Clothesline.jsx` — the site's verlet clothesline (+ atelier mode: pick, freeze, live rope)
- `src/atelier/PullStage.ts` — the pull: stick-slip, pendulum, conservation of yarn, thread, heap
- `src/atelier/model.ts` (+ worker) — knit rows from a harmonic field over the sock's alpha mask
- `src/atelier/Receipt.tsx`, `Certificate.tsx`, `certDraw.ts` — receipt strip and certificate
- `src/atelier/sound.ts` — synthesised sound (starts on first gesture; "M" mutes)

## Develop

```sh
npm install
npm run dev                                  # http://localhost:5199
node scripts/atelier-flow.mjs out            # full Atelier flow, desktop (dev server running)
node scripts/atelier-flow.mjs out 390 844    # mobile
node scripts/overflow.mjs http://localhost:5199
npm run typecheck                            # TypeScript in src/atelier
```

Based on the original Holey site (README.original.md). Source photos for `npm run assets` live in
`assets-src/`.
