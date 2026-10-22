import { useState } from 'react';
import { Link } from 'react-router';
import { AnimatePresence, motion } from 'motion/react';
import { products } from '../data/products.js';
import Btn from './Btn.jsx';
import { Instagram, TikTok, XLogo } from './Icons.jsx';
import './footer.css';

function Report() {
  const [email, setEmail] = useState('');
  const [state, setState] = useState('idle');
  const submit = (e) => {
    e.preventDefault();
    if (!/^\S+@\S+\.\S+$/.test(email)) return setState('error');
    setState('done');
  };
  return (
    <div className="report card-ink">
      <p className="kicker report__kicker">Form LS-1 · Lost sock report</p>
      <AnimatePresence mode="wait" initial={false}>
        {state === 'done' ? (
          <motion.div
            key="done"
            className="report__done"
            role="status"
            initial={{ scale: 0.6, rotate: -8, opacity: 0 }}
            animate={{ scale: 1, rotate: -2, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 420, damping: 13 }}
          >
            <span className="report__stamp">Filed</span>
            <p>You’re on the list. We’ll email you the moment we lose more socks.</p>
            <button type="button" className="report__again" onClick={() => (setEmail(''), setState('idle'))}>
              File another
            </button>
          </motion.div>
        ) : (
          <motion.form key="form" onSubmit={submit} noValidate exit={{ opacity: 0, y: -10 }}>
            <label className="report__field">
              <span>Get notified when we lose more socks.</span>
              <input
                type="email"
                name="email"
                autoComplete="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => (setEmail(e.target.value), state === 'error' && setState('idle'))}
                aria-invalid={state === 'error' || undefined}
                aria-describedby="report-msg"
              />
            </label>
            <div className="report__row">
              <p id="report-msg" className="report__msg small" aria-live="polite">
                {state === 'error' ? 'That email has a hole in it.' : 'No spam. Just grief.'}
              </p>
              <Btn type="submit" tone="pink" tilt={2}>
                Report it
              </Btn>
            </div>
          </motion.form>
        )}
      </AnimatePresence>
    </div>
  );
}

function TagList({ title, children, tilt }) {
  return (
    <div className="ftag" style={{ '--tilt': `${tilt}deg` }}>
      <span className="ftag__hole" aria-hidden="true" />
      <p className="ftag__title">{title}</p>
      <ul>{children}</ul>
    </div>
  );
}

export default function Footer() {
  return (
    <footer className="foot">
      <svg className="foot__wave" viewBox="0 0 1440 60" preserveAspectRatio="none" aria-hidden="true">
        <path d="M0 60V30C80 6 160 6 240 30s160 24 240 0 160-24 240 0 160 24 240 0 160-24 240 0 160 24 240 0v30Z" />
      </svg>
      <div className="foot__inner wrap">
        <div className="foot__top">
          <h2 className="h2 foot__title">
            Lost a sock?
            <br />
            So did we.
          </h2>
          <Report />
        </div>

        <div className="foot__tags">
          <TagList title="Socks" tilt={-3}>
            {products.map((p) => (
              <li key={p.slug}>
                <Link to={`/socks/${p.slug}`}>{p.name}</Link>
              </li>
            ))}
          </TagList>
          <TagList title="Holey" tilt={2}>
            <li><Link to="/shop">Shop all</Link></li>
            <li><Link to="/about">About</Link></li>
            <li><Link to="/faq">FAQ</Link></li>
            <li><Link to="/atelier">The Atelier</Link></li>
            <li><Link to="/contact">Contact</Link></li>
          </TagList>
          <TagList title="Fine print" tilt={-1.5}>
            <li><Link to="/legal/terms">Terms of Wear</Link></li>
            <li><Link to="/legal/privacy">Privacy (Toes Excluded)</Link></li>
            <li><Link to="/legal/returns">Returns &amp; Feelings</Link></li>
          </TagList>
          <img className="foot__bubble" src="/logo/holey_05_bubble-pink.svg" alt="Holey" width="1620" height="930" loading="lazy" />
        </div>

        <div className="foot__bottom">
          <div className="foot__social">
            <a className="round-btn" href="https://instagram.com/" target="_blank" rel="noreferrer" aria-label="Instagram (fake account)">
              <Instagram />
            </a>
            <a className="round-btn" href="https://tiktok.com/" target="_blank" rel="noreferrer" aria-label="TikTok (fake account)">
              <TikTok />
            </a>
            <a className="round-btn" href="https://x.com/" target="_blank" rel="noreferrer" aria-label="X (fake account)">
              <XLogo />
            </a>
          </div>
          <p className="small">© {new Date().getFullYear()} Holey. One sock reserved. A graphic design school project — no socks were sold.</p>
        </div>
      </div>
    </footer>
  );
}
