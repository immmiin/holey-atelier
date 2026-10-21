// Asset pipeline for Holey.
// - Removes the white studio background from public/socks/sock-N.png
//   (originals untouched) -> public/socks/clean/sock-N.png
// - Emits responsive WebP variants to public/img/**
// - Generates favicons / apple-touch-icon / social icons from the nail "H" logo
// Run: npm run assets
import sharp from 'sharp';
import fs from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const pub = (...p) => path.join(root, 'public', ...p);
// source photos live outside public/ so they don't ship
const srcDir = (...p) => path.join(root, 'assets-src', ...p);
await fs.mkdir(srcDir('socks/clean'), { recursive: true });
await fs.mkdir(pub('img/socks'), { recursive: true });
await fs.mkdir(pub('img/lifestyle'), { recursive: true });
await fs.mkdir(pub('icons'), { recursive: true });

const SOCK_BG = ['#F2A7B5', '#A9C6EE', '#D4B8EE', '#F6E7A0', '#F2EADB', '#C9DEC1'];

/* ---------- 1. background removal ---------- */
async function removeWhite(src, dest) {
  const { data, info } = await sharp(src).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: w, height: h } = info;
  const n = w * h;
  const isBgColor = (i) => {
    const r = data[i * 3], g = data[i * 3 + 1], b = data[i * 3 + 2];
    const mn = Math.min(r, g, b), mx = Math.max(r, g, b);
    // near-white studio background, or the neutral-grey floor shadow under the toe
    // (the cream knit is always a little warm, so it stays: its R-B spread is > 9)
    return (mn >= 238 && mx - mn <= 12) || (mn >= 165 && mx - mn <= 9);
  };
  // flood fill from every border pixel so white areas *inside* the sock survive
  const bg = new Uint8Array(n);
  const stack = [];
  for (let x = 0; x < w; x++) { stack.push(x, (h - 1) * w + x); }
  for (let y = 0; y < h; y++) { stack.push(y * w, y * w + w - 1); }
  while (stack.length) {
    const i = stack.pop();
    if (bg[i] || !isBgColor(i)) continue;
    bg[i] = 1;
    const x = i % w, y = (i / w) | 0;
    if (x > 0) stack.push(i - 1);
    if (x < w - 1) stack.push(i + 1);
    if (y > 0) stack.push(i - w);
    if (y < h - 1) stack.push(i + w);
  }
  // keep only the largest connected foreground blob — drops shadow speckles near the floor
  {
    const label = new Int32Array(n);
    let best = 0, bestSize = 0, id = 0;
    for (let s0 = 0; s0 < n; s0++) {
      if (bg[s0] || label[s0]) continue;
      id++;
      let size = 0;
      const q = [s0];
      label[s0] = id;
      while (q.length) {
        const i = q.pop();
        size++;
        const x = i % w, y = (i / w) | 0;
        for (const j of [x > 0 ? i - 1 : -1, x < w - 1 ? i + 1 : -1, y > 0 ? i - w : -1, y < h - 1 ? i + w : -1]) {
          if (j >= 0 && !bg[j] && !label[j]) { label[j] = id; q.push(j); }
        }
      }
      if (size > bestSize) { bestSize = size; best = id; }
    }
    for (let i = 0; i < n; i++) if (!bg[i] && label[i] !== best) bg[i] = 1;
  }
  // hard mask -> soft edge
  const mask = Buffer.alloc(n);
  for (let i = 0; i < n; i++) mask[i] = bg[i] ? 0 : 255;
  const soft = await sharp(mask, { raw: { width: w, height: h, channels: 1 } }).blur(0.9).extractChannel(0).raw().toBuffer();
  const out = Buffer.alloc(n * 4);
  for (let i = 0; i < n; i++) {
    const a = Math.min(mask[i], soft[i]) / 255; // only erode, never grow
    let r = data[i * 3], g = data[i * 3 + 1], b = data[i * 3 + 2];
    if (a > 0 && a < 1) {
      // un-mix the white fringe
      r = Math.max(0, Math.min(255, (r - 255 * (1 - a)) / a));
      g = Math.max(0, Math.min(255, (g - 255 * (1 - a)) / a));
      b = Math.max(0, Math.min(255, (b - 255 * (1 - a)) / a));
    }
    out[i * 4] = r; out[i * 4 + 1] = g; out[i * 4 + 2] = b; out[i * 4 + 3] = Math.round(a * 255);
  }
  await sharp(out, { raw: { width: w, height: h, channels: 4 } }).png({ compressionLevel: 9 }).toFile(dest);
}

