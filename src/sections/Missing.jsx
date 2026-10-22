import { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import Btn from '../components/Btn.jsx';
import BounceText from '../components/motion/BounceText.jsx';
import { sockSrc } from '../data/products.js';
import { reducedMotion } from '../lib/scroll.js';
import { rip, tap } from '../atelier/sound.ts';

const TABS = 8;
const PHONE = '1-800-ONE-SOCK';
const SNAP = 74; // px of pull before the paper gives
const G = 2600; // px/s²

/* The poster's phone tabs tear off for real: pull one down (it resists, then snaps), it falls,
   spins, lands on the floor, and can be picked up and tossed again. */
export default function Missing() {
  const [torn, setTorn] = useState(() => Array(TABS).fill(false));
  const [pieces, setPieces] = useState([]);
  const sec = useRef(null);
  const bodies = useRef(new Map()); // id → physics state
  const els = useRef(new Map()); // id → element
  const raf = useRef(0);
  const pull = useRef(null);
  const left = torn.filter((t) => !t).length;

  // ---------------------------------------------------------------- physics for torn tabs
  const loop = useCallback(() => {
    cancelAnimationFrame(raf.current);
    let last = performance.now();
    const frame = (now) => {
      const dt = Math.min(1 / 30, (now - last) / 1000);
      last = now;
      const box = sec.current?.getBoundingClientRect();
      if (!box) return;
      let moving = false;
      for (const [id, b] of bodies.current) {
        if (!b.held && !b.rest) {
          b.vy += G * dt;
          b.vx *= 0.995;
          b.x += b.vx * dt;
          b.y += b.vy * dt;
          b.a += b.va * dt;
          // half-height of the rotated tab, so it lands on its edge
          const hh = Math.abs(Math.cos(b.a)) * b.h * 0.5 + Math.abs(Math.sin(b.a)) * b.w * 0.5;
          const hw = Math.abs(Math.sin(b.a)) * b.h * 0.5 + Math.abs(Math.cos(b.a)) * b.w * 0.5;
          const floor = box.height - 10 - hh;
          if (b.x < hw) (b.x = hw), (b.vx = Math.abs(b.vx) * 0.5);
          if (b.x > box.width - hw) (b.x = box.width - hw), (b.vx = -Math.abs(b.vx) * 0.5);
          if (b.y >= floor) {
            if (b.vy > 420) tap();
            b.y = floor;
            b.vy = -b.vy * 0.22;
            b.vx *= 0.7;
            b.va *= 0.6;
            // paper settles flat on its side
            const flat = Math.round(b.a / (Math.PI / 2)) * (Math.PI / 2) || Math.PI / 2;
            b.a += (flat - b.a) * 0.25;
            if (Math.abs(b.vy) < 60 && Math.abs(b.vx) < 20) {
              b.vy = 0;
              b.vx = 0;
              b.va = 0;
              b.a = flat;
              b.rest = true;
            }
          }
        }
        if (!b.rest || b.held) moving = true;
        const el = els.current.get(id);
        if (el) el.style.transform = `translate(${(b.x - b.w / 2).toFixed(1)}px, ${(b.y - b.h / 2).toFixed(1)}px) rotate(${b.a.toFixed(3)}rad)`;
      }
      if (moving) raf.current = requestAnimationFrame(frame);
    };
    raf.current = requestAnimationFrame(frame);
  }, []);
  useEffect(() => () => cancelAnimationFrame(raf.current), []);

  /** detach tab i at its current on-screen rect; returns the new body */
  const detach = useCallback(
    (i, rect, vel = { x: 0, y: 0 }, held = null) => {
      const box = sec.current.getBoundingClientRect();
      const id = `${i}-${Date.now()}`;
      const still = reducedMotion();
      const b = {
        w: rect.width,
        h: rect.height,
        x: rect.left - box.left + rect.width / 2,
        y: rect.top - box.top + rect.height / 2,
        vx: vel.x,
        vy: vel.y,
        a: 0,
        va: still ? 0 : (Math.random() - 0.5) * 9 + vel.x * 0.01,
        held,
        rest: false
      };
      if (still) {
        b.y = box.height - 10 - b.w / 2;
        b.a = Math.PI / 2;
        b.rest = true;
      }
      bodies.current.set(id, b);
      setPieces((p) => [...p, id]);
      setTorn((t) => t.map((v, k) => (k === i ? true : v)));
      rip(0.9 + Math.random() * 0.3);
      if (!still) loop();
      return [id, b];
    },
    [loop]
  );

  // ---------------------------------------------------------------- pulling an attached tab
  const onTabDown = (i) => (e) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    pull.current = { i, x0: e.clientX, y0: e.clientY, el: e.currentTarget, last: { x: e.clientX, y: e.clientY, t: performance.now() }, v: { x: 0, y: 0 } };
  };
  const onTabMove = (e) => {
    const p = pull.current;
    if (!p) return;
    const now = performance.now();
    const dt = Math.max(0.008, (now - p.last.t) / 1000);
    p.v = { x: (e.clientX - p.last.x) / dt, y: (e.clientY - p.last.y) / dt };
    p.last = { x: e.clientX, y: e.clientY, t: now };
    const dy = Math.max(0, e.clientY - p.y0);
    const dx = e.clientX - p.x0;
    if (dy > SNAP) {
      // it gives: the tab comes away in your hand
      const r = p.el.getBoundingClientRect();
      p.el.style.transform = '';
      const [id, b] = detach(p.i, r, { x: 0, y: 0 }, { dx: e.clientX - (r.left + r.width / 2), dy: e.clientY - (r.top + r.height / 2) });
      pull.current = { held: id, b, last: p.last, v: p.v };
      return;
    }
    // resistance: the paper stretches a little, then a little less
    const s = 22 * (1 - Math.exp(-dy / 40));
    p.el.style.transform = `translateY(${s.toFixed(1)}px) rotate(${Math.max(-6, Math.min(6, dx * 0.06)).toFixed(2)}deg)`;
  };
  const onTabUp = () => {
    const p = pull.current;
    pull.current = null;
    if (p?.el) {
      p.el.style.transition = 'transform 0.35s cubic-bezier(.34,1.56,.64,1)';
      p.el.style.transform = '';
      setTimeout(() => p.el && (p.el.style.transition = ''), 360);
    }
    if (p?.held) release(p);
  };
  const tearByKey = (i) => (e) => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    e.preventDefault();
    detach(i, e.currentTarget.getBoundingClientRect(), { x: (Math.random() - 0.5) * 300, y: -200 });
  };

  // ---------------------------------------------------------------- holding / tossing a torn tab
  useEffect(() => {
    const move = (e) => {
      const p = pull.current;
      if (!p?.held) return;
      const b = bodies.current.get(p.held);
      const box = sec.current?.getBoundingClientRect();
      if (!b || !box) return;
      const now = performance.now();
      const dt = Math.max(0.008, (now - p.last.t) / 1000);
      p.v = { x: (e.clientX - p.last.x) / dt, y: (e.clientY - p.last.y) / dt };
      p.last = { x: e.clientX, y: e.clientY, t: now };
      b.x = e.clientX - box.left - b.held.dx;
      b.y = e.clientY - box.top - b.held.dy;
      b.a += (p.v.x * 0.00004 - b.a * 0.05);
    };
    const up = () => {
      const p = pull.current;
      if (p?.held) release(p);
      pull.current = null;
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    return () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function release(p) {
    const b = bodies.current.get(p.held);
    if (!b) return;
    const cap = (v) => Math.max(-2600, Math.min(2600, v));
    b.vx = cap(p.v.x) * 0.9;
    b.vy = cap(p.v.y) * 0.9;
    b.va = b.vx * 0.012 + (Math.random() - 0.5) * 3;
    b.held = null;
    b.rest = false;
    loop();
  }

  const grabPiece = (id) => (e) => {
    const b = bodies.current.get(id);
    const box = sec.current?.getBoundingClientRect();
    if (!b || !box || reducedMotion()) return;
    e.preventDefault();
    b.held = { dx: e.clientX - box.left - b.x, dy: e.clientY - box.top - b.y };
    b.rest = false;
    pull.current = { held: id, last: { x: e.clientX, y: e.clientY, t: performance.now() }, v: { x: 0, y: 0 } };
    loop();
  };

  const reprint = () => {
    setTorn(Array(TABS).fill(false));
    setPieces([]);
    bodies.current.clear();
  };

  return (
    <section ref={sec} id="missing" className="missing" aria-labelledby="missing-title">
      <div className="missing__inner">
        <div className="poster">
          <span className="poster__pin poster__pin--l" aria-hidden="true" />
          <span className="poster__pin poster__pin--r" aria-hidden="true" />
          <BounceText as="h2" id="missing-title" text="MISSING" className="poster__title" />
          <p className="poster__sub">Have you seen this sock?</p>
          <div className="poster__photo">
            <img src={sockSrc(2, 800)} alt="Photocopied photo of the missing sock: blue swirls, brown heel." width="800" height="1000" loading="lazy" />
          </div>
          <dl className="poster__facts">
            <div>
              <dt>Name</dt>
              <dd>The Other One</dd>
            </div>
            <div>
              <dt>Last seen</dt>
              <dd>Dryer, Tuesday, around 4pm</dd>
            </div>
            <div>
              <dt>Answers to</dt>
              <dd>“Hey, where’s the—”</dd>
            </div>
            <div>
              <dt>Distinguishing marks</dt>
              <dd>Matches exactly one sock (ours)</dd>
            </div>
          </dl>
          <p className="poster__reward">
            Reward: <strong>$9</strong> <span>(or a sock of equal value)</span>
          </p>
          <div className="poster__tabs" role="group" aria-label={`Tear-off phone number tabs, ${left} left. Pull one down to tear it off.`}>
            {torn.map((t, i) => (
              <div className="tab" key={i}>
                {!t ? (
                  <button
                    type="button"
                    className="tab__paper"
                    onPointerDown={onTabDown(i)}
                    onPointerMove={onTabMove}
                    onPointerUp={onTabUp}
                    onPointerCancel={onTabUp}
                    onKeyDown={tearByKey(i)}
                    aria-label={`Tear off tab ${i + 1}: ${PHONE}`}
                  >
                    <span>{PHONE}</span>
                  </button>
                ) : (
                  <span className="tab__stub" aria-hidden="true" />
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="missing__side">
          <p className="kicker">Notice board</p>
          <p className="h3">If found, do not return it.</p>
          <p className="lead">It’s happier this way. And honestly, so are we. Pull a tab down to take one. Nobody has called yet.</p>
          <AnimatePresence mode="wait">
            {left === 0 ? (
              <motion.div
                key="out"
                className="missing__out"
                initial={{ scale: 0.6, rotate: -10, opacity: 0 }}
                animate={{ scale: 1, rotate: -3, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 380, damping: 12 }}
                role="status"
              >
                <p>All tabs taken. Still nobody’s called.</p>
                <Btn tone="pink" tilt={2} onClick={reprint}>
                  Print another
                </Btn>
              </motion.div>
            ) : (
              <motion.p key="count" className="missing__count" aria-live="polite" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <strong>{left}</strong> {left === 1 ? 'tab' : 'tabs'} left
              </motion.p>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* torn tabs live here, falling and lying on the floor of the section */}
      <div className="missing__floor" aria-hidden="true">
        {pieces.map((id) => (
          <span
            key={id}
            ref={(el) => (el ? els.current.set(id, el) : els.current.delete(id))}
            className="tab__piece"
            style={(() => {
              const b = bodies.current.get(id);
              return b
                ? { width: b.w, height: b.h, transform: `translate(${b.x - b.w / 2}px, ${b.y - b.h / 2}px) rotate(${b.a}rad)` }
                : undefined;
            })()}
            onPointerDown={grabPiece(id)}
          >
            <span>{PHONE}</span>
          </span>
        ))}
      </div>
    </section>
  );
}
