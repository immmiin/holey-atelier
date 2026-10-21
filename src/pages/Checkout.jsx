import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import Btn from '../components/Btn.jsx';
import { useCart } from '../context/CartContext.jsx';
import { bySlug, money, sockSrc } from '../data/products.js';
import { reducedMotion } from '../lib/scroll.js';
import useTitle from '../lib/useTitle.js';
import './checkout.css';

const KEY = 'holey-last-order';

function readOrder() {
  try {
    return JSON.parse(sessionStorage.getItem(KEY) || 'null');
  } catch {
    return null;
  }
}

export default function Checkout() {
  useTitle('Order placed');
  const { items, clear } = useCart();
  // freeze the cart into an order the moment we land here
  const [order] = useState(() => {
    if (items.length) {
      const o = { id: `HOLEY-${String(Date.now()).slice(-6)}`, items: [...items] };
      try {
        sessionStorage.setItem(KEY, JSON.stringify(o));
      } catch {
        /* fine */
      }
      return o;
    }
    return readOrder();
  });
  const [phase, setPhase] = useState(order && items.length ? 'processing' : 'done');

  useEffect(() => {
    if (items.length) clear();
    if (phase !== 'processing') return undefined;
    const t = setTimeout(() => setPhase('done'), reducedMotion() ? 0 : 1900);
    return () => clearTimeout(t);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (!order) {
    return (
      <section className="co co--empty">
        <img src="/logo/holey_04_nail-icon-holey.svg" alt="" className="co__empty-icon" />
        <h1 className="h2">Nothing to check out.</h1>
        <p className="lead">Your basket is empty, which is also very on brand.</p>
        <Btn to="/shop">Find the one</Btn>
      </section>
    );
  }

  const socks = order.items.map((s) => bySlug[s]).filter(Boolean);
  const total = socks.reduce((t, p) => t + p.price, 0);
  const lead = socks[0];

  if (phase === 'processing') {
    return (
      <section className="co co--processing" aria-live="polite">
        <motion.img
          src="/logo/holey_03_nail-icon-H.svg"
          alt=""
          className="co__spinner"
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1.1, ease: 'linear' }}
        />
        <p className="h3">Counting to one…</p>
        <p className="lead">No card needed. Payment is taken in good faith.</p>
      </section>
    );
  }

  return (
    <section className="co" style={{ '--sock': lead?.color || 'var(--pink)' }}>
      <div className="co__stage" aria-hidden="true">
        <svg className="co__path" viewBox="0 0 600 160" preserveAspectRatio="none">
          <path d="M40 120 C 180 -20, 380 220, 560 50" />
        </svg>
        <motion.div
          className="co__sock"
          initial={{ x: '-40%', rotate: -18, opacity: 0 }}
          animate={{ x: ['-40%', '0%', '-6%'], rotate: [-18, 6, -4], opacity: 1, y: [0, -14, 0] }}
          transition={{ default: { duration: 3.2, ease: 'easeInOut', repeat: Infinity, repeatType: 'mirror' }, opacity: { duration: 0.6 } }}
        >
          {lead && <img src={sockSrc(lead.n, 400)} alt="" />}
        </motion.div>
        <motion.div
          className="co__ghost"
          animate={{ opacity: [0.35, 0.9, 0.35], scale: [1, 1.03, 1] }}
          transition={{ duration: 2.4, repeat: Infinity }}
        >
          {lead && <img src={sockSrc(lead.n, 400)} alt="" />}
          <span>?</span>
        </motion.div>
      </div>

      <motion.div className="co__copy" initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.2 }}>
        <p className="kicker co__kicker">Order {order.id} · confirmed</p>
        <h1 className="co__title">Your sock is on its way to find its other half.</h1>
        <p className="co__sub lead">
          Estimated reunion: never, probably. We'll email you if it gets close. You were not charged — this is a school project, and the sock is
          fictional. Its feelings are not.
        </p>
      </motion.div>

      <motion.div className="co__receipt" initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.4 }}>
        <ul>
          {socks.map((p) => (
            <li key={p.slug}>
              <span className="co__thumb" style={{ background: p.color }}>
                <img src={sockSrc(p.n, 400)} alt="" />
              </span>
              <span className="co__name">
                {p.name}
                <span className="lead">{p.subtitle} · Qty 1</span>
              </span>
              <span className="lead">{money(p.price)}</span>
            </li>
          ))}
        </ul>
        <div className="co__row">
          <span className="lead">Shipping</span>
          <span className="lead">Free. It’s light.</span>
        </div>
        <div className="co__row co__total">
          <span>Total</span>
          <span>{money(total)}</span>
        </div>
        <div className="co__row">
          <span className="lead">Paid with</span>
          <span className="lead">Good faith (declined, then approved)</span>
        </div>
      </motion.div>

      <div className="co__cta">
        <Btn to="/shop">Lose another</Btn>
      </div>
    </section>
  );
}
