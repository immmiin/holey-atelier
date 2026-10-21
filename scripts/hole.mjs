// Finds the toe-hole centre in each sock cutout (bright frayed yarn at the toe tip),
// normalised to the full image. Usage: node scripts/hole.mjs <dir with sock-N-1200.webp>
import sharp from 'sharp';
const dir = process.argv[2] || 'public/img/socks';
const out = [];
for (let n = 1; n <= 6; n++) {
  const f = `${dir}/sock-${n}-1200.webp`;
  const { data, info } = await sharp(f).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const W = info.width, H = info.height, C = info.channels;
  let x0 = W, y0 = H, x1 = 0, y1 = 0;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (data[(y * W + x) * C + 3] > 128) {
    x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y);
  }
  const bw = x1 - x0, bh = y1 - y0;
  let sx = 0, sy = 0, c = 0;
  for (let y = Math.round(y0 + bh * 0.855); y <= y1; y++) for (let x = x0; x < x0 + bw * 0.3; x++) {
    const i = (y * W + x) * C, r = data[i], g = data[i + 1], b = data[i + 2];
    if (data[i + 3] > 250 && Math.min(r, g, b) > 185 && Math.max(r, g, b) - Math.min(r, g, b) < 40) { sx += x; sy += y; c++; }
  }
  out.push({ n, x: +(sx / c / W).toFixed(4), y: +(sy / c / H).toFixed(4), bbox: [x0, y0, bw, bh] });
}
console.log(JSON.stringify(out));
