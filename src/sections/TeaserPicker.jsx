import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import Btn from '../components/Btn.jsx';
import { money, sockSrc } from '../data/products.js';
import { reducedMotion } from '../lib/scroll.js';
import { pinClick, unlockSound } from '../atelier/sound';

/* Phones: the home line-up as ONE large sock on a short line, with the six socks as split-colour
   swatches under it, then its name and price (a link to its page) and "Pull a thread →". Browsing only:
   nothing here goes in the basket. (Desktop keeps the full clothesline.)
   Drag the sock sideways: its pin slides along the line (which dips under it) and it tilts with the
   drag; let go and it springs back to the middle and swings to rest. A quick flick sends it off along
   the line and brings in the next one. One rAF loop, transforms only. */

const ROPE_Y = 12; // the line's height inside its 24px strip
const REST_DIP = 4; // the pin's weight on the line
const FLICK = 700; // px/s
const MAX_TILT = 12; // deg

export default function TeaserPicker({ items }) {
  const navigate = useNavigate();
  const [idx, setIdx] = useState(0);
  const p = items[idx];

  const lineRef = useRef(null);
  const ropeRef = useRef(null);
  const sockRef = useRef(null);
  const [w, setW] = useState(300);
  // the simulation lives in a ref: x = pin offset from the middle (px), th = tilt (deg)
  const sim = useRef({ x: 0, vx: 0, th: 0, om: 0, dip: REST_DIP, opacity: 1, mode: 'rest', drag: null, raf: 0 });

  useLayoutEffect(() => {
    const el = lineRef.current;
    if (!el) return undefined;
    const ro = new ResizeObserver(() => setW(el.clientWidth));
    ro.observe(el);
    setW(el.clientWidth);
    return () => ro.disconnect();
  }, []);

  const maxX = Math.max(0, w / 2 - 22); // the pin stops short of the posts

  const draw = useCallback(() => {
    const s = sim.current;
    const px = w / 2 + s.x;
    const y = ROPE_Y + s.dip;
    ropeRef.current?.setAttribute('d', `M10 ${ROPE_Y} Q${(10 + px) / 2} ${y} ${px} ${y} Q${(px + w - 10) / 2} ${y} ${w - 10} ${ROPE_Y}`);
    const el = sockRef.current;
    if (el) {
      el.style.transform = `translate3d(${s.x.toFixed(2)}px, ${s.dip.toFixed(2)}px, 0) rotate(${s.th.toFixed(2)}deg)`;
      el.style.opacity = s.opacity.toFixed(3);
    }
  }, [w]);

  useEffect(draw, [draw]);

  // spring back to the middle + pendulum swing; slide off / slide in for a switch
  const run = useCallback(() => {
    const s = sim.current;
    cancelAnimationFrame(s.raf);
    let last = performance.now();
    const step = (now) => {
      const dt = Math.min(0.032, (now - last) / 1000);
      last = now;
      if (s.mode === 'spring') {
        const k = 140, c = 2 * Math.sqrt(k) * 0.85;
        const ax = -k * s.x - c * s.vx;
        s.vx += ax * dt;
        s.x += s.vx * dt;
        // a pendulum hung from an accelerating pin: it lags the pin, then swings to rest in ~1s
        const K = 70, C = 5.2;
        const al = -K * s.th - C * s.om - ax * 0.018;
        s.om += al * dt;
        s.th = Math.max(-MAX_TILT, Math.min(MAX_TILT, s.th + s.om * dt));
        s.dip += (REST_DIP - s.dip) * Math.min(1, dt * 10);
        if (Math.abs(s.x) < 0.2 && Math.abs(s.vx) < 3 && Math.abs(s.th) < 0.15 && Math.abs(s.om) < 2) {
          Object.assign(s, { x: 0, vx: 0, th: 0, om: 0, dip: REST_DIP, mode: 'rest' });
          draw();
          return;
        }
      } else if (s.mode === 'out') {
        // along the line and off its end
        s.vx += Math.sign(s.vx || 1) * 2600 * dt;
        s.x += s.vx * dt;
        s.th = Math.max(-MAX_TILT, Math.min(MAX_TILT, s.th + (Math.sign(s.vx) * -MAX_TILT - s.th) * Math.min(1, dt * 12)));
        s.opacity = Math.max(0, 1 - Math.max(0, Math.abs(s.x) - maxX) / 60);
        if (s.opacity <= 0) {
          s.mode = 'swap';
          draw();
          return;
        }
      }
      draw();
      s.raf = requestAnimationFrame(step);
    };
    s.raf = requestAnimationFrame(step);
  }, [draw, maxX]);

  useEffect(() => () => cancelAnimationFrame(sim.current.raf), []);

  /** switch to sock k, sliding the current one off towards `dir` (−1 left, +1 right) */
  const go = useCallback(
    (k, dir) => {
      const s = sim.current;
      const next = (k + items.length) % items.length;
      if (next === idx) return;
      pinClick();
      if (reducedMotion()) {
        // no swing: a quick crossfade
        const el = sockRef.current;
        el?.animate([{ opacity: 0.2 }, { opacity: 1 }], { duration: 220, easing: 'ease-out' });
        Object.assign(s, { x: 0, vx: 0, th: 0, om: 0, dip: REST_DIP, opacity: 1, mode: 'rest' });
        setIdx(next);
        draw();
        return;
      }
      s.mode = 'out';
      s.vx = dir * Math.max(500, Math.abs(s.vx));
      run();
      const wait = () => {
        if (s.mode !== 'swap') return requestAnimationFrame(wait);
        setIdx(next);
        // the new one comes in from the other end of the line, already moving, then springs + swings
        Object.assign(s, { x: -dir * maxX, vx: dir * 900, th: -dir * 6, om: 0, opacity: 1, mode: 'spring' });
        run();
        return 0;
      };
      requestAnimationFrame(wait);
    },
    [idx, items.length, run, draw, maxX]
  );

  // ------------------------------------------------------------------ pointer: a light drag
  const onDown = (e) => {
    if (e.button && e.button !== 0) return;
    unlockSound();
    const s = sim.current;
    if (s.mode === 'out' || s.mode === 'swap') return;
    cancelAnimationFrame(s.raf);
    s.mode = 'drag';
    s.drag = { id: e.pointerId, x0: e.clientX, y0: e.clientY, start: s.x, t: performance.now(), lastX: e.clientX, v: 0, moved: false };
  };
  const onMove = (e) => {
    const s = sim.current, d = s.drag;
    if (s.mode !== 'drag' || !d || d.id !== e.pointerId) return;
    const dx = e.clientX - d.x0;
    // a vertical swipe is a page scroll, not a drag
    if (!d.moved) {
      if (Math.abs(e.clientY - d.y0) > 10 && Math.abs(e.clientY - d.y0) > Math.abs(dx)) {
        s.mode = 'spring';
        s.drag = null;
        run();
        return;
      }
      if (Math.abs(dx) < 4) return;
      d.moved = true;
      e.currentTarget.setPointerCapture?.(e.pointerId);
    }
    const now = performance.now();
    const dt = Math.max(1, now - d.t) / 1000;
    d.v = d.v * 0.6 + ((e.clientX - d.lastX) / dt) * 0.4;
    d.t = now;
    d.lastX = e.clientX;
    s.x = Math.max(-maxX, Math.min(maxX, d.start + dx));
    s.vx = d.v;
    // the sock trails the pin: dragging right swings its foot left (a clockwise tilt)
    const target = Math.max(-MAX_TILT, Math.min(MAX_TILT, d.v * 0.02));
    s.th += (target - s.th) * 0.35;
    s.dip = REST_DIP + 3 + Math.min(3, Math.abs(d.v) / 400);
    draw();
  };
  const onUp = (e) => {
    const s = sim.current, d = s.drag;
    if (s.mode !== 'drag' || !d || d.id !== e.pointerId) return;
    s.drag = null;
    if (d.moved && Math.abs(d.v) > FLICK && Math.abs(e.clientX - d.x0) > 16) {
      // flick left → the next sock; flick right → the previous one
      go(idx + (d.v < 0 ? 1 : -1), Math.sign(d.v));
      return;
    }
    if (!d.moved) {
      // a plain tap: browsing only, the sock opens its own page
      s.mode = 'rest';
      navigate(`/socks/${p.slug}`);
      return;
    }
    s.mode = 'spring';
    s.om = s.vx * -0.04;
    run();
  };

  return (
    <div className="tpick" style={{ '--sock': p.color }}>
      <div className="tpick__stage" onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}>
        <div className="tpick__line" ref={lineRef} aria-hidden="true">
          <svg className="tpick__rope" width={w} height="24" viewBox={`0 0 ${w} 24`}>
            <path ref={ropeRef} d={`M10 ${ROPE_Y} H${w - 10}`} />
            <circle cx="10" cy={ROPE_Y} r="8" />
            <circle cx={w - 10} cy={ROPE_Y} r="8" />
          </svg>
        </div>
        <figure className="tpick__sock" ref={sockRef}>
          <svg className="tpick__peg" viewBox="0 0 26 54" aria-hidden="true">
            <rect x="3" y="2" width="20" height="50" rx="7" />
            <path d="M13 6v42" />
            <circle cx="13" cy="20" r="3.2" />
          </svg>
          <img src={sockSrc(p.n, 400)} alt={`${p.name}: one sock, hole included. Drag it sideways, or flick it for the next one.`} width="400" height="500" draggable="false" />
        </figure>
      </div>

      <div className="tpick__swatches" role="radiogroup" aria-label="Pick a sock">
        {items.map((x, k) => (
          <button
            key={x.slug}
            type="button"
            role="radio"
            aria-checked={k === idx}
            aria-label={x.name}
            className={`tpick__swatch ${k === idx ? 'is-on' : ''}`}
            style={{ '--a': x.color, '--b': x.accent }}
            onClick={() => go(k, k > idx ? -1 : 1)}
          >
            <span />
          </button>
        ))}
      </div>

      <Link to={`/socks/${p.slug}`} className="tpick__info" aria-label={`${p.name}, ${money(p.price)} plus your labor. Opens the sock's page.`}>
        <span className="tpick__name">{p.name}</span>
        <span className="tpick__price">{money(p.price)} + your labor</span>
      </Link>
      <div className="tpick__actions">
        <Btn to={`/atelier?sock=${p.slug}`} variant="thread" tilt={0} className="tpick__pull">
          Pull a thread →
        </Btn>
      </div>
    </div>
  );
}

