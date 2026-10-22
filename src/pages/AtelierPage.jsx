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
import LaborCounter from '../components/LaborCounter.jsx';
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
const holeOf = (h) => (h.finished ? 100 : Math.min(99, Math.floor(h.p * 100)));
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
  const [added, setAdded] = useState(null);
  const serial = useRef('0000');
  const seed = useRef(0);

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

  // ------------------------------------------------------------ geometry
  const computeLayout = useCallback(() => {
    const room = roomRef.current, api = clApi.current;
    if (!room || !api) return null;
    const r = room.getBoundingClientRect();
    const sr = api.stage.getBoundingClientRect();
    const offX = sr.left - r.left, offY = sr.top - r.top;
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
      serial.current = String(1000 + Math.floor(Math.random() * 9000));
      seed.current = Math.floor(Math.random() * 1e6);
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
  }, [setPhase]);

  // /atelier?sock=heel-yeah: straight to that sock
  const wanted = params.get('sock');
  useEffect(() => {
    if (!wanted) return undefined;
    const p = products.find((x) => x.slug === wanted);
    if (!p) return undefined;
    let tries = 0;
    const id = setInterval(() => {
      tries++;
      if (clApi.current && phaseRef.current === 'line') {
        clearInterval(id);
        setTimeout(() => pick(p), 250);
      } else if (tries > 50) clearInterval(id);
    }, 60);
    return () => clearInterval(id);
  }, [wanted, pick]);

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
    const price = Math.round(h.price * 100) / 100;
    const distressed = {
      price,
      hole: holeOf(h),
      laborMs: Math.round(h.laborMs),
      serial: serial.current,
      unravelSeed: seed.current,
      outline: stage.outlineImage(110, 150).toDataURL('image/png')
    };
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
      className={`atp atl ${active ? 'is-active' : ''} ${pulling ? 'is-pulling' : ''}`}
      style={{ paddingTop: top, '--sec-bg': def ? `color-mix(in srgb, ${products.find((p) => p.slug === picked).color} 22%, var(--cream))` : 'var(--cream)' }}
      data-cursor="native"
      aria-label="The Atelier"
    >
      <div ref={roomRef} className="atl__room" onPointerMove={onPointerMove}>
        <div className="atl__floor" aria-hidden="true" />
        <LaborCounter className="atl__counter" />
        <Clothesline items={products} onPick={pick} picked={picked} apiRef={clApi} variant="stage" className="atl__line" />
        <canvas
          ref={canvasRef}
          className="atl__stage"
          aria-label={def ? `${def.name} hanging on the big peg. Drag its loose thread down, or hold Space, to unravel it.` : undefined}
        />

        {active && (
          <button type="button" className="atl__back" onClick={backToLine}>
            ← Back to the line
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

        <p className="atl__msg" key={active ? msg : 'line'} aria-live="polite">
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
