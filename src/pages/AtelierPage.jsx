import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import Clothesline from '../components/Clothesline.jsx';
import { useCart } from '../context/CartContext.jsx';
import { products } from '../data/products.js';
import { lockScroll, reducedMotion, unlockScroll } from '../lib/scroll.js';
import useTitle from '../lib/useTitle.js';
import { PullStage, bigBox } from '../atelier/PullStage.ts';
import { sockModel } from '../atelier/models.ts';
import { SOCKS } from '../atelier/socks.ts';
import { twang } from '../atelier/sound.ts';
import { clock, money } from '../atelier/receiptDraw.ts';
import { distressedOf, holeOf, newSeed, newSerial } from '../atelier/distress.js';
import LaborCounter from '../components/LaborCounter.jsx';
import { OpenHand, PinchHand } from '../components/HandCursor.jsx';
import '../atelier/atelier.css';

const MESSAGES = [
  [0, 'Just a sock. Disappointing.'],
  [0.06, 'Lightly distressed.'],
  [0.22, 'Less sock. More value.'],
  [0.42, 'Mostly hole. Very premium.'],
  [0.66, 'Barely there. Barely legal.'],
  [0.88, 'Couture.']
];
const SOLD_OUT = "Sold out: there's no sock left.";
const messageFor = (p, finished) => {
  if (finished) return SOLD_OUT;
  let m = MESSAGES[0][1];
  for (const [t, s] of MESSAGES) if (p >= t) m = s;
  return m;
};
const LIFT_MS = 640;
/** the line's centring shift as it is on screen this frame (mid-transition included) */
const liveShift = (room) => {
  const line = room?.querySelector('.atl__line');
  const t = line ? getComputedStyle(line).translate : 'none';
  return t && t !== 'none' ? parseFloat(t.split(' ')[1] || 0) || 0 : 0;
};
const navBottom = () => Math.ceil(document.querySelector('header.nav')?.getBoundingClientRect().bottom || 76);

/* The Atelier: one full-screen room. Six socks on the line; pick one and it comes forward onto
   the centre peg while the others recede, a work floor fades in, and you pull its loose thread. */
