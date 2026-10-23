import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { AnimatePresence, motion } from 'motion/react';
import SockStage from '../components/sock3d/SockStage.jsx';
import Btn from '../components/Btn.jsx';
import { holeSrc, holeSrcSet, money, products, sockSrc } from '../data/products.js';
import PullCard from '../atelier/PullCard.jsx';
import usePullBuy, { laborClock } from '../atelier/usePullBuy.js';
import './pdp-mobile.css';

/* Phones (≤767px) get a standard shop product page: a swipeable gallery, name + price, colour
   swatches, a clamped description, a collapsible care label, the rest of the line as a grid, and a
   sticky buy bar. The desktop page (Product.jsx) is untouched. */

function Gallery({ p, buy }) {
  const row = useRef(null);
  const [i, setI] = useState(0);
  const slides = [
    { kind: 'pull', label: 'Pull the thread' },
    { kind: '3d', label: '360° view' },
    { kind: 'img', label: 'The hole, up close' }
  ];
  useEffect(() => {
    const el = row.current;
    if (!el) return undefined;
    el.scrollLeft = 0;
    setI(0);
    const on = () => setI(Math.round(el.scrollLeft / el.clientWidth));
    el.addEventListener('scroll', on, { passive: true });
    return () => el.removeEventListener('scroll', on);
  }, [p.slug]);
  const go = (k) => row.current?.scrollTo({ left: k * row.current.clientWidth, behavior: 'smooth' });
  return (
    <div className="mpdp__gallery">
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.div
          key={p.slug}
          className="mpdp__slides"
          ref={row}
          aria-roledescription="carousel"
          aria-label={`${p.name} photos`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
        >
          <div className="mpdp__slide mpdp__slide--pull" role="group" aria-roledescription="slide" aria-label={`1 of 3: ${slides[0].label}`}>
            <PullCard ref={buy.card} product={p} onHud={buy.onHud} />
          </div>
          <div className="mpdp__slide mpdp__slide--3d" role="group" aria-roledescription="slide" aria-label={`2 of 3: ${slides[1].label}`}>
            <SockStage product={p} mode="drag" hint eager sizes="90vw" />
            {/* the sock takes horizontal drags (to rotate it): a swipe from either edge still moves the gallery */}
            <span className="mpdp__edge mpdp__edge--l" aria-hidden="true" />
            <span className="mpdp__edge mpdp__edge--r" aria-hidden="true" />
          </div>
          <div className="mpdp__slide" role="group" aria-roledescription="slide" aria-label={`3 of 3: ${slides[2].label}`}>
            <img src={holeSrc(p.n, 1000)} srcSet={holeSrcSet(p.n)} sizes="90vw" alt={`The hole in the toe of ${p.name}, up close.`} loading="lazy" />
          </div>
        </motion.div>
      </AnimatePresence>
      <div className="mpdp__dots" role="tablist" aria-label="Photos">
        {slides.map((s, k) => (
          <button key={k} type="button" role="tab" aria-selected={k === i} aria-label={s.label} className={k === i ? 'is-on' : ''} onClick={() => go(k)}>
            <span />
          </button>
        ))}
      </div>
      <p className="mpdp__pull-links">
        <button type="button" onClick={buy.reset}>
          Reset sock
        </button>
        <Link to={`/atelier?sock=${p.slug}`}>Open in the Atelier ↗</Link>
      </p>
    </div>
  );
}

function Description({ text }) {
  const el = useRef(null);
  const [open, setOpen] = useState(false);
  const [long, setLong] = useState(false);
  useLayoutEffect(() => {
    const d = el.current;
    if (d && !open) setLong(d.scrollHeight > d.clientHeight + 1);
  }, [text, open]);
  useEffect(() => setOpen(false), [text]);
  return (
    <div className="mpdp__desc">
      <p ref={el} id="mpdp-desc" className={open ? 'is-open' : ''}>
        {text}
      </p>
      {(long || open) && (
        <button type="button" className="mpdp__more" aria-expanded={open} aria-controls="mpdp-desc" onClick={() => setOpen((o) => !o)}>
          {open ? 'Read less' : 'Read more'}
        </button>
      )}
    </div>
  );
}

function CareLabel({ p }) {
  const [open, setOpen] = useState(false);
  useEffect(() => setOpen(false), [p.slug]);
  return (
    <div className={`mpdp__care ${open ? 'is-open' : ''}`}>
      <button type="button" className="mpdp__care-head" aria-expanded={open} aria-controls="mpdp-care" onClick={() => setOpen((o) => !o)}>
        <span>Care label</span>
        <span className="mpdp__care-icon" aria-hidden="true" />
      </button>
      <div id="mpdp-care" className="mpdp__care-body" hidden={!open}>
        <p className="mpdp__care-no">{p.careNo}</p>
        <dl>
          {p.specs.map(([k, v]) => (
            <div key={k}>
              <dt>{k}</dt>
              <dd>{v}</dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
}

export default function ProductMobile({ p }) {
  const navigate = useNavigate();
  const buy = usePullBuy(p);
  const others = products.filter((x) => x.slug !== p.slug);

  return (
    <section className="mpdp" style={{ '--sock': p.color }}>
      <Gallery p={p} buy={buy} />

      <div className="mpdp__head">
        <p className="mpdp__chip">{p.subtitle}</p>
        <h1 className="mpdp__title">{p.name}</h1>
        <p className="mpdp__price">
          <b>{money(p.price)}</b>
          <span>One sock. Zero pairs.</span>
        </p>
      </div>

      <div className="mpdp__colors">
        <p className="mpdp__colors-label">
          Color: <b>{p.name}</b>
        </p>
        <div className="mpdp__swatches" role="radiogroup" aria-label="Color">
          {products.map((x) => (
            <button
              key={x.slug}
              type="button"
              role="radio"
              aria-checked={x.slug === p.slug}
              aria-label={x.name}
              className={`mpdp__swatch ${x.slug === p.slug ? 'is-on' : ''}`}
              style={{ '--a': x.color, '--b': x.accent }}
              // a sibling sock: no washing-machine page transition, just the gallery crossfade
              onClick={() => x.slug !== p.slug && navigate(`/socks/${x.slug}`, { state: { swatch: true } })}
            >
              <span />
            </button>
          ))}
        </div>
      </div>

      <Description text={p.description} />
      <CareLabel p={p} />

      <div className="mpdp__rest">
        <h2 className="mpdp__rest-title">The rest of the line</h2>
        <ul className="mpdp__grid">
          {others.map((x) => (
            <li key={x.slug}>
              <Link to={`/socks/${x.slug}`} className="mpdp__card" style={{ '--sock': x.color }}>
                <span className="mpdp__card-img">
                  <img src={sockSrc(x.n, 400)} alt="" width="400" height="500" loading="lazy" />
                </span>
                <span className="mpdp__card-name">{x.name}</span>
                <span className="mpdp__card-price">{money(x.price)}</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>

      <div className="mpdp__bar">
        <div className="mpdp__bar-info">
          <b className="mpdp__bar-price" aria-live="polite">
            {money(buy.hud.price)}
          </b>
          <span className="mpdp__bar-hud">
            Hole {buy.hud.hole}% · Labor {laborClock(buy.hud.laborSec)} · Your wage <b>$0.00</b>
          </span>
        </div>
        <button type="button" className={`mpdp__btn mpdp__btn--primary ${buy.added ? 'is-in' : ''}`} onClick={buy.add} disabled={!buy.canAdd}>
          {buy.added ? 'In your basket ✓' : buy.hud.hole > 0 ? 'Add to basket' : 'Pull first'}
        </button>
      </div>
    </section>
  );
}
