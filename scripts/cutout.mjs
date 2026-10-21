// Cuts the six sock photos (cream studio background) into alpha cutouts.
// Usage: node scripts/cutout.mjs <srcDir> <outDir>
import sharp from 'sharp';
import fs from 'node:fs';
const [src, out] = process.argv.slice(2);
fs.mkdirSync(out, { recursive: true });
const OUT_W = 840;
for (let n = 1; n <= 6; n++) {
  const { data, info } = await sharp(`${src}/sock-${n}.png`).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const W = info.width, H = info.height, N = W * H;
  const isBgLike = new Uint8Array(N);
  for (let i = 0; i < N; i++) {
    const r = data[i * 3], g = data[i * 3 + 1], b = data[i * 3 + 2];
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
    isBgLike[i] = (r - b < 11 && mn > 196 && mx - mn < 13) ? 1 : 0;
  }
  // flood from border
  const bg = new Uint8Array(N); const q = new Int32Array(N); let h = 0, t = 0;
  const push = (i) => { if (!bg[i] && isBgLike[i]) { bg[i] = 1; q[t++] = i; } };
  for (let x = 0; x < W; x++) { push(x); push((H - 1) * W + x); }
  for (let y = 0; y < H; y++) { push(y * W); push(y * W + W - 1); }
  while (h < t) { const i = q[h++]; const x = i % W, y = (i / W) | 0;
    if (x > 0) push(i - 1); if (x < W - 1) push(i + 1); if (y > 0) push(i - W); if (y < H - 1) push(i + W); }
  // largest fg component
  const lab = new Int32Array(N); let best = 0, bestSize = 0, cur = 0;
  for (let s = 0; s < N; s++) { if (bg[s] || lab[s]) continue; cur++; let size = 0; h = 0; t = 0; q[t++] = s; lab[s] = cur;
    while (h < t) { const i = q[h++]; size++; const x = i % W, y = (i / W) | 0;
      for (const j of [x > 0 ? i - 1 : -1, x < W - 1 ? i + 1 : -1, y > 0 ? i - W : -1, y < H - 1 ? i + W : -1])
        if (j >= 0 && !bg[j] && !lab[j]) { lab[j] = cur; q[t++] = j; } }
    if (size > bestSize) { bestSize = size; best = cur; } }
  // fill interior holes: background not reachable from border once fg is solid
  const outside = new Uint8Array(N); h = 0; t = 0;
  const push2 = (i) => { if (!outside[i] && lab[i] !== best) { outside[i] = 1; q[t++] = i; } };
  for (let x = 0; x < W; x++) { push2(x); push2((H - 1) * W + x); }
  for (let y = 0; y < H; y++) { push2(y * W); push2(y * W + W - 1); }
  while (h < t) { const i = q[h++]; const x = i % W, y = (i / W) | 0;
    if (x > 0) push2(i - 1); if (x < W - 1) push2(i + 1); if (y > 0) push2(i - W); if (y < H - 1) push2(i + W); }
  // erode 1px to drop the halo, then soft alpha via 3x3 box
  const m = new Float32Array(N);
  for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) { const i = y * W + x;
    m[i] = (!outside[i] && !outside[i - 1] && !outside[i + 1] && !outside[i - W] && !outside[i + W]) ? 1 : 0; }
  const rgba = Buffer.alloc(N * 4); let minX = W, minY = H, maxX = 0, maxY = 0;
  for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) { const i = y * W + x;
    let a = 0; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) a += m[i + dy * W + dx];
    a /= 9; rgba[i * 4] = data[i * 3]; rgba[i * 4 + 1] = data[i * 3 + 1]; rgba[i * 4 + 2] = data[i * 3 + 2]; rgba[i * 4 + 3] = Math.round(a * 255);
    if (a > 0) { minX = Math.min(minX, x); maxX = Math.max(maxX, x); minY = Math.min(minY, y); maxY = Math.max(maxY, y); } }
  const pad = 6;
  const left = Math.max(0, minX - pad), top = Math.max(0, minY - pad);
  const cw = Math.min(W, maxX + pad) - left, ch = Math.min(H, maxY + pad) - top;
  await sharp(rgba, { raw: { width: W, height: H, channels: 4 } }).extract({ left, top, width: cw, height: ch })
    .resize({ width: Math.min(OUT_W, cw) }).webp({ quality: 88, alphaQuality: 100 }).toFile(`${out}/0${n}.webp`);
  console.log(n, 'crop', left, top, cw, ch);
}
