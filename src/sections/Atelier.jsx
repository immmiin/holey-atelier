import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Clothesline from '../components/Clothesline.jsx';
import BounceText from '../components/motion/BounceText.jsx';
import { useCart } from '../context/CartContext.jsx';
import { products } from '../data/products.js';
import { lockScroll, reducedMotion, scrollTo, unlockScroll } from '../lib/scroll.js';
import { PullStage, bigBox } from '../atelier/PullStage.ts';
import { sockModel } from '../atelier/models.ts';
import { SOCKS } from '../atelier/socks.ts';
import { twang } from '../atelier/sound.ts';
import Receipt from '../atelier/Receipt.tsx';
import Certificate from '../atelier/Certificate.tsx';
import { clock, holePct, money, saveSale } from '../atelier/sale.ts';
import '@fontsource/jetbrains-mono/400.css';
import '@fontsource/jetbrains-mono/700.css';
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

const navHeight = () => document.querySelector('header.nav')?.getBoundingClientRect().bottom || 76;

/* The home page's clothesline, turned into the Atelier: pick a sock and it comes forward onto
   the centre pin, the others recede, a work floor fades in, and you pull its loose thread. */
export default function Atelier() {
  const cart = useCart();
  const roomRef = useRef(null);
  const canvasRef = useRef(null);
  const clApi = useRef(null);
  const stageRef = useRef(null);
  const tagRef = useRef(null);
  const basketRef = useRef(null);
  const priceRef = useRef(null);
  const pctRef = useRef(null);
  const laborRef = useRef(null);
  const hud = useRef(null);
  const layoutRef = useRef(null);
  const [picked, setPicked] = useState(null);
  const [phase, setPhaseState] = useState('line'); // line → lifting → pull → receipt/cert
  const phaseRef = useRef('line');
  const setPhase = useCallback((p) => {
    phaseRef.current = p;
    setPhaseState(p);
  }, []);
  const [roomH, setRoomH] = useState(null);
  const [msg, setMsg] = useState(MESSAGES[0][1]);
  const [finished, setFinished] = useState(false);
  const [sale, setSale] = useState(null);
  const [rcPos, setRcPos] = useState({ top: 0, center: null });
  const serial = useRef('0000');

  const def = picked ? SOCKS.find((s) => s.slug === picked) : null;
  const active = phase !== 'line';

  // ------------------------------------------------------------ the canvas stage
  useEffect(() => {
    const stage = new PullStage(
      canvasRef.current,
      (h) => {
        hud.current = h;
        if (priceRef.current) priceRef.current.textContent = money(h.phase === 'idle' ? 9 : h.price);
        if (pctRef.current) pctRef.current.textContent = `${h.finished ? 100 : Math.min(99, Math.floor(h.p * 100))}%`;
        if (laborRef.current) laborRef.current.textContent = clock(h.laborMs);
        if (tagRef.current) tagRef.current.style.rotate = `${(-2 + h.shiver * 1.4).toFixed(2)}deg`;
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
    return () => stage.dispose();
  }, []);

  // warm the knit models while the section is near the screen
  useEffect(() => {
    const el = roomRef.current;
    const io = new IntersectionObserver(
      ([e]) => {
        if (!e.isIntersecting) return;
        io.disconnect();
        const warm = () => SOCKS.reduce((p, s) => p.then(() => sockModel(s.id)), Promise.resolve());
        (window.requestIdleCallback || ((f) => setTimeout(f, 300)))(warm);
      },
      { rootMargin: '400px' }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // ------------------------------------------------------------ geometry
  /** the stage layout for a room of height H (canvas = room, CSS px) */
  const computeLayout = useCallback((H) => {
    const room = roomRef.current, api = clApi.current;
    if (!room || !api) return null;
    const r = room.getBoundingClientRect();
    const sr = api.stage.getBoundingClientRect();
    const offX = sr.left - r.left, offY = sr.top - r.top;
    const W = r.width;
    const mobile = W < 760;
    const pinX = mobile ? W * 0.4 : W * 0.5;
    const lineYAt = (x) => offY + api.ropeYAt(x - offX);
    const baseY = H * (mobile ? 0.9 : 0.91);
    const smallW = api.sockW, smallH = api.sockH;
    const avail = baseY - lineYAt(pinX) - 30;
    const K = Math.max(1.2, Math.min(mobile ? 2.1 : 1.8, (avail * 0.86) / smallH));
    return { W, H, pinX, lineYAt, imgW: smallW * K, smallW, baseY, offX, offY };
  }, []);

  /** lift the clothesline sock so its peg and image land exactly where the canvas will draw them */
  const liftSock = useCallback((slug, L) => {
    const api = clApi.current;
    const i = products.findIndex((p) => p.slug === slug);
    const el = api?.stage.querySelectorAll('.cl__sock')[i];
    const body = el?.querySelector('.cl__body');
    if (!body || !L) return;
    const box = bigBox(L);
    const peg = api.pegOf(i);
    // body top-centre is the peg top: (peg.x, peg.y - pegTop) in stage coords
    const dx = L.pinX - L.offX - peg.x;
    const dy = box.pegTop - L.offY - (peg.y - api.pegTop);
    body.style.transform = `translate(${dx.toFixed(1)}px, ${dy.toFixed(1)}px) scale(${box.K.toFixed(4)})`;
  }, []);

  const roomHeight = () => Math.round(Math.max(560, Math.min(1000, window.innerHeight - navHeight())));

  // ------------------------------------------------------------ flow
  const pick = useCallback(
    async (p) => {
      if (phaseRef.current !== 'line') return;
      const sdef = SOCKS.find((s) => s.slug === p.slug);
      twang();
      const H = roomHeight();
      setRoomH(H);
      setPicked(p.slug);
      setPhase('lifting');
      setFinished(false);
      setMsg(MESSAGES[0][1]);
      if (!reducedMotion()) scrollTo(roomRef.current, { offset: -navHeight() + 2 });
      else roomRef.current.scrollIntoView();
      // let the class change and height apply, then lift
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      const L = computeLayout(H);
      layoutRef.current = L;
      liftSock(p.slug, L);
      const [m] = await Promise.all([sockModel(sdef.id), new Promise((r) => setTimeout(r, reducedMotion() ? 0 : LIFT_MS))]);
      if (phaseRef.current !== 'lifting') return;
      const L2 = computeLayout(H);
      layoutRef.current = L2;
      stageRef.current.open(sdef, m, { ...L2 });
      serial.current = String(1000 + Math.floor(Math.random() * 9000));
      setPhase('pull');
    },
    [computeLayout, liftSock, setPhase]
  );

  const backToLine = useCallback(() => {
    stageRef.current?.close();
    const api = clApi.current;
    api?.stage.querySelectorAll('.cl__body').forEach((b) => (b.style.transform = ''));
    setPicked(null);
    setPhase('line');
    setFinished(false);
    setSale(null);
    setRoomH(null);
  }, [setPhase]);

  // keep everything aligned on resize / orientation change
  useEffect(() => {
    if (!active) return undefined;
    const onResize = () => {
      const H = roomHeight();
      setRoomH(H);
      requestAnimationFrame(() => {
        const L = computeLayout(H);
        if (!L) return;
        layoutRef.current = L;
        if (picked) liftSock(picked, L);
        if (stageRef.current.model) stageRef.current.setLayout({ ...L });
      });
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [active, picked, computeLayout, liftSock]);

  // the canvas always matches the room
  useLayoutEffect(() => {
    const room = roomRef.current;
    const ro = new ResizeObserver(() => {
      if (phaseRef.current === 'line') {
        const r = room.getBoundingClientRect();
        stageRef.current?.setLayout({ ...(stageRef.current.L || {}), W: r.width, H: r.height });
      }
    });
    ro.observe(room);
    return () => ro.disconnect();
  }, []);

  // pointer parallax for the receded socks
  const onPointerMove = (e) => {
    if (!active || reducedMotion()) return;
    const r = roomRef.current.getBoundingClientRect();
    roomRef.current.style.setProperty('--par', (((e.clientX - r.left) / r.width) * 2 - 1).toFixed(3));
  };

  const addToBasket = async () => {
    const h = hud.current, stage = stageRef.current;
    if (!def || !h || h.phase !== 'pull' || h.p <= 0) {
      cart.say('Too much sock. Please pull harder.');
      return;
    }
    stage.freeze();
    await document.fonts.load("400 14px 'JetBrains Mono'").catch(() => undefined);
    const art = stage.artwork();
    const s = {
      sockId: def.id,
      slug: def.slug,
      sockName: def.name,
      name: 'You',
      p: h.p,
      price: Math.round(h.price * 100) / 100,
      laborMs: h.laborMs,
      serial: serial.current,
      date: new Date(),
      finished: h.finished,
      outline: stage.outlineImage(110, 150).toDataURL('image/png'),
      ghost: stage.outlineImage(art.sockBox.w, art.sockBox.h, true),
      art
    };
    saveSale(s);
    void cart.add(def.slug, basketRef.current, { distressed: { price: s.price, hole: holePct(s), serial: s.serial }, openDrawer: false });
    const r = tagRef.current.getBoundingClientRect();
    const narrow = window.innerWidth < 760;
    setRcPos(narrow ? { top: navHeight() + 6, center: null } : { top: r.bottom - 6, center: r.left + r.width / 2 });
    setSale(s);
    lockScroll();
    setPhase('receipt');
  };

  const closeReceipt = () => {
    unlockScroll();
    setSale(null);
  };
  const another = () => {
    closeReceipt();
    backToLine();
  };
  const openBasket = () => {
    closeReceipt();
    setPhase('frozen');
    cart.setOpen(true);
  };

  useEffect(() => () => phaseRef.current === 'receipt' && unlockScroll(), []);

  const lead = products.find((p) => p.slug === picked);

  return (
    <section
      id="atelier"
      className={`atl ${active ? 'is-active' : ''} ${phase === 'pull' || phase === 'frozen' || phase === 'receipt' || phase === 'cert' ? 'is-pulling' : ''}`}
      style={{ '--sec-bg': lead ? `color-mix(in srgb, ${lead.color} 22%, var(--cream))` : 'var(--cream)' }}
      aria-labelledby="atelier-title"
    >
      <div className="line-sec__head atl__head wrap">
        <div>
          <p className="kicker">The Atelier · hand-distressed by you</p>
          <BounceText id="atelier-title" text="Pull a thread." className="h2" />
        </div>
        <div>
          <p className="lead">
            Six socks. Zero pairs. Take one down and pull the loose thread at the toe: the less sock there is, the more it costs.
          </p>
          <p className="line-sec__hint" aria-hidden="true">
            tap a sock · pull the thread · hold Space
          </p>
        </div>
      </div>

      <div ref={roomRef} className="atl__room" style={roomH ? { height: roomH } : undefined} onPointerMove={onPointerMove}>
        <div className="atl__floor" aria-hidden="true" />
        <Clothesline items={products} onPick={pick} picked={picked} apiRef={clApi} className="atl__line" />
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
              ref={basketRef}
              type="button"
              className={`tag-basket ${finished && phase === 'pull' ? 'is-ready' : ''}`}
              onClick={addToBasket}
              disabled={phase !== 'pull'}
              tabIndex={active ? 0 : -1}
            >
              Add to basket
            </button>
          </div>
        </div>

        {active && (
          <p className="atl__msg" key={msg} aria-live="polite">
            {phase === 'lifting' ? 'Taking it down…' : msg}
          </p>
        )}
      </div>

      {sale &&
        createPortal(
          <div className="atl-layer">
            {(phase === 'receipt' || phase === 'cert') && (
              <Receipt
                sale={sale}
                top={rcPos.top}
                center={rcPos.center}
                hidden={phase === 'cert'}
                onCert={() => setPhase('cert')}
                onAnother={another}
                onBasket={openBasket}
              />
            )}
            {phase === 'cert' && <Certificate sale={sale} onAnother={another} onClose={() => setPhase('receipt')} />}
          </div>,
          document.body
        )}
    </section>
  );
}