for (let i = 1; i <= 6; i++) {
  const src = srcDir(`socks/sock-${i}.png`);
  const meta = await sharp(src).metadata();
  const clean = srcDir(`socks/clean/sock-${i}.png`);
  if (meta.hasAlpha) {
    await fs.copyFile(src, clean);
  } else {
    await removeWhite(src, clean);
  }
  // trim transparent margin, then pad to a consistent 4:5 box so every sock sits the same
  const trimmed = await sharp(clean).trim({ threshold: 1 }).toBuffer({ resolveWithObject: true });
  const tw = trimmed.info.width, th = trimmed.info.height;
  const boxH = Math.round(th * 1.04), boxW = Math.round(boxH * 0.8);
  const padded = await sharp({ create: { width: boxW, height: boxH, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([{ input: trimmed.data, left: Math.round((boxW - tw) / 2), top: Math.round((boxH - th) / 2) }])
    .png().toBuffer();
  for (const width of [400, 800, 1200]) {
    await sharp(padded).resize({ width }).webp({ quality: 86, alphaQuality: 90 }).toFile(pub(`img/socks/sock-${i}-${width}.webp`));
  }
  // texture for the 3D fallback (power-of-two-ish, keeps alpha)
  await sharp(padded).resize({ height: 1024 }).webp({ quality: 88, alphaQuality: 95 }).toFile(pub(`img/socks/sock-${i}-tex.webp`));

  // hover image: macro shot of the hole on the sock's own colour
  const bgc = SOCK_BG[i - 1];
  const orig = await sharp(clean).metadata();
  const cw = Math.round(orig.width * 0.5), ch = Math.round(cw * 1.2);
  const crop = { left: Math.round(orig.width * 0.04), top: orig.height - ch, width: cw, height: ch };
  const macro = await sharp(clean).extract(crop).flatten({ background: bgc }).png().toBuffer();
  for (const width of [600, 1000]) {
    await sharp(macro).resize({ width, height: Math.round(width * 1.2), fit: 'cover' }).webp({ quality: 82 }).toFile(pub(`img/socks/sock-${i}-hole-${width}.webp`));
  }
  console.log('sock', i, 'done');
}

/* ---------- 2. lifestyle ---------- */
const lifeFiles = (await fs.readdir(srcDir('lifestyle'))).filter((f) => /\.(png|jpe?g|webp)$/i.test(f)).sort();
let li = 0;
const lifeManifest = [];
for (const f of lifeFiles) {
  li++;
  const src = srcDir('lifestyle', f);
  const m = await sharp(src).metadata();
  for (const width of [600, 1000, 1400]) {
    await sharp(src).resize({ width: Math.min(width, m.width) }).webp({ quality: 80 }).toFile(pub(`img/lifestyle/life-${li}-${width}.webp`));
  }
  // extra crops so two photos can fill a whole social wall
  const crops = {
    toe: { left: Math.round(m.width * 0.28), top: Math.round(m.height * 0.55), width: Math.round(m.width * 0.5), height: Math.round(m.height * 0.42) },
    top: { left: 0, top: 0, width: m.width, height: Math.round(m.height * 0.55) },
    wide: { left: 0, top: Math.round(m.height * 0.3), width: m.width, height: Math.round(m.width * 0.54) }
  };
  for (const [name, c] of Object.entries(crops)) {
    c.height = Math.min(c.height, m.height - c.top);
    for (const width of [600, 1200]) {
      await sharp(src).extract(c).resize({ width }).webp({ quality: 80 }).toFile(pub(`img/lifestyle/life-${li}-${name}-${width}.webp`));
    }
  }
  lifeManifest.push({ source: f, id: li });
  console.log('lifestyle', li, f);
}
await fs.writeFile(pub('img/lifestyle/manifest.json'), JSON.stringify(lifeManifest, null, 2));

/* ---------- 3. icons ---------- */
const iconSvg = await fs.readFile(pub('logo/holey_03_nail-icon-H.svg'));
const iconOn = async (size, bg, pad, file) => {
  const inner = Math.round(size * (1 - pad * 2));
  const glyph = await sharp(iconSvg, { density: 300 }).resize({ width: inner, height: inner, fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer();
  const base = bg
    ? sharp({ create: { width: size, height: size, channels: 4, background: bg } })
    : sharp({ create: { width: size, height: size, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } });
  await base.composite([{ input: glyph, gravity: 'center' }]).png().toFile(pub('icons', file));
};
await iconOn(16, null, 0.02, 'favicon-16.png');
await iconOn(32, null, 0.02, 'favicon-32.png');
await iconOn(180, '#FBF1E8', 0.14, 'apple-touch-icon.png');
await iconOn(192, '#FBF1E8', 0.14, 'icon-192.png');
await iconOn(512, '#FBF1E8', 0.14, 'icon-512.png');

// Open Graph card: cream, bubble logo, hero sock
const bubble = await sharp(await fs.readFile(pub('logo/holey_02_bubble.svg')), { density: 200 }).resize({ width: 640 }).png().toBuffer();
const ogSock = await sharp(pub('img/socks/sock-1-800.webp')).resize({ height: 560 }).png().toBuffer();
await sharp({ create: { width: 1200, height: 630, channels: 4, background: '#FBF1E8' } })
  .composite([{ input: bubble, left: 70, top: 150 }, { input: ogSock, left: 780, top: 35 }])
  .png().toFile(pub('icons', 'og-image.png'));
console.log('icons done');
