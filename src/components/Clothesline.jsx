import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { logoColor, money, sockSrc } from '../data/products.js';
import { useCart } from '../context/CartContext.jsx';
import { pushAccent } from '../lib/accent.js';
import { reducedMotion } from '../lib/scroll.js';
import { Plus } from './Icons.jsx';
import Peek from './Peek.jsx';
import './clothesline.css';

/* ---------------------------------------------------------------
   A slack rope (verlet chain) pinned at two posts, with socks hanging
   off pegs as damped pendulums driven by their peg's acceleration.
---------------------------------------------------------------- */
const N = 42; // rope points
const G = 2200; // px/s²
const ROPE_Y = 46;
const PEG_TOP = 18; // where the peg grips, from the top of the sock box
const MAX_PULL = 190;

/* variant: 'default' (shop), 'teaser' (home: calm, hangs straight), 'stage' (/atelier: bigger, all in view) */
function geometry(width, count, mobile, variant = 'default') {
  const fit = variant === 'stage';
  const stageW = mobile && !fit ? Math.max(width, count * 156 + 70) : width;
  // desktop: the posts sit on the container edges (the line spans the container exactly)
  const pad = mobile ? (fit ? 18 : 34) : 12;
  const slot = (stageW - pad * 2) / count;
  const maxW = fit ? 240 : mobile ? 128 : 200;
  // on a phone the stage line lets the (mostly transparent) image boxes overlap, so the socks read larger
  const sockW = Math.min(maxW, slot * (mobile ? (fit ? 1.9 : 0.82) : fit ? 0.8 : 0.7));
  const sockH = sockW * 1.25;
  const tagH = fit && mobile ? 0 : 64;
  const sag = variant === 'default' ? 0.085 : 0.05;
  // the weighted rope dips further than its resting curve: leave room so nothing below can collide
  const room = variant === 'teaser' ? 0.035 : 0;
  // room for the sag (weighted rope dips ~9% of its span) + swing
  // phones: tighter bottom margin (desktop value unchanged)
  const bottom = variant === 'teaser' ? (mobile ? 10 : 24) : mobile ? 14 : 70;
  const height = ROPE_Y + sockH + tagH + (stageW - pad * 2) * (sag + room) + bottom;
  return { stageW, pad, slot, sockW, sockH, height, slack: variant === 'default' ? 1.025 : 1.01, calm: variant !== 'default' };
}

function Sock({ p, i, refs, dragged, onHover, onQuickAdd, inCart, onPick, picked }) {
  return (
    <a
      href={`/socks/${p.slug}`}
      ref={(el) => (refs.current[i] = el)}
      className={`cl__sock ${picked ? 'is-picked' : ''}`}
      style={{ '--sock': p.color }}
      draggable="false"
      aria-label={
        onPick ? `${p.name}, ${p.subtitle}. Take it down and pull its thread.` : `${p.name}, ${p.subtitle}, ${money(p.price)}. Opens the product page.`
      }
      onPointerEnter={() => onHover(p)}
      onPointerLeave={() => onHover(null)}
      onFocus={() => onHover(p)}
      onBlur={() => onHover(null)}
      onClick={(e) => {
        e.preventDefault();
        if (dragged.current) return;
        if (onPick) onPick(p, e.currentTarget);
        else onQuickAdd(null, p); // null → navigate
      }}
      onKeyDown={(e) => e.key === ' ' && (e.preventDefault(), onQuickAdd(null, p))}
    >
      <span className="cl__body">
      <svg className="cl__peg" viewBox="0 0 26 54" aria-hidden="true">
        <rect x="3" y="2" width="20" height="50" rx="7" />
        <path d="M13 6v42" />
        <circle cx="13" cy="20" r="3.2" />
      </svg>
      <img className="cl__img" src={sockSrc(p.n, 400)} alt="" width="400" height="500" draggable="false" />
      <span className="cl__tag">
        <Peek
          as="span"
          className="cl__tag-text"
          r={30}
          altClassName="cl__tag-alt"
          alt={
            <>
              Your wage
              <br />
              $0.00
            </>
          }
        >
          <span className="cl__tag-name">{p.name}</span>
          <span className="cl__tag-price">{money(p.price)}</span>
        </Peek>
        <button
          type="button"
          className="cl__add"
          aria-label={inCart ? `${p.name} is already in your basket` : `Add ${p.name} to basket`}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onQuickAdd(e.currentTarget.closest('.cl__sock')?.querySelector('.cl__img'), p);
          }}
        >
          <Plus />
        </button>
      </span>
      </span>
    </a>
  );
}

/* Atelier mode (home page): `onPick` takes a sock down instead of opening its page; `picked`
   freezes that sock's peg so it can be lifted forward; `apiRef` exposes the live rope. */
