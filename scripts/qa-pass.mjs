// This pass: counter counts up from 0 to the live stats; dashed hero divider; care label numbers and
// type hierarchy on every product page; checkout name field + no card field.  BASE=… node scripts/qa-pass.mjs
import { chromium } from 'playwright';
const BASE = (process.env.BASE || 'http://localhost:5199').replace(/\/$/, '');
const b = await chromium.launch();
let bad = 0;
const ok = (c, msg) => (c || bad++, console.log(`${c ? 'PASS' : 'FAIL'}  ${msg}`));

// counter: fresh context (no cache, no cookies)
{
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
  const p = await ctx.newPage();
  const stats = await (await fetch(BASE + '/api/stats')).json();
  await p.goto(BASE + '/');
  await p.waitForTimeout(1000);
  await p.evaluate(() => document.querySelector('#line').scrollIntoView());
  const seq = [];
  for (let i = 0; i < 12; i++) {
    seq.push(await p.evaluate(() => document.querySelector('.teaser__counter b')?.textContent));
    await p.waitForTimeout(200);
  }
  await p.waitForTimeout(1500);
  const end = await p.evaluate(() => document.querySelector('.teaser__counter').textContent);
  const m = Math.floor(stats.totalLaborSec / 60), s = String(stats.totalLaborSec % 60).padStart(2, '0');
  console.log(`      /api/stats ${JSON.stringify(stats)}`);
  console.log(`      counter while counting: ${[...new Set(seq)].join(' → ')}`);
  ok(end.includes(`${m}m ${s}s`) && end.replace(/,/g, "").includes(`$${Math.round(stats.brandRevenue)}`), `counter ends at "${end}"`);
  ok(seq[0] === '0m 00s' || seq.some((x) => x !== seq[seq.length - 1]), 'counter counts up from 0 on load');
  const div = await p.evaluate(() => {
    const cs = getComputedStyle(document.querySelector('.teaser'), '::before');
    return { w: cs.height, img: cs.backgroundImage.slice(0, 60) };
  });
  ok(div.w === '3px' && div.img.includes('repeating-linear-gradient'), `hero → line-up divider: ${div.w}, ${div.img}…`);
  await ctx.close();
}

// product pages
for (const [W, H] of [[1440, 900], [390, 844]]) {
  const p = await b.newPage({ viewport: { width: W, height: H }, isMobile: W < 768, hasTouch: W < 768 });
  const nos = new Set();
  for (const slug of ['heel-yeah', 'lost-in-laundry', 'purple-reign', 'big-toe-energy', 'toe-jam', 'grass-stain']) {
    await p.goto(`${BASE}/socks/${slug}`);
    await p.waitForTimeout(1600);
    const r = await p.evaluate(() => {
      const q = (s) => document.querySelector(s);
      const R = (s) => q(s).getBoundingClientRect();
      const fs = (s) => parseFloat(getComputedStyle(q(s)).fontSize);
      const fw = (s) => getComputedStyle(q(s)).fontWeight;
      const head = R('.pdp2__label-head'), t = R('.pdp2__label-title'), n = R('.pdp2__label-no');
      return {
        no: q('.pdp2__label-no')?.textContent,
        noRight: n.left > t.right && Math.abs(n.right - head.right) < 2,
        order: ['.pdp2__title', '.pdp2__price', '.pdp2__desc', '.pdp2__label'].map((s) => R(s).top).every((v, i, a) => !i || v > a[i - 1]),
        gapTitle: Math.round(R('.pdp2__buy').top - R('.pdp2__title').bottom),
        sizes: { title: fs('.pdp2__title'), price: fs('.pdp2__price'), desc: fs('.pdp2__desc'), labelTitle: fs('.pdp2__label-title'), dt: fs('.pdp2__label dt'), dd: fs('.pdp2__label dd') },
        fonts: { labelTitle: getComputedStyle(q('.pdp2__label-title')).fontFamily.split(',')[0], dt: fw('.pdp2__label dt'), dd: fw('.pdp2__label dd') },
        overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth
      };
    });
    nos.add(r.no);
    const z = r.sizes;
    const hier = z.title > z.price && z.price > z.desc && z.labelTitle > z.dt && z.dd > z.dt;
    ok(r.no && r.noRight && r.order && r.gapTitle >= 14 && hier && r.overflow === 0,
      `${W}  /socks/${slug.padEnd(15)} ${r.no}  title→buy gap ${r.gapTitle}px  sizes title ${z.title} > price ${z.price} > desc ${z.desc};  label ${z.labelTitle} (${r.fonts.labelTitle}) · dt ${z.dt}/${r.fonts.dt} · dd ${z.dd}/${r.fonts.dd}`);
  }
  ok(nos.size === 6, `${W}  care label numbers unique: ${[...nos].join(', ')}`);
  await p.close();
}

// checkout
for (const typed of ['Minnie', '']) {
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
  const p = await ctx.newPage();
  await p.route('**/api/orders', (r) => r.fulfill({ status: 503, body: '{}' })); // don't add test orders to the Archive
  await p.goto(BASE + '/socks/toe-jam');
  await p.waitForTimeout(1200);
  await p.click('.pdp2__add');
  await p.goto(BASE + '/checkout');
  await p.waitForTimeout(1000);
  const f = await p.evaluate(() => ({
    card: [...document.querySelectorAll('.cko__field span')].some((s) => /card/i.test(s.textContent)),
    note: document.querySelector('.cko__form')?.textContent.includes('Payment is taken in good faith. Declined, then approved.'),
    nameVal: document.querySelector('.cko__field input').value,
    ph: document.querySelector('.cko__field input').placeholder,
    ro: document.querySelector('.cko__field input').readOnly
  }));
  if (typed) await p.fill('.cko__field input', typed);
  await p.click('.cko__place');
  await p.waitForTimeout(2000);
  const done = await p.evaluate(() => ({ h1: document.querySelector('.cko__head h1')?.textContent, saved: JSON.parse(sessionStorage.getItem('holey-last-order-v2') || '{}').name }));
  const want = typed || 'You';
  ok(!f.card && f.note && f.nameVal === '' && f.ph === 'You' && !f.ro && done.saved === want && (!typed || done.h1.includes(typed)),
    `checkout (typed "${typed}"): card field ${f.card ? 'present' : 'gone'}, good-faith note ${f.note ? 'kept' : 'MISSING'}, name empty with placeholder "${f.ph}", order placed → name "${done.saved}", "${done.h1}"`);
  await ctx.close();
}
console.log(`\nfailures: ${bad}`);
await b.close();
