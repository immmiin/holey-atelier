import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router';
import { AnimatePresence, motion, useAnimate } from 'motion/react';
import SockStage from '../components/sock3d/SockStage.jsx';
import Btn from '../components/Btn.jsx';
import BounceText from '../components/motion/BounceText.jsx';
import { Minus, Plus, Rotate } from '../components/Icons.jsx';
import Receipts from '../sections/Receipts.jsx';
import LineUp from '../sections/LineUp.jsx';
import NotFound from './NotFound.jsx';
import { bySlug, holeSrc, holeSrcSet, logoColor, money, products, sockSrc } from '../data/products.js';
import { useCart } from '../context/CartContext.jsx';
import { pushAccent } from '../lib/accent.js';
import { reducedMotion } from '../lib/scroll.js';
import useTitle from '../lib/useTitle.js';
import '../sections/home.css';
import './pages.css';

function galleryFor(p) {
  const g = [
    { kind: '3d', label: '360°' },
    { kind: 'img', src: holeSrc(p.n, 1000), srcSet: holeSrcSet(p.n), alt: `The hole in the toe of ${p.name}, up close.`, label: 'The hole' }
  ];
  if (p.n === 1) {
    g.push(
      { kind: 'img', src: '/img/lifestyle/life-1-1000.webp', alt: 'Two feet in Heel Yeah socks, toes out.', label: 'On foot' },
      { kind: 'img', src: '/img/lifestyle/life-2-1000.webp', alt: 'A Holey-painted toenail through the hole.', label: 'Toe detail' }
    );
  }
  return g;
}

// Quantity is locked at 1. Trying to change it earns a jelly wobble and a reminder.
function LockedQty() {
  const [scope, animate] = useAnimate();
  const [tip, setTip] = useState(0);
  const timer = useRef(0);
  useEffect(() => () => clearTimeout(timer.current), []);
  const nope = (dir) => {
    if (!reducedMotion()) {
      animate(
        scope.current,
        { scaleX: [1, 1.25, 0.85, 1.08, 0.97, 1], scaleY: [1, 0.78, 1.15, 0.94, 1.02, 1], x: [0, dir * 8, dir * -5, dir * 2, 0] },
        { duration: 0.6 }
      );
    }
    setTip((t) => t + 1);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setTip(0), 1900);
  };
  return (
    <div className="qty2">
      <div ref={scope} className="qty2__pill" role="group" aria-label="Quantity">
        <button type="button" onClick={() => nope(-1)} aria-label="Decrease quantity (it's one sock)">
          <Minus />
        </button>
        <output aria-live="polite">1</output>
        <button type="button" onClick={() => nope(1)} aria-label="Increase quantity (it's one sock)">
          <Plus />
        </button>
      </div>
      <AnimatePresence>
        {tip > 0 && (
          <motion.span
            key={tip}
            className="qty2__tip"
            role="status"
            initial={{ opacity: 0, scale: 0.3, rotate: -14, y: 10 }}
            animate={{ opacity: 1, scale: 1, rotate: -4, y: 0 }}
            exit={{ opacity: 0, scale: 0.6, y: 6 }}
            transition={{ type: 'spring', stiffness: 600, damping: 12 }}
          >
            It’s one sock.
          </motion.span>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function Product() {
  const { slug } = useParams();
  const p = bySlug[slug];
  useTitle(p ? p.name : 'Not found');
  const cart = useCart();
  const [active, setActive] = useState(0);
  const viewer = useRef(null);

  useEffect(() => setActive(0), [slug]);
  useEffect(() => (p ? pushAccent(logoColor(p)) : undefined), [p]);

  if (!p) return <NotFound />;
  const gallery = galleryFor(p);
  const cur = gallery[active] || gallery[0];
  const inCart = cart.has(p.slug);
  const others = products.filter((x) => x.slug !== p.slug);

  return (
    <>
      <section className="pdp2" style={{ '--sock': p.color }}>
        <div className="pdp2__left">
          <div className="pdp2__hang" aria-hidden="true" />
          <div className="pdp2__viewer" ref={viewer}>
            <span className="pdp2__grommet" aria-hidden="true" />
            {cur.kind === '3d' ? (
              <SockStage product={p} mode="drag" hint eager sizes="(min-width: 900px) 44vw, 92vw" />
            ) : (
              <motion.img
                key={cur.src}
                src={cur.src}
                srcSet={cur.srcSet}
                alt={cur.alt}
                className="pdp2__img"
                initial={{ opacity: 0, scale: 1.06, rotate: -2 }}
                animate={{ opacity: 1, scale: 1, rotate: 0 }}
                transition={{ type: 'spring', stiffness: 260, damping: 22 }}
              />
            )}
          </div>
          <div className="pdp2__thumbs" role="tablist" aria-label="Product views">
            {gallery.map((g, i) => (
              <button
                key={i}
                type="button"
                role="tab"
                aria-selected={active === i}
                className={`pdp2__thumb ${active === i ? 'is-active' : ''}`}
                style={{ '--tilt': `${[-4, 3, -2, 4][i]}deg` }}
                onClick={() => setActive(i)}
              >
                <span className="pdp2__thumb-img">
                  {g.kind === '3d' ? <img src={sockSrc(p.n, 400)} alt="" className="is-contain" /> : <img src={g.src} alt="" loading="lazy" />}
                  {g.kind === '3d' && <Rotate className="pdp2__thumb-icon" />}
                </span>
                <span className="pdp2__thumb-label">{g.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="pdp2__info">
          <p className="pdp2__chip">{p.subtitle}</p>
          <BounceText as="h1" immediate text={p.name} className="display pdp2__title" />
          <p className="lead">{p.description}</p>
          <div className="pdp2__label stitched">
            <p className="kicker">Care label</p>
            <dl>
              {p.specs.map(([k, v]) => (
                <div key={k}>
                  <dt>{k}</dt>
                  <dd>{v}</dd>
                </div>
              ))}
            </dl>
          </div>
          <div className="pdp2__buy">
            <p className="pdp2__price">{money(p.price)}</p>
            <LockedQty />
            <Btn className="pdp2__add" tone={inCart ? 'paper' : 'hi'} onClick={() => cart.add(p.slug, viewer.current)} aria-describedby="pdp-note">
              {inCart ? 'In your basket' : 'Add to basket'}
            </Btn>
          </div>
          <p id="pdp-note" className="small pdp2__note">
            {inCart ? 'Already yours. We only have the one.' : 'Ships alone, as intended. Free returns on the sock, not the feelings.'}
          </p>
        </div>
      </section>
      <Receipts title="Other people’s receipts." kicker="They bought one too" />
      <LineUp items={others} title="Also hanging around." kicker="Other singles in your area" />
    </>
  );
}
