import { useCallback, useEffect, useRef, useState } from 'react';
import Peek from '../components/Peek.jsx';
import { sockSrc } from '../data/products.js';
import { reducedMotion, scrollTo } from '../lib/scroll.js';
import { clunk, dialClick, doorPop, setRumble } from '../atelier/sound.ts';

const SOCK = 1; // two of the same: Heel Yeah
const DETENT = Math.PI / 6;
const SPIN_NEEDED = Math.PI * 2.2; // a real spin is more than one full turn
const LOST = [2, 5, 3, 6, 4, 1, 2, 3];

/* The hero washer: drag the drum (or the dial) to spin it. Two matching socks tumble inside.
   When it stops after a real spin, the door pops and only one sock comes back. */
export default function Washer() {
  const glassRef = useRef(null);
  const cvRef = useRef(null);
  const dialRef = useRef(null);
  const holesRef = useRef(null);
  const sim = useRef(null);
  const [done, setDone] = useState(false);
  const [open, setOpen] = useState(false); // the door, after the spin
  // "make spin obvious": the dial wobbles and the SPIN ME sticker bobs until the first spin
  // interaction; the sticker goes once a spin has completed (with reduced motion it simply stays)
  const rootRef = useRef(null);
  const [touched, setTouched] = useState(false);
  const [spunOnce, setSpunOnce] = useState(false);
  useEffect(() => {
    if (done) setSpunOnce(true);
  }, [done]);

  // make room for the result slip, so it never sits on what's around it: desktop — the hero grows
  // below (nothing above moves); phones — the polaroid stays exactly where it was on the machine
  const polaroidTop = useRef(null);
  useEffect(() => {
    const root = rootRef.current;
    const pol = root?.closest('.hero2__machine')?.querySelector('.hero2__polaroid');
    if (pol && !done) polaroidTop.current = pol.getBoundingClientRect().top + window.scrollY;
  });
  useEffect(() => {
    const root = rootRef.current;
    const hero = root?.closest('.hero2');
    const pol = root?.closest('.hero2__machine')?.querySelector('.hero2__polaroid');
    if (!root || !hero) return undefined;
    if (!done) {
      hero.style.marginBottom = '';
      if (pol) pol.style.translate = '';
      return undefined;
    }
    if (!open) return undefined; // measure once the door (and its slip offset) is set
    const raf = requestAnimationFrame(() => {
      const out = root.querySelector('.washer__out');
      if (!out) return;
      if (window.matchMedia('(max-width: 767px)').matches) {
        if (pol && polaroidTop.current != null) {
          pol.style.translate = '';
          const now = pol.getBoundingClientRect().top + window.scrollY;
          pol.style.translate = `0 ${Math.round(polaroidTop.current - now)}px`;
        }
      } else {
        const slip = parseFloat(root.style.getPropertyValue('--slip-top')) || 16;
        const bottom = root.getBoundingClientRect().top + root.offsetHeight + slip + out.offsetHeight;
        hero.style.marginBottom = `${Math.max(0, Math.ceil(bottom + 48 - hero.getBoundingClientRect().bottom))}px`;
      }
    });
    return () => cancelAnimationFrame(raf);
  }, [done, open]);

  // the door comes forward as far as it can without covering the nav (+16px) or leaving the screen:
  // −55° / 1.35 if it fits (overshoot included), else the most of it that does. Measured just before
  // the door opens, so the swing starts with the right numbers.
  const fitDoor = useRef(() => {});
  fitDoor.current = () => {
    const root = rootRef.current, g = root?.querySelector('.porthole__glass');
    if (!g) return;
    const navB = document.querySelector('.nav')?.getBoundingClientRect().bottom ?? 0;
    const vw = document.documentElement.clientWidth, vh = window.innerHeight;
    const box = (a, sc) => {
      g.style.transform = `rotateY(${a}deg) scale(${sc})`;
      return g.getBoundingClientRect();
    };
    const ok = (r) => r.top >= navB + 16 && r.bottom <= vh && r.left >= 0 && r.right <= vw;
    // the overshoot (~5% further on both) is the widest moment: it has to fit too
    const fits = (a, sc) => ok(box(a * 1.1, sc * 1.055));
    const prev = g.style.transition;
    g.style.transition = 'none';
    // the most dramatic swing that fits: the full −55° first (a deeper perspective tames how much the
    // near edge looms, when 900px is too much for the screen), with as much of the 1.35 pop as fits
    const porthole = g.parentElement?.closest('.porthole') || root.querySelector('.porthole');
    const setP = (P) => porthole && (porthole.style.perspective = `${P}px`);
    let pick = null;
    for (let a = -55; a <= -20 && !pick; a += 5)
      for (const P of [900, 1200, 1600, 2200, 3000]) {
        setP(P);
        let sc = 1.35;
        while (sc >= 1.05 && !fits(a, sc)) sc -= 0.03;
        if (sc >= 1.05) {
          pick = [a, +sc.toFixed(2), P];
          break;
        }
      }
    if (!pick) {
      setP(900);
      pick = [-15, 1.02, 900];
    }
    // the result slip goes below wherever the open door ends up (desktop)
    const rb = box(pick[0], pick[1]).bottom;
    const wb = root.getBoundingClientRect().bottom;
    g.style.transform = '';
    void g.offsetWidth; // back to closed, so the swing animates from shut
    g.style.transition = prev;
    setP(pick[2]);
    root.style.setProperty('--door-persp', `${pick[2]}px`);
    root.style.setProperty('--door-angle', `${pick[0]}deg`);
    root.style.setProperty('--door-scale', String(pick[1]));
    root.style.setProperty('--slip-top', `${Math.max(16, Math.ceil(rb - wb) + 16)}px`);
  };


  // ---------------------------------------------------------------- simulation
  useEffect(() => {
    const cv = cvRef.current, glass = glassRef.current;
    if (!cv || !glass) return undefined;
    const img = new Image();
    img.src = sockSrc(SOCK, 400);
    const still = reducedMotion();
    const s = {
      phi: 0, // drum angle
      w: 0, // drum angular velocity (rad/s)
      spun: 0,
      quiet: 0,
      dragging: false,
      lastDetent: 0,
      visible: false,
      running: false,
      R: 100,
      done: false,
      bodies: [
        { x: -20, y: 30, vx: 0, vy: 0, a: 0.4, va: 0 },
        { x: 25, y: 40, vx: 0, vy: 0, a: -0.8, va: 0 }
      ],
      dpr: Math.min(2, window.devicePixelRatio || 1)
    };
    sim.current = s;

    const size = () => {
      const r = glass.getBoundingClientRect();
      cv.width = Math.round(r.width * s.dpr);
      cv.height = Math.round(r.height * s.dpr);
      s.R = r.width / 2;
    };
    size();
    const ro = new ResizeObserver(size);
    ro.observe(glass);

    const draw = () => {
      const g = cv.getContext('2d');
      const { R, dpr } = s;
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      g.clearRect(0, 0, R * 2, R * 2);
      if (!img.complete) return;
      const h = R * 0.62, w = h * 0.8;
      for (const [i, b] of s.bodies.entries()) {
        if (s.done && i === 1) continue; // the other one is already gone
        if (s.out && i === 0) continue; // and this one is outside now
        g.save();
        g.translate(R + b.x, R + b.y);
        g.rotate(b.a);
        g.drawImage(img, -w / 2, -h / 2, w, h);
        g.restore();
      }
      if (holesRef.current) holesRef.current.style.transform = `rotate(${s.phi}rad)`;
      if (dialRef.current) dialRef.current.style.transform = `rotate(${(s.phi * 0.5) % (Math.PI * 2)}rad)`;
    };

    const step = (dt) => {
      const R = s.R, r = R * 0.27, g = 1500 * (R / 160);
      if (!s.dragging) s.w *= Math.exp(-0.55 * dt);
      s.phi += s.w * dt;
      s.spun += Math.abs(s.w) * dt;
      // the dial clicks through its detents
      const d = Math.floor(s.phi / DETENT);
      if (d !== s.lastDetent) {
        s.lastDetent = d;
        dialClick();
      }
      const [a, b] = s.bodies;
      for (const k of s.bodies) {
        k.vy += g * dt;
        k.x += k.vx * dt;
        k.y += k.vy * dt;
        k.a += k.va * dt;
        k.va *= 0.985;
        const dist = Math.hypot(k.x, k.y) || 1;
        if (dist > R - r) {
          const nx = k.x / dist, ny = k.y / dist;
          k.x = nx * (R - r);
          k.y = ny * (R - r);
          const vn = k.vx * nx + k.vy * ny;
          if (vn > 0) {
            k.vx -= 1.3 * vn * nx;
            k.vy -= 1.3 * vn * ny;
          }
          // the drum wall drags the sock along (that's what lifts it)
          const tx = -ny, ty = nx;
          const vt = k.vx * tx + k.vy * ty;
          const us = s.w * R;
          const f = Math.min(1, 9 * dt);
          k.vx += tx * (us - vt) * f;
          k.vy += ty * (us - vt) * f;
          k.va += (us - vt) * 0.012;
        }
      }
      // the two socks bump into each other
      const dx = b.x - a.x, dy = b.y - a.y, dd = Math.hypot(dx, dy) || 1;
      if (dd < r * 1.6) {
        const nx = dx / dd, ny = dy / dd, push = (r * 1.6 - dd) / 2;
        a.x -= nx * push;
        a.y -= ny * push;
        b.x += nx * push;
        b.y += ny * push;
        const rel = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
        if (rel < 0) {
          a.vx += rel * nx * 0.8;
          a.vy += rel * ny * 0.8;
          b.vx -= rel * nx * 0.8;
          b.vy -= rel * ny * 0.8;
        }
      }
      setRumble(Math.min(1, Math.abs(s.w) / 14));
      // done: a real spin that has come to rest
      if (!s.done && !s.dragging && s.spun > SPIN_NEEDED && Math.abs(s.w) < 0.25) {
        s.quiet += dt;
        if (s.quiet > 0.5) finish();
      } else s.quiet = 0;
    };

    let raf = 0, last = 0;
    const frame = (t) => {
      const dt = Math.min(1 / 30, (t - last) / 1000 || 0);
      last = t;
      const sub = 3;
      for (let i = 0; i < sub; i++) step(dt / sub);
      draw();
      const moving = s.dragging || Math.abs(s.w) > 0.02 || s.bodies.some((k) => Math.hypot(k.vx, k.vy) > 4);
      if (s.visible && moving) raf = requestAnimationFrame(frame);
      else {
        s.running = false;
        setRumble(0);
      }
    };
    const wake = () => {
      if (s.running || !s.visible) return;
      s.running = true;
      last = performance.now();
      raf = requestAnimationFrame(frame);
    };
    s.wake = wake;

    function finish() {
      s.done = true;
      setRumble(0);
      doorPop();
      setDone(true);
      setTimeout(() => {
        s.out = true;
        fitDoor.current();
        setOpen(true);
        clunk(); // the door swings out and comes forward
        draw();
      }, 120);
    }
    s.finish = finish;

    // physics only while the hero is on screen
    const io = new IntersectionObserver(([e]) => {
      s.visible = e.isIntersecting;
      if (s.visible) {
        // settle the socks at the bottom once
        if (!s.settled) {
          for (let i = 0; i < 240; i++) step(1 / 120);
          s.settled = true;
          draw();
        }
        wake();
      } else setRumble(0);
    });
    io.observe(glass);
    img.onload = draw;

    // ---------------------------------------------------------------- input: drag the drum
    const angleAt = (e) => {
      const r = glass.getBoundingClientRect();
      return Math.atan2(e.clientY - (r.top + r.height / 2), e.clientX - (r.left + r.width / 2));
    };
    let prev = 0, prevT = 0;
    const down = (e) => {
      if (s.done) return;
      if (still) return finish();
      s.dragging = true;
      setTouched(true);
      prev = angleAt(e);
      prevT = performance.now();
      glass.setPointerCapture(e.pointerId);
      wake();
    };
    const move = (e) => {
      if (!s.dragging) return;
      const a = angleAt(e);
      let d = a - prev;
      if (d > Math.PI) d -= Math.PI * 2;
      if (d < -Math.PI) d += Math.PI * 2;
      const now = performance.now();
      const dt = Math.max(0.008, (now - prevT) / 1000);
      s.w = s.w * 0.6 + Math.max(-28, Math.min(28, d / dt)) * 0.4;
      prev = a;
      prevT = now;
    };
    const up = () => (s.dragging = false);
    glass.addEventListener('pointerdown', down);
    glass.addEventListener('pointermove', move);
    glass.addEventListener('pointerup', up);
    glass.addEventListener('pointercancel', up);

    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      ro.disconnect();
      setRumble(0);
      glass.removeEventListener('pointerdown', down);
      glass.removeEventListener('pointermove', move);
      glass.removeEventListener('pointerup', up);
      glass.removeEventListener('pointercancel', up);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /** the dial: drag it, or use the keyboard */
  const kick = useCallback((dw) => {
    const s = sim.current;
    if (!s || s.done) return;
    setTouched(true);
    if (reducedMotion()) return s.finish();
    s.w = Math.max(-28, Math.min(28, s.w + dw));
    s.wake();
  }, []);
  const onDialKey = (e) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowUp' || e.key === ' ') {
      e.preventDefault();
      kick(4);
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
      e.preventDefault();
      kick(-4);
    }
  };
  const dialDrag = useRef(null);
  const onDialDown = (e) => {
    setTouched(true);
    e.currentTarget.setPointerCapture(e.pointerId);
    dialDrag.current = { x: e.clientX, t: performance.now() };
  };
  const onDialMove = (e) => {
    const d = dialDrag.current;
    if (!d) return;
    const now = performance.now();
    kick(((e.clientX - d.x) / Math.max(8, now - d.t)) * 6);
    dialDrag.current = { x: e.clientX, t: now };
  };
  const onDialUp = () => (dialDrag.current = null);

  const again = () => {
    const s = sim.current;
    if (!s) return;
    s.done = false;
    s.out = false;
    s.spun = 0;
    s.quiet = 0;
    // both socks are back in the drum (don't ask)
    s.bodies = [
      { x: -20, y: s.R * 0.3, vx: 0, vy: 0, a: 0.4, va: 0 },
      { x: 25, y: s.R * 0.32, vx: 0, vy: 0, a: -0.8, va: 0 }
    ];
    setOpen(false);
    setDone(false);
    s.wake();
  };

  return (
    <div ref={rootRef} className={`washer ${open ? 'is-open' : ''} ${touched ? 'is-touched' : ''} ${spunOnce ? 'has-spun' : ''}`}>
      <div className="machine">
        <span className="spinme" aria-hidden="true">
          <span className="spinme__label">Spin me</span>
          {/* a hand-drawn arrow, curling down and left onto the dial */}
          <svg className="spinme__arrow" viewBox="0 0 70 46" fill="none" strokeLinecap="round" strokeLinejoin="round">
            <path d="M64 6c-6 18-22 30-50 31" />
            <path d="M22 28l-9 9 11 5" />
          </svg>
        </span>
        <div className="machine__panel">
          <button
            ref={dialRef}
            type="button"
            className="machine__knob"
            role="slider"
            aria-label="Washer dial: drag, or press the arrow keys or Space, to spin the drum"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={done ? 100 : 0}
            aria-valuetext={done ? 'Spin complete' : 'Ready'}
            onKeyDown={onDialKey}
            onPointerDown={onDialDown}
            onPointerMove={onDialMove}
            onPointerUp={onDialUp}
            onPointerCancel={onDialUp}
          >
            <i />
            <svg className="machine__knob-icon" viewBox="0 0 24 24" fill="none" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M19 12a7 7 0 1 1-2.05-4.95" />
              <path d="M19 4v4h-4" />
            </svg>
          </button>
          <span className="machine__screen" aria-live="polite">
            {done ? 'DONE · 1 SOCK' : 'DRAG TO SPIN'}
          </span>
          <span className="machine__lights" aria-hidden="true">
            <i />
            <i />
            <i />
          </span>
        </div>
        <div className="porthole">
          <Peek
            className="porthole__glass"
            r={64}
            altClassName="porthole__lost"
            alt={
              <>
                {LOST.map((n, i) => (
                  <img key={i} src={sockSrc(n, 400)} alt="" style={{ '--i': i }} />
                ))}
                <b>lost socks</b>
              </>
            }
          >
            <svg ref={holesRef} className="drum-holes" viewBox="0 0 200 200" aria-hidden="true">
              {[34, 56, 78, 96].map((r, k) => (
                <circle key={r} cx="100" cy="100" r={r} strokeDasharray={`${1.3 + k * 0.5} ${6 + k * 2.4}`} />
              ))}
            </svg>
            <canvas
              ref={(el) => {
                cvRef.current = el;
                glassRef.current = el?.parentElement ?? null;
              }}
              className="porthole__drum"
              aria-label="The washer drum with two matching socks inside. Drag to spin it."
            />
            <span className="porthole__glare" aria-hidden="true" />
          </Peek>
        </div>
        <span className="machine__feet" aria-hidden="true" />
      </div>
      {!done && (
        <p className="washer__hint mobile-only" aria-hidden="true">
          drag the drum to spin ↻
        </p>
      )}

      {done && (
        <div className="washer__out" role="status">
          <span className="washer__thumb">
            <img className="washer__returned" src={sockSrc(SOCK, 400)} alt="One sock, returned by the washer." />
          </span>
          <div className="washer__text">
            <p className="washer__eyebrow">Spin complete</p>
            <p className="washer__msg">1 sock returned.</p>
            <p className="washer__links">
              <a href="#missing" className="washer__where" onClick={(e) => (e.preventDefault(), scrollTo('#missing', { offset: -80 }))}>
                Where did the other one go? ↓
              </a>
              <button type="button" className="washer__again" onClick={again}>
                Spin again ↻
              </button>
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
