# Holey

**One sock. One hole. $9.**
A fictional e-commerce site for a brand that sells exactly one sock, with a hole in the toe. Built for a graphic design school project, closely modelled on the structure, 
Stack: Vite + React 19, react-router, GSAP ScrollTrigger, Motion, Lenis, @react-three/fiber + drei.

## Run it

```bash
npm install
npm run dev          # http://localhost:5173
npm run build        # production build → dist/
npm run preview      # serve the build at http://localhost:4173
```

Requires Node 18+ (built on Node 24).

### Checks (dev server must be running)

```bash
npm run shots                     # screenshots of every page at 1440 / 768 / 375 → screenshots/
npm run test:ix                   # clicks through qty lock, drag-rotate, fly-to-cart, checkout, newsletter, 404
npm run test:overflow             # fails loudly if any page scrolls sideways
```

These use Playwright driving your installed Google Chrome (`channel: 'chrome'`). If you don't have Chrome, run `npx playwright install chromium` and remove the `channel` option.

## Deploy to Vercel

1. Push this folder to a GitHub repo.
2. On [vercel.com/new](https://vercel.com/new) import the repo. Vercel detects Vite automatically:
   - Build command: `npm run build`
   - Output directory: `dist`
3. Deploy. `vercel.json` already contains the SPA rewrite (so `/socks/heel-yeah` and the 404 page work on refresh), long-cache headers for hashed assets, and the right content type for `.glb` files.

Or from the terminal: `npm i -g vercel && vercel` (then `vercel --prod`).

## Where things live

| Path | What |
|---|---|
| `src/data/products.js` | The six socks: names, colours, copy, fake specs |
| `src/sections/` | Home-page sections (hero, product row, accordion, testimonials, spin, banner, story, rituals, social) |
| `src/pages/` | Shop, product, about, FAQ, contact, legal, checkout ending, 404 |
| `src/components/sock3d/` | The 3D sock viewer (lazy-loaded) |
| `src/context/CartContext.jsx` | Cart (localStorage), fly-to-cart, toast |
| `scripts/process-assets.mjs` | Background removal, WebP sizes, favicons (`npm run assets`) |
| `reference/vibe/` | Screenshots of vibebevvy.com used for comparison |
| `PROGRESS.md` | Build log, Vibe → Holey section mapping, decisions |

## Replacing assets

- **3D models:** drop `public/models/sock-1.glb` … `sock-6.glb` in. They're detected automatically, centred, scaled to the sock height and used everywhere a 3D sock appears (hero, spin section, product page). Without them, a "puffy" mesh is generated from the PNG.
- **Product photos:** replace `public/socks/sock-N.png` and run `npm run assets`. White backgrounds are removed automatically into `public/socks/clean/` (originals untouched), and WebP sizes are regenerated.
- **Lifestyle photos:** add images to `public/lifestyle/` and run `npm run assets`. They become `public/img/lifestyle/life-N-*.webp`; wire new ones into `src/sections/Social.jsx` / `Rituals.jsx`.

## Accessibility & motion

- Every interactive element is a real button/link with a label; drawer and menu trap focus and close on Esc.
- The 3D viewer rotates with the arrow keys as well as by dragging.
- `prefers-reduced-motion` disables smooth scrolling, scroll scrubs, intros, auto-rotation, marquees and grain animation.
