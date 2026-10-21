// Compares two desktop-baseline captures. Exit 1 on any difference.
import fs from 'node:fs/promises';
import sharp from 'sharp';
const [a = 'screenshots/baseline-before', b = 'screenshots/baseline-after'] = process.argv.slice(2);
let bad = 0;
// known run-to-run noise: Lost & Found deals a random shuffle; the R3F canvas size jitters sub-pixel
const norm = (r) => (r.startsWith('CANVAS|') ? 'CANVAS' : r.replace('|is-twin|', '||'));
const la = JSON.parse(await fs.readFile(`${a}/layout.json`, 'utf8'));
const lb = JSON.parse(await fs.readFile(`${b}/layout.json`, 'utf8'));
for (const k of Object.keys(la)) {
  const x = la[k], y = lb[k] || [];
  if (x.length !== y.length) { console.log(`LAYOUT ${k}: element count ${x.length} → ${y.length}`); bad++; }
  const n = Math.min(x.length, y.length);
  let shown = 0;
  for (let i = 0; i < n; i++) if (norm(x[i]) !== norm(y[i])) { bad++; if (shown++ < 3) console.log(`LAYOUT ${k} #${i}\n  - ${x[i]}\n  + ${y[i]}`); }
}
for (const f of (await fs.readdir(a)).filter((f) => f.endsWith('.png'))) {
  const [ia, ib] = await Promise.all([sharp(`${a}/${f}`).raw().toBuffer({ resolveWithObject: true }), sharp(`${b}/${f}`).raw().toBuffer({ resolveWithObject: true })]);
  if (ia.info.width !== ib.info.width || ia.info.height !== ib.info.height) { console.log(`PIXELS ${f}: size ${ia.info.width}x${ia.info.height} → ${ib.info.width}x${ib.info.height}`); bad++; continue; }
  let diff = 0;
  for (let i = 0; i < ia.data.length; i += 1) if (Math.abs(ia.data[i] - ib.data[i]) > 24) diff++;
  const pct = (diff / ia.data.length) * 100;
  if (pct > 0.05) { console.log(`PIXELS ${f}: ${pct.toFixed(3)}% channels differ`); bad++; }
}
console.log(bad ? `${bad} differences` : 'desktop identical');
process.exitCode = bad ? 1 : 0;
