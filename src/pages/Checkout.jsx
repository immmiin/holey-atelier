import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { motion } from 'motion/react';
import Btn from '../components/Btn.jsx';
import { lineNote, linePrice, useCart } from '../context/CartContext.jsx';
import { bySlug, money, sockSrc } from '../data/products.js';
import { reducedMotion } from '../lib/scroll.js';
import useTitle from '../lib/useTitle.js';
import ReceiptPrint from '../atelier/ReceiptPrint.tsx';
import '@fontsource/jetbrains-mono/400.css';
import '@fontsource/jetbrains-mono/700.css';
import '../atelier/atelier.css';
import './checkout.css';

const KEY = 'holey-last-order-v2';

function readOrder() {
  try {
    return JSON.parse(sessionStorage.getItem(KEY) || 'null');
  } catch {
    return null;
  }
}

/** the cart, frozen into an order for the receipt */
function toOrder(lines) {
  return {
    id: `HOL-${String(1000 + Math.floor(Math.random() * 9000))}`,
    date: new Date().toISOString(),
    lines: lines.map((l) => {
      const p = bySlug[l.slug];
      return {
        slug: p.slug,
        n: p.n,
        name: p.name,
        base: p.price,
        price: linePrice(l),
        hole: l.hole,
        laborMs: l.laborMs,
        outline: l.outline
      };
    })
  };
}

/* Checkout: the order, a few fields filled in good faith, "Place order" — and then the receipt
   (the only place it prints). */
export default function Checkout() {
  useTitle('Checkout');
  const { lines, clear } = useCart();
  const navigate = useNavigate();
  const [order, setOrder] = useState(() => (lines.length ? null : readOrder()));
  const [phase, setPhase] = useState(() => (lines.length ? 'form' : readOrder() ? 'printed' : 'empty'));
  const [shipTo, setShipTo] = useState('');

  const place = (e) => {
    e.preventDefault();
    const o = toOrder(lines);
    try {
      sessionStorage.setItem(KEY, JSON.stringify(o));
    } catch {
      /* the receipt still prints */
    }
    setOrder(o);
    clear();
    setPhase('counting');
  };

  useEffect(() => {
    if (phase !== 'counting') return undefined;
    const t = setTimeout(() => setPhase('printed'), reducedMotion() ? 0 : 1100);
    return () => clearTimeout(t);
  }, [phase]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [phase]);

  if (phase === 'empty') {
    return (
      <section className="co co--empty">
        <img src="/logo/holey_04_nail-icon-holey.svg" alt="" className="co__empty-icon" />
        <h1 className="h2">Nothing to check out.</h1>
        <p className="lead">Your basket is empty, which is also very on brand.</p>
        <Btn to="/atelier">Pull a thread</Btn>
      </section>
    );
  }

  if (phase === 'counting') {
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

  if (phase === 'printed' && order) {
    return (
      <section className="cko cko--printed">
        <div className="cko__head">
          <p className="kicker">Order {order.id} · placed</p>
          <h1 className="h2">Here’s your receipt.</h1>
          <p className="lead">Your sock is on its way to find its other half. Estimated reunion: never, probably.</p>
        </div>
        <ReceiptPrint order={order} onBack={() => navigate('/atelier')} />
      </section>
    );
  }

  const subtotal = lines.reduce((t, l) => t + linePrice(l), 0);

  return (
    <section className="cko">
      <div className="cko__head">
        <p className="kicker">Checkout</p>
        <h1 className="h2">Almost yours.</h1>
      </div>
      <div className="cko__grid">
        <form className="cko__form" onSubmit={place}>
          <h2 className="h3">Details, roughly</h2>
          <label className="cko__field">
            <span>Name on the sock</span>
            <input value="You" readOnly aria-readonly="true" />
          </label>
          <label className="cko__field">
            <span>Ship to</span>
            <input value={shipTo} onChange={(e) => setShipTo(e.target.value)} placeholder="Wherever the other one went" autoComplete="off" />
          </label>
          <label className="cko__field">
            <span>Card number</span>
            <input value="•••• •••• •••• 0000" readOnly aria-readonly="true" />
            <small>Payment is taken in good faith. Declined, then approved.</small>
          </label>
          <label className="cko__check">
            <input type="checkbox" defaultChecked required />
            <span>I understand this is one sock.</span>
          </label>
          <button type="submit" className="abtn abtn-primary cko__place">
            Place order · {money(subtotal)}
          </button>
        </form>

        <aside className="cko__summary" aria-label="Order summary">
          <h2 className="h3">Your basket</h2>
          <ul>
            {lines.map((l) => {
              const p = bySlug[l.slug];
              const note = lineNote(l);
              return (
                <li key={l.slug}>
                  <span className="cko__thumb" style={{ background: p.color }}>
                    <img src={sockSrc(p.n, 400)} alt="" />
                  </span>
                  <span className="cko__name">
                    {p.name}
                    <small>{note || `${p.subtitle} · as sold`}</small>
                  </span>
                  <span className="cko__price">{money(linePrice(l))}</span>
                </li>
              );
            })}
          </ul>
          <div className="cko__row">
            <span>Shipping</span>
            <span>Free. It’s light.</span>
          </div>
          <div className="cko__row">
            <span>Artisan wage</span>
            <span className="cko__wage">$0.00</span>
          </div>
          <div className="cko__row cko__total">
            <span>Total</span>
            <span>{money(subtotal)}</span>
          </div>
        </aside>
      </div>
    </section>
  );
}
