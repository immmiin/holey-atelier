import { useEffect, useRef, useState } from 'react';
import { reducedMotion } from '../lib/scroll.js';
import './hole-cursor.css';

/* ---------- a frayed hole, generated once ---------- */
function rand(seed) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}
const R = 50; // svg units
function frayedPath() {
  const r = rand(7);
  const pts = [];
  const N = 44;
  for (let i = 0; i < N; i++) {
    const a = (i / N) * Math.PI * 2;
    const rad = R - 6 + r() * 6 - (i % 3 === 0 ? r() * 4 : 0);
    pts.push([60 + Math.cos(a) * rad, 60 + Math.sin(a) * rad]);
  }
  return `M${pts.map((p) => p.map((v) => v.toFixed(1)).join(' ')).join('L')}Z`;
}
function threads() {
  const r = rand(19);
  const out = [];
  for (let i = 0; i < 14; i++) {
    const a = r() * Math.PI * 2;
    const r0 = R - 7;
    const r1 = R - 7 + 6 + r() * 9;
    const bend = (r() - 0.5) * 0.35;
    out.push(
      `M${(60 + Math.cos(a) * r0).toFixed(1)} ${(60 + Math.sin(a) * r0).toFixed(1)} Q${(60 + Math.cos(a + bend) * (r0 + r1) * 0.5).toFixed(1)} ${(60 + Math.sin(a + bend) * (r0 + r1) * 0.5).toFixed(1)} ${(60 + Math.cos(a + bend * 2) * r1).toFixed(1)} ${(60 + Math.sin(a + bend * 2) * r1).toFixed(1)}`
    );
  }
  return out;
}
const HOLE = frayedPath();
const THREADS = threads();
const MASK = `url("data:image/svg+xml,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 120 120'><path d='${HOLE}' fill='black'/></svg>`)}")`;

const BOX = 120; // px — max hole size; the hole itself scales inside it
const SIZE = { idle: 34, hover: 92, press: 74, hidden: 0 };
const INTERACTIVE = 'a, button, [role="button"], label, summary, select, [data-cursor="grow"]';
const TEXTY = 'input:not([type="checkbox"]):not([type="radio"]):not([type="submit"]), textarea, [contenteditable="true"]';

function Inner() {
  const hole = useRef(null);
  const ring = useRef(null);

  useEffect(() => {
    document.documentElement.classList.add('hole-cursor');
    const still = reducedMotion();
    const s = { x: -200, y: -200, tx: -200, ty: -200, size: 0, vSize: 0, target: SIZE.idle, over: false, down: false, text: false, seen: false };

    const pick = (el) => {
      s.text = !!el?.closest?.(TEXTY);
      s.over = !s.text && !!el?.closest?.(INTERACTIVE);
    };
    const onMove = (e) => {
      if (e.pointerType && e.pointerType !== 'mouse') return;
      s.tx = e.clientX;
      s.ty = e.clientY;
      if (!s.seen) {
        s.seen = true;
        s.x = s.tx;
        s.y = s.ty;
      }
      pick(e.target);
    };
    const onDown = () => (s.down = true);
    const onUp = () => (s.down = false);
    const onLeave = (e) => {
      if (!e.relatedTarget) s.seen = false;
    };

    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('pointerdown', onDown, { passive: true });
    window.addEventListener('pointerup', onUp, { passive: true });
    document.addEventListener('pointerout', onLeave);

    let raf = 0;
    let lastBg = '';
    const tick = () => {
      raf = requestAnimationFrame(tick);
      s.target = !s.seen || s.text ? SIZE.hidden : s.down ? SIZE.press : s.over ? SIZE.hover : SIZE.idle;
      if (still) {
        s.x = s.tx;
        s.y = s.ty;
        s.size = s.target;
      } else {
        s.x += (s.tx - s.x) * 0.38;
        s.y += (s.ty - s.y) * 0.38;
        // springy size: overshoots a little, like elastic
        s.vSize += (s.target - s.size) * 0.22;
        s.vSize *= 0.62;
        s.size += s.vSize;
      }
      const size = Math.max(0, s.size);
      const left = s.x - BOX / 2;
      const top = s.y - BOX / 2;
      const t = `translate3d(${left.toFixed(1)}px, ${top.toFixed(1)}px, 0)`;
      const h = hole.current;
      const g = ring.current;
      if (!h || !g) return;
      h.style.transform = t;
      h.style.maskSize = h.style.webkitMaskSize = `${size.toFixed(1)}px ${size.toFixed(1)}px`;
      // the pink layer is pinned to the viewport, so the hole reveals it rather than dragging it along
      const bx = Math.round(-left);
      const by = Math.round(-top);
      const bg = `${bx}px ${by}px, ${bx + 28}px ${by + 32}px, ${bx}px ${by}px`;
      if (bg !== lastBg) {
        h.style.backgroundPosition = bg;
        lastBg = bg;
      }
      g.style.transform = `${t} scale(${(size / BOX).toFixed(3)})`;
    };
    tick();

    return () => {
      cancelAnimationFrame(raf);
      document.documentElement.classList.remove('hole-cursor');
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointerup', onUp);
      document.removeEventListener('pointerout', onLeave);
    };
  }, []);

  return (
    <div className="hc" aria-hidden="true">
      <div ref={hole} className="hc__hole" style={{ maskImage: MASK, WebkitMaskImage: MASK }} />
      <svg ref={ring} className="hc__ring" viewBox="0 0 120 120">
        <g className="hc__threads">
          {THREADS.map((d, i) => (
            <path key={i} d={d} />
          ))}
        </g>
        <path className="hc__edge" d={HOLE} />
        <path className="hc__stitch" d={HOLE} />
      </svg>
    </div>
  );
}

export default function HoleCursor() {
  const [on, setOn] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(hover: hover) and (pointer: fine)');
    const set = () => setOn(mq.matches);
    set();
    mq.addEventListener('change', set);
    return () => mq.removeEventListener('change', set);
  }, []);
  return on ? <Inner /> : null;
}
