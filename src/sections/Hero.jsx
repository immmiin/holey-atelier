import { useLayoutEffect, useRef } from 'react';
import Btn from '../components/Btn.jsx';
import BounceText from '../components/motion/BounceText.jsx';
import Pop from '../components/motion/Pop.jsx';
import Peek, { PeekHint } from '../components/Peek.jsx';
import { gsap, reducedMotion } from '../lib/scroll.js';
import Washer from './Washer.jsx';

export default function Hero() {
  const section = useRef(null);

  useLayoutEffect(() => {
    const el = section.current;
    if (!el || reducedMotion()) return undefined;
    const ctx = gsap.context(() => {
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
        <Peek
          className="hero2__peek"
          r={74}
          altClassName="hero2__alt display"
          alt={
            <>
              <span>Zero pairs.</span>
              <span>Full price.</span>
              <span>No refunds.</span>
            </>
          }
        >
          <BounceText as="h1" id="hero-title" immediate delay={0.15} text={'One sock.\nOne hole.\nNo refunds.'} className="display hero2__title" />
        </Peek>
        <PeekHint className="hero2__hint" />
        <p className="lead hero2__lead">
          The world’s most premium single sock, sold alone, on purpose. Now hand-distressed by you. <strong>From $9.</strong>
        </p>
        <div className="hero2__ctas">
          <Btn to="/atelier" variant="thread" pullTo="/atelier">
            Enter the Atelier
          </Btn>
          <Btn to="/shop" variant="care" tilt={1.5}>
            Shop the socks
          </Btn>
        </div>
      </div>

      <div className="hero2__machine">
        <Washer />
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