export default function AtelierPage() {
  useTitle('The Atelier');
  const cart = useCart();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const roomRef = useRef(null);
  const canvasRef = useRef(null);
  const clApi = useRef(null);
  const stageRef = useRef(null);
  const tagRef = useRef(null);
  const priceRef = useRef(null);
  const pctRef = useRef(null);
  const laborRef = useRef(null);
  const barPriceRef = useRef(null);
  const barStatsRef = useRef(null);
  const hud = useRef(null);
  const layoutRef = useRef(null);
  const [top, setTop] = useState(84);
  const [picked, setPicked] = useState(null);
  const [phase, setPhaseState] = useState('line'); // line → lifting → pull → frozen
  const phaseRef = useRef('line');
  const setPhase = useCallback((p) => {
    phaseRef.current = p;
    setPhaseState(p);
  }, []);
  const [msg, setMsg] = useState(MESSAGES[0][1]);
  const [finished, setFinished] = useState(false);
  const [pulledOnce, setPulledOnce] = useState(false); // the touch gesture hint loops until the first pull
  const [fingerAt, setFingerAt] = useState(null);
  const [added, setAdded] = useState(null);
  const serial = useRef('0000');
  const seed = useRef(0);

  // desktop, before a sock is picked: the line group sits centred between the counter and the headline
  const [shift, setShift] = useState(0);
  const shiftRef = useRef(0);
  const [shiftAnim, setShiftAnim] = useState(false);

  const def = picked ? SOCKS.find((s) => s.slug === picked) : null;
  const active = phase !== 'line';
  const pulling = phase === 'pull' || phase === 'frozen';

  // a full-screen room: the page doesn't scroll, the nav keeps its own strip on top
  useLayoutEffect(() => {
    lockScroll();
    window.scrollTo(0, 0);
    const measure = () => setTop(navBottom() + 6);
    measure();
    const t = setTimeout(measure, 400);
    return () => {
      clearTimeout(t);
      unlockScroll();
    };
  }, []);

  // ------------------------------------------------------------ the canvas stage
  useEffect(() => {
    const stage = new PullStage(
      canvasRef.current,
      (h) => {
        hud.current = h;
        if (priceRef.current) priceRef.current.textContent = money(h.phase === 'idle' ? 9 : h.price);
        if (pctRef.current) pctRef.current.textContent = `${holeOf(h)}%`;
        if (laborRef.current) laborRef.current.textContent = clock(h.laborMs);
        if (barPriceRef.current) barPriceRef.current.textContent = money(h.phase === 'idle' ? 9 : h.price);
        if (barStatsRef.current) barStatsRef.current.textContent = `Hole ${holeOf(h)}% · Labor ${clock(h.laborMs)}`;
        const tag = tagRef.current, L = layoutRef.current, api = clApi.current;
        if (tag && L && api && !L.mobile) {
          // the tag hangs from the line itself
          const r = tag.offsetWidth;
          const x = L.W - Math.max(32, L.W * 0.035) - r / 2;
          tag.style.top = `${(L.offY + api.ropeYAt(x - L.offX) + 26).toFixed(1)}px`;
          tag.style.rotate = `${(-2 + h.shiver * 1.4).toFixed(2)}deg`;
        }
        if (h.phase === 'pull') {
          const m = messageFor(h.p, h.finished);
          setMsg((old) => (old === m ? old : m));
        }
      },
      (e) => {
        if (e === 'finished') setFinished(true);
        if (e === 'grab') setPulledOnce(true);
      }
    );
    stage.onPluck = (x, amount) => {
      const api = clApi.current, L = layoutRef.current;
      if (api && L) api.pluck(x - L.offX, amount);
    };
    stageRef.current = stage;
    window.__holey = stage;
    // warm the knit models in the worker
    (window.requestIdleCallback || ((f) => setTimeout(f, 200)))(() => SOCKS.reduce((p, s) => p.then(() => sockModel(s.id)), Promise.resolve()));
    return () => stage.dispose();
  }, []);

  /** phones: the stage message sits on one line in the band above the line; shrink it to fit (≥ 18px) */
  const fitMsg = useCallback((el) => {
    if (!el) return;
    el.style.fontSize = '';
    if (!window.matchMedia('(max-width: 767px)').matches) return;
    let fs = 26;
    el.style.fontSize = `${fs}px`;
    while (el.scrollWidth > el.clientWidth + 1 && fs > 18) el.style.fontSize = `${--fs}px`;
  }, []);

  // ------------------------------------------------------------ geometry
  const centre = useCallback(() => {
    const room = roomRef.current, api = clApi.current;
    if (!room || !api || phaseRef.current !== 'line') return;
    const msgEl = room.querySelector('.atl__msg');
    if (window.innerWidth < 768 || !msgEl) {
      shiftRef.current = 0;
      setShift(0);
      return;
    }
    const now = liveShift(room);
    const posts = [...api.stage.querySelectorAll('.cl__post')].map((e) => e.getBoundingClientRect().top);
    const tags = [...api.stage.querySelectorAll('.cl__tag')].map((e) => e.getBoundingClientRect().bottom);
    if (!posts.length || !tags.length) return;
    const groupTop = Math.min(...posts) - now, groupBottom = Math.max(...tags) - now;
    const counter = room.querySelector('.atl__counter')?.getBoundingClientRect();
    const above = Math.max(navBottom(), counter && counter.height ? counter.bottom : 0);
    const below = msgEl.getBoundingClientRect().top;
    const next = Math.max(0, Math.round(above + (below - above - (groupBottom - groupTop)) / 2 - groupTop));
    shiftRef.current = next;
    setShift(next);
  }, []);

  useEffect(() => {
    const timers = [60, 400, 1200].map((ms) => setTimeout(centre, ms));
    // glide only after the first placement, so the page doesn't open with the line sliding down
    timers.push(setTimeout(() => setShiftAnim(true), 1400));
    window.addEventListener('resize', centre);
    return () => {
      timers.forEach(clearTimeout);
      window.removeEventListener('resize', centre);
    };
  }, [centre]);

  const computeLayout = useCallback(() => {
    const room = roomRef.current, api = clApi.current;
    if (!room || !api) return null;
    const r = room.getBoundingClientRect();
    const sr = api.stage.getBoundingClientRect();
    // the picked layout is the line at rest (no centring shift), even while it glides back up
    const offX = sr.left - r.left, offY = sr.top - r.top - liveShift(room);
    const W = r.width, H = r.height;
    const mobile = W < 760;
    const pinX = mobile ? W * 0.44 : W * 0.5;
    const lineYAt = (x) => offY + api.ropeYAt(x - offX);
    // phones: the price lives in a bottom bar, so the floor sits just above it
    const baseY = mobile ? H - 96 : H * 0.93;
    // the sock itself (≈96% of its image box) fills about two thirds of line → floor
    const sockH = (baseY - lineYAt(pinX)) * (mobile ? 0.64 : 0.66);
    const imgW = (sockH / 0.961) * 0.8;
    return { W, H, pinX, lineYAt, imgW, smallW: api.sockW, baseY, offX, offY, mobile };
  }, []);

  /** lift the clothesline sock so its peg and image land exactly where the canvas will draw them */
  const liftSock = useCallback((slug, L) => {
    const api = clApi.current;
    const i = products.findIndex((p) => p.slug === slug);
    const body = api?.stage.querySelectorAll('.cl__sock')[i]?.querySelector('.cl__body');
    if (!body || !L) return;
    const box = bigBox(L);
    const peg = api.pegOf(i);
    const dx = L.pinX - L.offX - peg.x;
    const dy = box.pegTop - L.offY - (peg.y - api.pegTop);
    body.style.transform = `translate(${dx.toFixed(1)}px, ${dy.toFixed(1)}px) scale(${box.K.toFixed(4)})`;
  }, []);

  // ------------------------------------------------------------ flow
  const pick = useCallback(
    async (p) => {
      if (phaseRef.current !== 'line') return;
      const sdef = SOCKS.find((s) => s.slug === p.slug);
      twang();
      setPicked(p.slug);
      setPhase('lifting');
      setFinished(false);
      setAdded(null);
      setMsg(MESSAGES[0][1]);
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      const L = computeLayout();
      layoutRef.current = L;
      liftSock(p.slug, L);
      const [m] = await Promise.all([sockModel(sdef.id), new Promise((r) => setTimeout(r, reducedMotion() ? 0 : LIFT_MS))]);
      if (phaseRef.current !== 'lifting') return;
      const L2 = computeLayout();
      layoutRef.current = L2;
      stageRef.current.open(sdef, m, { ...L2 });
      serial.current = newSerial();
      seed.current = newSeed();
      setPhase('pull');
    },
    [computeLayout, liftSock, setPhase]
  );

  const backToLine = useCallback(() => {
    stageRef.current?.close();
    clApi.current?.stage.querySelectorAll('.cl__body').forEach((b) => (b.style.transform = ''));
    setPicked(null);
    setPhase('line');
    setFinished(false);
    setAdded(null);
    requestAnimationFrame(centre);
  }, [setPhase, centre]);

  /** another sock while one is already picked: put this one back, take the new one down */
  const switchTo = useCallback(
    (p) => {
      if (!p || p.slug === picked) return;
      backToLine();
      requestAnimationFrame(() => requestAnimationFrame(() => pick(p)));
    },
    [picked, backToLine, pick]
  );
  const onPick = useCallback((p) => (phaseRef.current === 'line' ? pick(p) : switchTo(p)), [pick, switchTo]);

  // every way in lands straight in the picked state: ?sock=… when it names a sock, else Heel Yeah.
  // (The line view stays one tap away under "Change sock".)
  const wanted = params.get('sock');
  useEffect(() => {
    const p = products.find((x) => x.slug === wanted) || products[0];
    let tries = 0;
    const id = setInterval(() => {
      tries++;
      if (clApi.current && phaseRef.current === 'line') {
        clearInterval(id);
        pick(p);
      } else if (phaseRef.current !== 'line' || tries > 80) clearInterval(id);
    }, 40);
    return () => clearInterval(id);
  }, [wanted]); // eslint-disable-line react-hooks/exhaustive-deps

  // tapping one of the blurred socks behind the picked one switches to it (the canvas covers them, so
  // a short tap that didn't grab the thread is hit-tested against their images)
  const tapRef = useRef(null);
  const onStageDown = (e) => {
    tapRef.current = stageRef.current?.holding ? null : { x: e.clientX, y: e.clientY, t: performance.now() };
  };
  const onStageUp = (e) => {
    const t = tapRef.current;
    tapRef.current = null;
    if (!t || Math.hypot(e.clientX - t.x, e.clientY - t.y) > 8 || performance.now() - t.t > 600) return;
    const socks = [...(clApi.current?.stage.querySelectorAll('.cl__sock:not(.is-picked)') || [])];
    const hit = socks.find((el) => {
      const r = el.querySelector('.cl__img').getBoundingClientRect();
      return e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
    });
    if (hit) switchTo(products[[...hit.parentElement.children].filter((c) => c.classList.contains('cl__sock')).indexOf(hit)]);
  };

  // ------------------------------------------------------------ desktop: a big hand over the thread / sock
  const handRef = useRef(null);
  useEffect(() => {
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return undefined;
    const room = roomRef.current, cv = canvasRef.current, hand = handRef.current;
    if (!room || !cv || !hand) return undefined;
    let raf = 0, last = null;
    const update = () => {
      raf = 0;
      if (!last) return;
      const g = cv.dataset.grab; // '1' over something grabbable, '2' holding it (set by the stage)
      let show = g === '1' || g === '2';
      const st = stageRef.current, L = layoutRef.current;
      if (!show && st?.pulling && !st.finished && L) {
        const r = cv.getBoundingClientRect(), b = bigBox(L);
        const x = last.x - r.left, y = last.y - r.top;
        show = x >= b.left && x <= b.left + b.width && y >= b.top && y <= b.top + b.height;
      }
      hand.dataset.state = g === '2' ? 'closed' : 'open';
      hand.style.transform = `translate3d(${last.x}px, ${last.y}px, 0)`;
      hand.classList.toggle('is-on', show);
      room.classList.toggle('has-hand', show);
    };
    const queue = () => (raf ||= requestAnimationFrame(update));
    const onMove = (e) => {
      if (e.pointerType !== 'mouse') return;
      last = { x: e.clientX, y: e.clientY };
      queue();
    };
    const onLeave = () => {
      last = null;
      hand.classList.remove('is-on');
      room.classList.remove('has-hand');
    };
    // press / release change the grab state without moving
    const mo = new MutationObserver(queue);
    mo.observe(cv, { attributes: true, attributeFilter: ['data-grab'] });
    window.addEventListener('pointermove', onMove);
    room.addEventListener('pointerleave', onLeave);
    return () => {
      cancelAnimationFrame(raf);
      mo.disconnect();
      window.removeEventListener('pointermove', onMove);
      room.removeEventListener('pointerleave', onLeave);
    };
  }, []);

  // ------------------------------------------------------------ touch: a finger shows the pull, beside the thread
  useEffect(() => {
    if (phase !== 'pull' || pulledOnce) return undefined;
    const place = () => {
      const st = stageRef.current, d = st?.debug?.();
      if (!d?.grabPoint) return;
      // the stage writes "pull the loose thread" on whichever side of the thread end has room; the
      // finger takes the other side (same rule as PullStage's hint)
      const u = st.unit || 1;
      const c = document.createElement('canvas').getContext('2d');
      c.font = `900 ${Math.round(Math.max(15, 15 * u))}px Nunito, system-ui, sans-serif`;
      const labelLeft = d.end.x - 18 * u - c.measureText('pull the loose thread').width > 8;
      setFingerAt({ x: Math.round(d.grabPoint.x), y: Math.round(d.grabPoint.y), side: labelLeft ? 'right' : 'left' });
    };
    const t = setTimeout(place, 300);
    window.addEventListener('resize', place);
    return () => {
      clearTimeout(t);
      window.removeEventListener('resize', place);
    };
  }, [phase, picked, pulledOnce]);

  // keep everything aligned on resize / rotation
  useEffect(() => {
    const onResize = () => {
      setTop(navBottom() + 6);
      requestAnimationFrame(() => {
        const L = computeLayout();
        if (!L) return;
        layoutRef.current = L;
        if (picked) liftSock(picked, L);
        if (stageRef.current?.model) stageRef.current.setLayout({ ...L });
      });
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [picked, computeLayout, liftSock]);

  // the canvas always covers the room
  useLayoutEffect(() => {
    const room = roomRef.current;
    const ro = new ResizeObserver(() => {
      if (stageRef.current?.model) return;
      const r = room.getBoundingClientRect();
      stageRef.current?.setLayout({ ...(stageRef.current.L || {}), W: r.width, H: r.height });
    });
    ro.observe(room);
    return () => ro.disconnect();
  }, []);

  const onPointerMove = (e) => {
    if (!active || reducedMotion()) return;
    const r = roomRef.current.getBoundingClientRect();
    roomRef.current.style.setProperty('--par', (((e.clientX - r.left) / r.width) * 2 - 1).toFixed(3));
  };

  const addToBasket = async () => {
    const h = hud.current, stage = stageRef.current, L = layoutRef.current;
    if (!def || !h || h.phase !== 'pull' || h.p <= 0) {
      cart.say('Too much sock. Please pull harder.');
      return;
    }
    stage.freeze();
    setPhase('frozen');
    const distressed = distressedOf(stage, h, { serial: serial.current, unravelSeed: seed.current });
    const price = distressed.price;
    // the sock flies from the peg into the basket
    const cr = canvasRef.current.getBoundingClientRect();
    const box = L ? bigBox(L) : null;
    const from = box && {
      getBoundingClientRect: () => ({ left: cr.left + box.left, top: cr.top + box.top, width: box.width, height: box.height })
    };
    setAdded({ laborMs: h.laborMs, price });
    await cart.add(def.slug, from, { distressed, openDrawer: false, quiet: true });
  };

  return (
    <section
      className={`atp atl ${active ? 'is-active' : ''} ${pulling ? 'is-pulling' : ''} ${shiftAnim ? 'is-gliding' : ''}`}
      style={{ paddingTop: top, '--line-shift': `${shift}px`, '--sec-bg': def ? `color-mix(in srgb, ${products.find((p) => p.slug === picked).color} 22%, var(--cream))` : 'var(--cream)' }}
      data-cursor="native"
      aria-label="The Atelier"
    >
      <div ref={roomRef} className="atl__room" onPointerMove={onPointerMove}>
        <div className="atl__floor" aria-hidden="true" />
        <LaborCounter className="atl__counter" />
        <Clothesline items={products} onPick={onPick} picked={picked} apiRef={clApi} variant="stage" className="atl__line" />
        <canvas
          ref={canvasRef}
          onPointerDown={onStageDown}
          onPointerUp={onStageUp}
          className="atl__stage"
          aria-label={def ? `${def.name} hanging on the big peg. Drag its loose thread down, or hold Space, to unravel it.` : undefined}
        />

        <div ref={handRef} className="atl-hand" aria-hidden="true">
          <OpenHand className="atl-hand__open" />
          <PinchHand className="atl-hand__closed" />
        </div>
        {phase === 'pull' && !pulledOnce && fingerAt && (
          <div className={`atl-finger atl-finger--${fingerAt.side}`} style={{ left: fingerAt.x, top: fingerAt.y }} aria-hidden="true">
            <svg viewBox="0 0 40 64">
              <path className="atl-finger__trail" d="M20 6v40" />
              <path className="atl-finger__arrow" d="M12 40l8 9 8-9" />
              <path className="atl-finger__hand" d="M14 30V12a4 4 0 0 1 8 0v12l4-.5a4 4 0 0 1 4.5 4V36c0 8-5 13-12 13h-1c-5 0-8-3-10-7l-4-8a3.5 3.5 0 0 1 6-3.5Z" />
            </svg>
          </div>
        )}

        {active && (
          <button type="button" className="atl__back" onClick={backToLine}>
            Change sock
          </button>
        )}

        <div className="atl__tag" ref={tagRef} aria-hidden={!active || undefined}>
          <div className="tag-card">
            <span className="tag-eyelet" aria-hidden />
            <div className="tag-house">Atelier Holey</div>
            <div className="tag-name">{def ? `No. 0${def.id} · ${def.name}` : 'One sock · Hole included'}</div>
            <div className="tag-price" ref={priceRef}>
              $9.00
            </div>
            <dl className="tag-rows">
              <div>
                <dt>Your wage</dt>
                <dd className="wage">$0.00</dd>
              </div>
              <div>
                <dt>Hole</dt>
                <dd ref={pctRef}>0%</dd>
              </div>
              <div>
                <dt>Labor</dt>
                <dd ref={laborRef}>0:00</dd>
              </div>
            </dl>
            <button
              type="button"
              className={`tag-basket ${finished && phase === 'pull' ? 'is-ready' : ''}`}
              onClick={addToBasket}
              disabled={phase !== 'pull'}
              tabIndex={active ? 0 : -1}
            >
              {phase === 'frozen' ? 'In the basket' : 'Add to basket'}
            </button>
          </div>
        </div>

        {!active && (
          <div className="atl__pick mobile-only">
            <p className="kicker">The Atelier</p>
            <h1 className="h2">Pick a sock.</h1>
            <p className="atl__pick-line">Tap one to take it down, then pull its loose thread.</p>
            <LaborCounter className="atl__pick-counter" />
          </div>
        )}

        {/* phones: the price tag becomes a bottom bar in the thumb zone */}
        {active && (
          <div className="atl__bar mobile-only">
            <div className="atl__bar-info">
              <span className="atl__bar-price" ref={barPriceRef}>
                $9.00
              </span>
              <span className="atl__bar-stats" ref={barStatsRef}>
                Hole 0% · Labor 0:00
              </span>
              <span className="atl__bar-wage">
                Your wage <b>$0.00</b>
              </span>
            </div>
            <button type="button" className={`atl__bar-add ${finished && phase === 'pull' ? 'is-ready' : ''}`} onClick={addToBasket} disabled={phase !== 'pull'}>
              {phase === 'frozen' ? 'In the basket' : 'Add to basket'}
            </button>
          </div>
        )}

        <p className="atl__msg" ref={fitMsg} key={active ? msg : 'line'} aria-live="polite">
          {phase === 'line' ? 'Pick a sock. Never a pair.' : phase === 'lifting' ? 'Taking it down…' : msg}
        </p>

        {added && (
          <div className="atl__added" role="status">
            <p>
              <strong>Added.</strong> Labor {clock(added.laborMs)} · Your wage <span className="wage">$0.00</span>
            </p>
            <div className="atl__added-actions">
              <button type="button" className="abtn abtn-ghost" onClick={backToLine}>
                Pull another sock
              </button>
              <button type="button" className="abtn abtn-primary" onClick={() => navigate('/checkout')}>
                Checkout
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
