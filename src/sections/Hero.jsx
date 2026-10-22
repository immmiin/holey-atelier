import { useLayoutEffect, useRef } from 'react';
import Btn from '../components/Btn.jsx';
import BounceText from '../components/motion/BounceText.jsx';
import Pop from '../components/motion/Pop.jsx';
import SockStage from '../components/sock3d/SockStage.jsx';
import { products } from '../data/products.js';
import { gsap, reducedMotion } from '../lib/scroll.js';

const featured = products[0];
const BUBBLES = [
  [12, 70, 26], [24, 82, 14], [70, 76, 20], [82, 60, 12], [60, 88, 30], [36, 66, 10], [88, 40, 16], [16, 40, 12]
];

export default function Hero() {
  const section = useRef(null);

  useLayoutEffect(() => {
    const el = section.current;
    if (!el || reducedMotion()) return undefined;
    const ctx = gsap.context(() => {
      const st = { trigger: el, start: 'top top', end: 'bottom top', scrub: 0.5 };
      gsap.to('.drum-holes', { rotate: 540, ease: 'none', scrollTrigger: st });
      gsap.to('.machine__knob', { rotate: 300, ease: 'none', scrollTrigger: st });
      gsap.to('.machine', { y: 60, rotate: 3, ease: 'none', scrollTrigger: st });
      gsap.from('.machine', { y: 80, rotate: -8, scale: 0.85, opacity: 0, duration: 1.2, ease: 'elastic.out(1, 0.6)', delay: 0.1 });
      gsap.from('.hero2__lead, .hero2__ctas', { y: 30, opacity: 0, duration: 0.8, stagger: 0.12, delay: 0.7, ease: 'back.out(2)' });
    }, el);
    return () => ctx.revert();
  }, []);

  return (
    <section ref={section} className="hero2" aria-labelledby="hero-title">
      <div className="hero2__text">
        <p className="kicker hero2__kicker">
          <span>Est. one sock ago</span>
        </p>
        <BounceText as="h1" id="hero-title" immediate delay={0.15} text={'One sock.\nOne hole.\nNo refunds.'} className="display hero2__title" />
        <p className="lead hero2__lead">
          The world’s most premium single sock, sold alone, on purpose. Now hand-distressed by you. <strong>From $9.</strong>
        </p>
        <div className="hero2__ctas">
          <Btn to="/atelier">Enter the Atelier</Btn>
          <Btn to="/shop" variant="care" tilt={1.5}>
            Shop the socks
          </Btn>
        </div>
      </div>

      <div className="hero2__machine">
        <div className="machine">
          <div className="machine__panel" aria-hidden="true">
            <span className="machine__knob">
              <i />
            </span>
            <span className="machine__screen">SPIN · 1 SOCK</span>
            <span className="machine__lights">
              <i />
              <i />
              <i />
            </span>
          </div>
          <div className="porthole">
            <div className="porthole__glass">
              <svg className="drum-holes" viewBox="0 0 200 200" aria-hidden="true">
                {[34, 56, 78, 96].map((r, k) => (
                  <circle key={r} cx="100" cy="100" r={r} strokeDasharray={`${1.3 + k * 0.5} ${6 + k * 2.4}`} />
                ))}
              </svg>
              {BUBBLES.map(([x, y, s], i) => (
                <span key={i} className="porthole__bubble" style={{ left: `${x}%`, top: `${y}%`, width: s, height: s, animationDelay: `${i * 0.37}s` }} />
              ))}
              <div className="porthole__sock">
                <SockStage
                  product={featured}
                  mode="scroll"
                  trigger={section}
                  scrollStart="top top"
                  scrollEnd="bottom top"
                  turns={1.25}
                  base={-0.35}
                  eager
                  shadow={false}
                  zoom={1.08}
                  sizes="(min-width: 900px) 34vw, 70vw"
                />
              </div>
              <span className="porthole__glare" aria-hidden="true" />
            </div>
          </div>
          <span className="machine__feet" aria-hidden="true" />
        </div>
        <Pop className="hero2__sticker" rotate={14} delay={0.9}>
          <img src="/logo/holey_07_nail-icon-H-exclaim.svg" alt="" width="1200" height="930" />
        </Pop>
        <figure className="polaroid hero2__polaroid">
          <span className="tape" style={{ top: -12, left: '50%', translate: '-50% 0', rotate: '-4deg' }} />
          <img src="/img/lifestyle/life-2-toe-600.webp" alt="A pink toenail painted with the Holey logo, poking through the hole." width="600" height="500" />
          <figcaption>exhibit A: the toe</figcaption>
        </figure>
      </div>
    </section>
  );
}
