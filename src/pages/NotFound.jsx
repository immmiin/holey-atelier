import { motion } from 'motion/react';
import { useLocation } from 'react-router';
import Btn from '../components/Btn.jsx';
import { reducedMotion } from '../lib/scroll.js';
import useTitle from '../lib/useTitle.js';
import '../sections/home.css';
import './pages.css';

// 404, as a MISSING poster for the page itself.
export default function NotFound() {
  useTitle('Page not found');
  const { pathname } = useLocation();
  const still = reducedMotion();
  return (
    <section className="missing nf3" aria-labelledby="nf-title">
      <div className="missing__inner">
        <div className="poster">
          <span className="poster__pin poster__pin--l" aria-hidden="true" />
          <span className="poster__pin poster__pin--r" aria-hidden="true" />
          <p className="poster__title" aria-hidden="true">
            MISSING
          </p>
          <h1 id="nf-title" className="poster__sub">
            This page went missing in the wash.
          </h1>
          <div className="poster__photo nf3__photo" aria-hidden="true">
            <div className="nf2__code">
              <span>4</span>
              <span className="nf2__hole">
                <svg viewBox="0 0 200 200" className="nf2__stitch">
                  <circle cx="100" cy="100" r="92" />
                </svg>
                <motion.img
                  src="/logo/holey_03_nail-icon-H.svg"
                  alt=""
                  className="nf2__toe"
                  animate={still ? undefined : { y: ['34%', '2%', '2%', '34%'], rotate: [-6, 5, -3, -6], scaleY: [1, 1.08, 1, 1] }}
                  transition={{ duration: 3.2, repeat: Infinity, times: [0, 0.3, 0.7, 1], ease: 'easeInOut' }}
                />
              </span>
              <span>4</span>
            </div>
          </div>
          <dl className="poster__facts">
            <div>
              <dt>Name</dt>
              <dd>{pathname.length > 28 ? `${pathname.slice(0, 26)}…` : pathname}</dd>
            </div>
            <div>
              <dt>Last seen</dt>
              <dd>In the wash, on the delicate cycle</dd>
            </div>
            <div>
              <dt>Answers to</dt>
              <dd>“404”</dd>
            </div>
          </dl>
          <p className="poster__reward">
            Reward: <strong>$0.00</strong> <span>(same as our artisans)</span>
          </p>
        </div>

        <div className="missing__side">
          <p className="kicker">Error 404</p>
          <p className="h3">If found, keep it.</p>
          <p className="lead">The link may be wrong, or the page wandered off like the other sock. It happens to the best of us.</p>
          <div className="nf3__ctas">
            <Btn to="/">Back home</Btn>
            <Btn to="/atelier" variant="care" tilt={1.5}>
              Pull a thread
            </Btn>
          </div>
        </div>
      </div>
    </section>
  );
}
