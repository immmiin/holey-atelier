import { useLayoutEffect, useRef } from 'react';
import BounceText from '../components/motion/BounceText.jsx';
import Logo from '../components/Logo.jsx';
import { gsap, reducedMotion } from '../lib/scroll.js';

// Laundry-care symbols, drawn in the label's ink.
function Symbol({ kind }) {
  const common = { fill: 'none', stroke: 'currentColor', strokeWidth: 2.4, strokeLinecap: 'round', strokeLinejoin: 'round' };
  return (
    <svg viewBox="0 0 40 34" className="care__sym" aria-hidden="true" {...common}>
      {kind === 'tub' && (
        <>
          <path d="M3 6 7.5 30h25L37 6" />
          <path d="M4 11c3.6 3 6.4 3 9.8 0s6.4-3 9.8 0 6.4 3 10 0" />
          <text x="20" y="25" textAnchor="middle" fontSize="9" fontWeight="900" fill="currentColor" stroke="none">TOE</text>
        </>
      )}
      {kind === 'nopair' && (
        <>
          <path d="M20 4 37 30H3Z" />
          <path d="M6 4 34 31M34 4 6 31" />
        </>
      )}
      {kind === 'iron' && (
        <>
          <path d="M5 26h30l-4-13c-1-3-3-4-6-4H12" />
          <path d="M9 9h6" />
          <circle cx="16" cy="20" r="1.4" fill="currentColor" />
          <circle cx="23" cy="20" r="1.4" fill="currentColor" />
        </>
      )}
      {kind === 'tumble' && (
        <>
          <rect x="4" y="3" width="32" height="28" rx="3" />
          <circle cx="20" cy="17" r="9.5" />
          <path d="M14 10 26 24" />
        </>
      )}
      {kind === 'hand' && (
        <>
          <path d="M3 9 7.5 30h25L37 9" />
          <path d="M14 20c0-6 1.8-10 3-10s1.4 2.2 1.4 5V8.6c0-1.6 2.6-1.6 2.6 0V16v-5.4c0-1.6 2.6-1.6 2.6 0V17v-4c0-1.6 2.6-1.4 2.6.2 0 5-1 9-6 9.8-3.3.5-6.2-.7-6.2-3" />
        </>
      )}
    </svg>
  );
}

const rows = [
  { kind: 'tub', title: 'Breathable, aggressively.', body: 'The hole sits exactly where your big toe has been asking for air. We listened.' },
  { kind: 'nopair', title: 'Do not pair.', body: 'It doesn’t play favourites. Left, right, whichever one is cold. It picks one and commits.' },
  { kind: 'iron', title: 'Pre-distressed by hand.', body: 'Every hole is made on purpose, by someone who takes it very seriously. No two are alike. Neither are your feet.' },
  { kind: 'tumble', title: 'Tumble dry with caution.', body: 'That’s how the other one left. We don’t talk about it.' },
  { kind: 'hand', title: 'Half the pair, all the sock.', body: 'Fifty percent less sock than a regular pair. It didn’t give anything up getting there. Well. One thing.' }
];

export default function CareLabel() {
  const ref = useRef(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || reducedMotion()) return undefined;
    const ctx = gsap.context(() => {
      gsap.from('.care__label', {
        y: 120,
        rotate: 10,
        duration: 1.3,
        ease: 'elastic.out(1, 0.55)',
        scrollTrigger: { trigger: el, start: 'top 75%', once: true }
      });
      gsap.from('.care__row', {
        x: -40,
        opacity: 0,
        stagger: 0.1,
        duration: 0.7,
        ease: 'back.out(2.4)',
        scrollTrigger: { trigger: '.care__rows', start: 'top 85%', once: true }
      });
    }, el);
    return () => ctx.revert();
  }, []);

  return (
    <section ref={ref} className="care" id="care" aria-labelledby="care-title">
      <div className="care__intro">
        <p className="kicker">Read before wearing</p>
        <BounceText id="care-title" text={'Care\ninstructions.'} className="h2" />
        <p className="lead">Everything a sock should be. Minus a bit.</p>
        <div className="care__chips" aria-hidden="true">
          <span>100% one sock</span>
          <span>0% pair</span>
          <span>hole included</span>
        </div>
      </div>
      <div className="care__label stitched">
        <span className="care__fold" aria-hidden="true" />
        <div className="care__brand">
          <Logo />
          <span>ONE SIZE · ONE FOOT · MADE WITH FEELINGS</span>
        </div>
        <ul className="care__rows">
          {rows.map((r) => (
            <li key={r.kind} className="care__row">
              <Symbol kind={r.kind} />
              <div>
                <h3 className="care__title">{r.title}</h3>
                <p>{r.body}</p>
              </div>
            </li>
          ))}
        </ul>
        <p className="care__fine">80% cotton · 20% audacity · 0% refunds on feelings</p>
      </div>
    </section>
  );
}
