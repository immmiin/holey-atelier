import { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import Btn from '../components/Btn.jsx';
import BounceText from '../components/motion/BounceText.jsx';
import { sockSrc } from '../data/products.js';

const TABS = 8;
const PHONE = '1-800-ONE-SOCK';

function Tab({ i, torn, onTear }) {
  // a torn tab leaves a ragged stub behind and its paper falls away
  return (
    <div className="tab">
      {!torn ? (
        <button type="button" className="tab__paper" onClick={() => onTear(i)} aria-label={`Tear off tab ${i + 1}: ${PHONE}`}>
          <span>{PHONE}</span>
        </button>
      ) : (
        <span className="tab__stub" aria-hidden="true" />
      )}
    </div>
  );
}

export default function Missing() {
  const [torn, setTorn] = useState(() => Array(TABS).fill(false));
  const [falling, setFalling] = useState([]);
  const left = torn.filter((t) => !t).length;

  const tear = (i) => {
    setTorn((t) => t.map((v, k) => (k === i ? true : v)));
    setFalling((f) => [...f, { id: `${i}-${Date.now()}`, i, rot: (Math.random() - 0.5) * 80, x: (Math.random() - 0.5) * 120 }]);
  };

  return (
    <section className="missing" aria-labelledby="missing-title">
      <div className="missing__inner">
        <div className="poster">
          <span className="poster__pin poster__pin--l" aria-hidden="true" />
          <span className="poster__pin poster__pin--r" aria-hidden="true" />
          <BounceText as="h2" id="missing-title" text="MISSING" className="poster__title" />
          <p className="poster__sub">Have you seen this sock?</p>
          <div className="poster__photo">
            <img src={sockSrc(2, 800)} alt="Photocopied photo of the missing sock: blue swirls, brown heel." width="800" height="1000" loading="lazy" />
          </div>
          <dl className="poster__facts">
            <div>
              <dt>Name</dt>
              <dd>The Other One</dd>
            </div>
            <div>
              <dt>Last seen</dt>
              <dd>Dryer, Tuesday, around 4pm</dd>
            </div>
            <div>
              <dt>Answers to</dt>
              <dd>“Hey, where’s the—”</dd>
            </div>
            <div>
              <dt>Distinguishing marks</dt>
              <dd>Matches exactly one sock (ours)</dd>
            </div>
          </dl>
          <p className="poster__reward">
            Reward: <strong>$9</strong> <span>(or a sock of equal value)</span>
          </p>
          <div className="poster__tabs" role="group" aria-label={`Tear-off phone number tabs, ${left} left`}>
            {torn.map((t, i) => (
              <Tab key={i} i={i} torn={t} onTear={tear} />
            ))}
            <AnimatePresence>
              {falling.map((f) => (
                <motion.span
                  key={f.id}
                  className="tab__falling"
                  style={{ left: `${(f.i / TABS) * 100}%`, width: `${100 / TABS}%` }}
                  initial={{ y: 0, x: 0, rotate: 0, opacity: 1 }}
                  animate={{ y: [0, -20, 320], x: [0, f.x * 0.2, f.x], rotate: [0, f.rot * 0.2, f.rot * 2], opacity: [1, 1, 0] }}
                  transition={{ duration: 1.1, ease: ['easeOut', 'easeIn'], times: [0, 0.18, 1] }}
                  onAnimationComplete={() => setFalling((list) => list.filter((x) => x.id !== f.id))}
                  aria-hidden="true"
                >
                  <span>{PHONE}</span>
                </motion.span>
              ))}
            </AnimatePresence>
          </div>
        </div>

        <div className="missing__side">
          <p className="kicker">Notice board</p>
          <p className="h3">If found, do not return it.</p>
          <p className="lead">It’s happier this way. And honestly, so are we. Take a tab if you want. Nobody has called yet.</p>
          <AnimatePresence mode="wait">
            {left === 0 ? (
              <motion.div
                key="out"
                className="missing__out"
                initial={{ scale: 0.6, rotate: -10, opacity: 0 }}
                animate={{ scale: 1, rotate: -3, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 380, damping: 12 }}
                role="status"
              >
                <p>All tabs taken. Still nobody’s called.</p>
                <Btn tone="pink" tilt={2} onClick={() => setTorn(Array(TABS).fill(false))}>
                  Print another
                </Btn>
              </motion.div>
            ) : (
              <motion.p key="count" className="missing__count" aria-live="polite" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <strong>{left}</strong> {left === 1 ? 'tab' : 'tabs'} left
              </motion.p>
            )}
          </AnimatePresence>
          <figure className="polaroid missing__polaroid">
            <span className="tape" style={{ top: -12, left: 20, rotate: '-8deg' }} />
            <img src="/img/lifestyle/life-1-top-600.webp" alt="The last known photo of both socks together." width="600" height="330" loading="lazy" />
            <figcaption>last known photo, together</figcaption>
          </figure>
        </div>
      </div>
    </section>
  );
}
