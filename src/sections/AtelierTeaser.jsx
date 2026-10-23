import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import Clothesline from '../components/Clothesline.jsx';
import Btn from '../components/Btn.jsx';
import BounceText from '../components/motion/BounceText.jsx';
import LaborCounter from '../components/LaborCounter.jsx';
import TeaserPicker from './TeaserPicker.jsx';
import { products } from '../data/products.js';

// The only place the socks hang on the home page: "+" buys one as it is ($9); clicking a sock
// takes it to the Atelier to be distressed.
export default function AtelierTeaser() {
  const navigate = useNavigate();
  const line = useRef(null);
  const foot = useRef(null);
  // phones: one sock + colour swatches instead of the swipeable clothesline
  const [phone, setPhone] = useState(() => typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches);
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)');
    const on = () => setPhone(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);

  // the counter stays in normal flow; its top margin is measured so it sits exactly GAP below the
  // lowest price tag. Everything is measured against the stage, so the scroll position never matters;
  // the rope is pre-settled (Clothesline), so the first measurement is already the resting one.
  useEffect(() => {
    const GAP = 40;
    const fit = () => {
      const l = line.current, f = foot.current;
      if (!l || !f) return;
      const st = l.querySelector('.cl__stage');
      if (!st) {
        f.style.marginTop = ''; // the phone picker: plain CSS spacing
        return;
      }
      // mid-animation (the socks dropping in) the tags aren't where they'll rest
      if (l.getAnimations?.({ subtree: true }).some((a) => a.playState === 'running')) return;
      const top = st.getBoundingClientRect().top;
      const tags = [...l.querySelectorAll('.cl__tag')].map((t) => t.getBoundingClientRect().bottom - top);
      if (!tags.length) return;
      const lowest = Math.max(...tags);
      const below = l.getBoundingClientRect().bottom - top - lowest; // room the stage already leaves
      const next = Math.round(GAP - below);
      // the socks sway a pixel or two: only real layout changes move the counter
      if (f.style.marginTop && Math.abs(parseFloat(f.style.marginTop) - next) < 2) return;
      f.style.marginTop = `${next}px`;
    };
    // once right after mount (two frames: the stage has measured itself and drawn), then on resize
    let raf = requestAnimationFrame(() => (raf = requestAnimationFrame(fit)));
    const ro = new ResizeObserver(fit);
    if (line.current) ro.observe(line.current);
    window.addEventListener('resize', fit);
    // a safety net
    const timers = [400, 1200, 2500, 4000, 6000].map((ms) => setTimeout(fit, ms));
    const io = new IntersectionObserver(([e]) => e.isIntersecting && [900, 2200, 3600].forEach((ms) => timers.push(setTimeout(fit, ms))));
    if (line.current) io.observe(line.current);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      window.removeEventListener('resize', fit);
      timers.forEach(clearTimeout);
    };
  }, []);

  return (
    <section className="teaser" id="line" aria-labelledby="teaser-title">
      <div className="teaser__head wrap">
        <div>
          <p className="kicker">Today’s line-up · the Atelier</p>
          <BounceText id="teaser-title" text="Pull a thread." className="h2 teaser__title" />
        </div>
        <div className="teaser__side">
          <p className="lead">Tap “+” to buy one as it is. Or take it down and pull the loose thread: the less sock, the higher the price.</p>
          <Btn to="/atelier" variant="thread">
            Enter the Atelier →
          </Btn>
        </div>
      </div>
      <div ref={line} className="wrap teaser__line">
        {phone ? (
          <TeaserPicker items={products} />
        ) : (
          <Clothesline items={products} variant="teaser" onPick={(p) => navigate(`/atelier?sock=${p.slug}`)} />
        )}
      </div>
      <div ref={foot} className="wrap teaser__foot">
        <LaborCounter className="teaser__counter" />
      </div>
    </section>
  );
}
