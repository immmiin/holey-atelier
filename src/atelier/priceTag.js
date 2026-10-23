// The Atelier's price tag, alive: it hangs from a clothespin clipped on the line (at 85% of the
// line's width, on the live rope) and swings on its string; the price counts up, each stitch pop
// floats a "+$0.31" beside it and kicks the tag; the price warms from ink to deep red, stamps at
// $20 / $45 / $99 (and SOLD OUT at $99). "Your wage $0.00" never changes — it just flinches.

const STOPS = [
  [9, [0x1a, 0x0f, 0x1f]], // ink
  [20, [0x1f, 0x5b, 0x3a]], // brand green
  [45, [0xd9, 0x43, 0x5e]], // pink-red
  [99, [0xb3, 0x12, 0x2a]] // deep red
];
const MILESTONES = [20, 45, 99];

/** the price colour for a price (linear between the stops) */
export function priceColor(price) {
  const v = Math.max(9, Math.min(99, price));
  for (let i = 1; i < STOPS.length; i++) {
    const [p1, c1] = STOPS[i], [p0, c0] = STOPS[i - 1];
    if (v <= p1) {
      const t = (v - p0) / (p1 - p0);
      const c = c0.map((x, k) => Math.round(x + (c1[k] - x) * t));
      return `rgb(${c[0]}, ${c[1]}, ${c[2]})`;
    }
  }
  return 'rgb(179, 18, 42)';
}

const money = (v) => `$${v.toFixed(2)}`;

export class PriceTag {
  /** els: { hang, tag, card, price, wage, sold } ; still: reduced motion */
  constructor(els, still) {
    this.els = els;
    this.still = still;
    this.shown = 9; // the number on the tag (counts up towards the real price)
    this.target = 9;
    this.lastPops = 0;
    this.popBase = 9; // price at the previous pop: the delta is measured from here
    this.th = 0; // swing angle (deg) and speed
    this.om = 0;
    this.last = 0;
    this.stamped = new Set();
  }

  reset() {
    this.shown = this.target = this.popBase = 9;
    this.lastPops = 0;
    this.th = this.om = 0;
    this.stamped.clear();
    this.els.sold?.classList.remove('is-on');
    this.paint();
  }

  /** where the pin sits (room coords) — the hanger follows the live line */
  place(x, y) {
    const h = this.els.hang;
    if (h) h.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) rotate(${this.th.toFixed(2)}deg)`;
  }

  /** one frame: h = the stage's HUD, pops = the stage's stitch-pop count */
  frame(h, pops, now = performance.now()) {
    const dt = this.last ? Math.min(0.05, (now - this.last) / 1000) : 1 / 60;
    this.last = now;
    this.target = h.phase === 'idle' ? 9 : h.price;
    if (h.phase === 'idle' || pops < this.lastPops) {
      // a fresh sock
      this.lastPops = pops;
      this.popBase = this.target;
    }
    if (pops > this.lastPops) {
      const delta = this.target - this.popBase;
      this.lastPops = pops;
      this.popBase = this.target;
      if (delta >= 0.01) this.pop(delta);
    }
    // count up (instantly with reduced motion)
    this.shown = this.still ? this.target : this.shown + (this.target - this.shown) * Math.min(1, dt * 9);
    if (Math.abs(this.target - this.shown) < 0.005) this.shown = this.target;
    // milestones: a stamp pulse, and SOLD OUT at $99
    for (const m of MILESTONES) {
      if (this.shown >= m - 0.005 && !this.stamped.has(m)) {
        this.stamped.add(m);
        this.stamp();
        if (m === 99) this.els.sold?.classList.add('is-on');
      }
    }
    // the swing: a damped pendulum on its string
    if (!this.still) {
      const K = 38, C = 2.6;
      this.om += (-K * this.th - C * this.om) * dt;
      this.th = Math.max(-8, Math.min(8, this.th + this.om * dt));
    } else this.th = 0;
    this.paint();
  }

  paint() {
    const p = this.els.price;
    if (!p) return;
    p.textContent = money(this.shown);
    p.style.color = priceColor(this.shown);
  }

  pop(delta) {
    // the wage flinches every time (the joke): it never changes
    this.retrigger(this.els.wage, 'is-flinch');
    if (this.still) return;
    // swing + a little bounce on the string
    this.om += (Math.random() < 0.5 ? -1 : 1) * (9 + Math.min(14, delta * 40)); // a tiny swing
    this.retrigger(this.els.card, 'is-bounce');
    // the floating delta beside the price
    const host = this.els.price?.parentElement;
    if (!host) return;
    const d = document.createElement('span');
    d.className = 'tag-delta';
    d.textContent = `+${money(delta)}`;
    d.style.color = priceColor(this.target);
    host.appendChild(d);
    d.addEventListener('animationend', () => d.remove(), { once: true });
  }

  stamp() {
    this.retrigger(this.els.price, 'is-stamp');
  }

  retrigger(el, cls) {
    if (!el) return;
    el.classList.remove(cls);
    void el.offsetWidth; // restart the animation
    el.classList.add(cls);
  }
}