export default function Clothesline({ items, onHover, className = '', onPick, picked = null, apiRef, variant = 'default' }) {
  const wrap = useRef(null);
  const stage = useRef(null);
  const rope = useRef(null);
  const shadow = useRef(null);
  const sockEls = useRef([]);
  const dragged = useRef(false);
  const navigate = useNavigate();
  const cart = useCart();
  const [geo, setGeo] = useState(null);
  const release = useRef(null);
  const pickedRef = useRef(picked);
  pickedRef.current = picked;

  const hover = (p) => {
    release.current?.();
    release.current = p ? pushAccent(logoColor(p)) : null;
    onHover?.(p);
  };
  useEffect(() => () => release.current?.(), []);

  const quick = (imgEl, p) => {
    if (!imgEl) navigate(`/socks/${p.slug}`);
    else cart.add(p.slug, imgEl);
  };

  // measure
  useLayoutEffect(() => {
    const el = wrap.current;
    if (!el) return undefined;
    const measure = () => {
      const w = el.clientWidth;
      const mobile = window.matchMedia('(max-width: 760px)').matches;
      setGeo((g) => {
        const next = { ...geometry(w, items.length, mobile, variant), mobile, width: w };
        return g && g.stageW === next.stageW && g.height === next.height ? g : next;
      });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [items.length, variant]);

  // simulate
  useEffect(() => {
    if (!geo) return undefined;
    const { stageW, pad, sockW, sockH, slot, slack, calm } = geo;
    const still = reducedMotion();
    const x0 = pad;
    const x1 = stageW - pad;
    const seg = ((x1 - x0) / (N - 1)) * slack; // a little slack → sag
    const px = new Float32Array(N);
    const py = new Float32Array(N);
    const ox = new Float32Array(N);
    const oy = new Float32Array(N);
    const weight = new Float32Array(N);
    for (let k = 0; k < N; k++) {
      const t = k / (N - 1);
      px[k] = ox[k] = x0 + (x1 - x0) * t;
      // start already sagging so the first frame isn't a twang
      py[k] = oy[k] = ROPE_Y + Math.sin(Math.PI * t) * (x1 - x0) * (calm ? 0.035 : 0.06);
    }
    const pins = items.map((_, i) => {
      const x = pad + slot * (i + 0.5);
      const k = Math.round(((x - x0) / (x1 - x0)) * (N - 1));
      weight[k] = 1.6;
      return k;
    });
    const socks = items.map((_, i) => ({ th: calm ? 0 : (i % 2 ? 1 : -1) * 0.04, om: 0, vx: 0, vy: 0, rest: null }));
    const L = sockH * 0.48;
    let drag = -1;
    const pickedIndex = () => (pickedRef.current ? items.findIndex((p) => p.slug === pickedRef.current) : -1);
    if (apiRef) {
      apiRef.current = {
        stage: stage.current,
        sockW,
        sockH,
        ropeY: ROPE_Y,
        pegTop: PEG_TOP,
        /** rope height at stage x (linear between chain points) */
        ropeYAt(x) {
          const t = Math.max(0, Math.min(N - 1.001, ((x - x0) / (x1 - x0)) * (N - 1)));
          const k = Math.floor(t);
          return py[k] + (py[k + 1] - py[k]) * (t - k);
        },
        /** where sock i's peg is right now (stage coords) */
        pegOf(i) {
          return { x: px[pins[i]], y: py[pins[i]] };
        },
        /** a stitch popped: the line shivers around x */
        pluck(x, amount = 1) {
          if (still) return;
          for (let k = 1; k < N - 1; k++) {
            const f = Math.exp(-Math.pow((px[k] - x) / ((x1 - x0) * 0.18), 2));
            oy[k] = py[k] - 1.6 * amount * f * (k % 2 ? 1 : -0.6);
          }
        }
      };
    }
    let grab = { x: 0, y: 0 };
    let pointer = { x: 0, y: 0, vx: 0, vy: 0, t: 0, inside: false };
    let down = { x: 0, y: 0, t: 0 };
    // capture only once it's really a drag, so a plain click still reaches the sock link
    let capId = null;

    const draw = () => {
      let d = `M${px[0].toFixed(1)} ${py[0].toFixed(1)}`;
      for (let k = 1; k < N; k++) d += `L${px[k].toFixed(1)} ${py[k].toFixed(1)}`;
      rope.current?.setAttribute('d', d);
      shadow.current?.setAttribute('d', d);
      pins.forEach((k, i) => {
        const el = sockEls.current[i];
        if (!el) return;
        el.style.transform = `translate3d(${(px[k] - sockW / 2).toFixed(1)}px, ${(py[k] - PEG_TOP).toFixed(1)}px, 0) rotate(${socks[i].th.toFixed(4)}rad)`;
      });
    };

    const step = (dt, time) => {
      // rope: verlet integrate
      const pk = pickedIndex();
      for (let k = 1; k < N - 1; k++) {
        if (drag >= 0 && pins[drag] === k) continue;
        if (pk >= 0 && pins[pk] === k) {
          ox[k] = px[k];
          oy[k] = py[k];
          continue;
        }
        const vx = (px[k] - ox[k]) * 0.985;
        const vy = (py[k] - oy[k]) * 0.985;
        ox[k] = px[k];
        oy[k] = py[k];
        px[k] += vx;
        py[k] += vy + G * (1 + weight[k]) * dt * dt * 0.5;
      }
      // rope can stretch-limit but not push (it's a rope)
      for (let it = 0; it < 16; it++) {
        for (let k = 0; k < N - 1; k++) {
          const dx = px[k + 1] - px[k];
          const dy = py[k + 1] - py[k];
          const dist = Math.hypot(dx, dy) || 1e-6;
          if (dist <= seg) continue;
          const diff = (dist - seg) / dist;
          const aFixed = k === 0 || (drag >= 0 && pins[drag] === k) || (pk >= 0 && pins[pk] === k);
          const bFixed = k + 1 === N - 1 || (drag >= 0 && pins[drag] === k + 1) || (pk >= 0 && pins[pk] === k + 1);
          if (aFixed && bFixed) continue;
          const wa = aFixed ? 0 : bFixed ? 1 : 0.5;
          const wb = bFixed ? 0 : aFixed ? 1 : 0.5;
          px[k] += dx * diff * wa;
          py[k] += dy * diff * wa;
          px[k + 1] -= dx * diff * wb;
          py[k + 1] -= dy * diff * wb;
        }
      }
      // socks: pendulums on accelerating pivots
      pins.forEach((k, i) => {
        const s = socks[i];
        if (i === pk) {
          // lifted off the line: hold still while it comes forward
          s.th *= 0.8;
          s.om = 0;
          return;
        }
        const vx = (px[k] - ox[k]) / dt;
        const vy = (py[k] - oy[k]) / dt;
        const ax = (vx - s.vx) / dt;
        const ay = (vy - s.vy) / dt;
        s.vx = vx;
        s.vy = vy;
        const wind = (Math.sin(time * 1.3 + i * 1.7) * 0.5 + Math.sin(time * 0.53 + i) * 0.35) * (calm ? 0.18 : 1);
        const acc = -((G + ay) * Math.sin(s.th) + ax * Math.cos(s.th)) / L - 2.6 * s.om + wind;
        s.om = Math.max(-14, Math.min(14, s.om + acc * dt));
        s.th = Math.max(-1.25, Math.min(1.25, s.th + s.om * dt));
      });
    };

    draw();
    if (still) {
      // settle once, then freeze
      for (let n = 0; n < 600; n++) step(1 / 120, 0);
      socks.forEach((s) => ((s.th = 0), (s.om = 0)));
      draw();
      return undefined;
    }

    // pointer handling (coords in stage space)
    const st = stage.current;
    const toStage = (e) => {
      const r = st.getBoundingClientRect();
      return { x: e.clientX - r.left, y: e.clientY - r.top };
    };
    const onMove = (e) => {
      const p = toStage(e);
      const now = performance.now();
      const dt = Math.max(8, now - pointer.t) / 1000;
      pointer = { x: p.x, y: p.y, vx: (p.x - pointer.x) / dt, vy: (p.y - pointer.y) / dt, t: now, inside: true };
      if (drag >= 0) {
        const k = pins[drag];
        const rest = socks[drag].rest;
        let tx = p.x - grab.x;
        let ty = p.y - grab.y;
        const dx = tx - rest.x;
        const dy = ty - rest.y;
        const dist = Math.hypot(dx, dy);
        if (dist > MAX_PULL) {
          // rubber-band resistance past the limit
          const over = MAX_PULL + (dist - MAX_PULL) * 0.25;
          tx = rest.x + (dx / dist) * over;
          ty = rest.y + (dy / dist) * over;
        }
        ox[k] = px[k];
        oy[k] = py[k];
        px[k] = tx;
        py[k] = ty;
        if (Math.hypot(e.clientX - down.x, e.clientY - down.y) > 6) {
          dragged.current = true;
          if (capId !== null) {
            st.setPointerCapture?.(capId);
            capId = null;
          }
        }
        return;
      }
      // brushing past: socks swing with the cursor's speed
      if (e.pointerType !== 'mouse') return;
      pins.forEach((k, i) => {
        const s = socks[i];
        const lx = p.x - px[k];
        const ly = p.y - py[k] + PEG_TOP;
        const c = Math.cos(-s.th);
        const sn = Math.sin(-s.th);
        const rx = lx * c - ly * sn;
        const ry = lx * sn + ly * c;
        if (Math.abs(rx) < sockW * 0.5 && ry > 0 && ry < sockH) {
          s.om += Math.max(-4, Math.min(4, pointer.vx * 0.0011)) * (ry / sockH);
        }
      });
      for (let k = 1; k < N - 1; k++) {
        if (Math.abs(px[k] - p.x) < 26 && Math.abs(py[k] - p.y) < 22) py[k] += Math.max(-6, Math.min(6, pointer.vy * 0.004));
      }
    };
    const onDown = (e) => {
      if (pickedRef.current) return;
      const i = sockEls.current.findIndex((el) => el && el.contains(e.target));
      if (i < 0 || e.target.closest('.cl__add')) return;
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      const p = toStage(e);
      const k = pins[i];
      drag = i;
      dragged.current = false;
      down = { x: e.clientX, y: e.clientY, t: performance.now() };
      grab = { x: p.x - px[k], y: p.y - py[k] };
      socks[i].rest = { x: x0 + (x1 - x0) * (k / (N - 1)), y: py[k] };
      capId = e.pointerId;
      st.classList.add('is-dragging');
    };
    const onUp = (e) => {
      if (drag < 0) return;
      // pointer events land at ~60Hz but the sim steps at 120Hz — halve the carried fling
      const k = pins[drag];
      ox[k] = px[k] - (px[k] - ox[k]) * 0.5;
      oy[k] = py[k] - (py[k] - oy[k]) * 0.5;
      drag = -1;
      capId = null;
      if (st.hasPointerCapture?.(e.pointerId)) st.releasePointerCapture(e.pointerId);
      st.classList.remove('is-dragging');
      // let the click handler read `dragged` first
      setTimeout(() => (dragged.current = false), 0);
    };
    const onCancel = (e) => {
      // the browser took over (horizontal swipe on mobile): drop the peg
      onUp(e);
      dragged.current = false;
    };
    st.addEventListener('pointermove', onMove);
    st.addEventListener('pointerdown', onDown);
    st.addEventListener('pointerup', onUp);
    st.addEventListener('pointercancel', onCancel);

    // loop only while visible
    let raf = 0;
    let running = false;
    let last = 0;
    let acc = 0;
    let time = 0;
    const H = 1 / 120;
    const frame = (now) => {
      raf = requestAnimationFrame(frame);
      const dt = Math.min(0.05, (now - last) / 1000 || 0);
      last = now;
      acc += dt;
      while (acc >= H) {
        step(H, time);
        time += H;
        acc -= H;
      }
      draw();
    };
    const io = new IntersectionObserver(([en]) => {
      if (en.isIntersecting && !running) {
        running = true;
        last = performance.now();
        raf = requestAnimationFrame(frame);
      } else if (!en.isIntersecting && running) {
        running = false;
        cancelAnimationFrame(raf);
      }
    });
    io.observe(st);

    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
      st.removeEventListener('pointermove', onMove);
      st.removeEventListener('pointerdown', onDown);
      st.removeEventListener('pointerup', onUp);
      st.removeEventListener('pointercancel', onCancel);
    };
  }, [geo, items, apiRef]);

  return (
    <div
      ref={wrap}
      className={`cl cl--${variant} ${geo?.mobile && variant !== 'stage' ? 'cl--scroll' : ''} ${geo?.mobile ? 'cl--mobile' : ''} ${picked ? 'is-atelier' : ''} ${className}`}
      data-lenis-prevent={geo?.mobile && variant !== 'stage' ? '' : undefined}
    >
      <div
        ref={stage}
        className="cl__stage"
        style={geo ? { width: geo.stageW, height: geo.height, '--sock-w': `${geo.sockW}px`, '--sock-h': `${geo.sockH}px` } : { height: 420 }}
      >
        <svg className="cl__rope" width={geo?.stageW || 0} height={geo?.height || 0} aria-hidden="true">
          <path ref={shadow} className="cl__rope-shadow" />
          <path ref={rope} className="cl__rope-line" />
          {geo && (
            <>
              <circle className="cl__post" cx={geo.pad} cy={ROPE_Y} r="9" />
              <circle className="cl__post" cx={geo.stageW - geo.pad} cy={ROPE_Y} r="9" />
            </>
          )}
        </svg>
        {geo &&
          items.map((p, i) => (
            <Sock
              key={p.slug}
              p={p}
              i={i}
              refs={sockEls}
              dragged={dragged}
              onHover={hover}
              onQuickAdd={quick}
              inCart={cart.has(p.slug)}
              onPick={onPick}
              picked={picked === p.slug}
            />
          ))}
      </div>
    </div>
  );
}
