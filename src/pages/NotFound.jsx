import { motion } from 'motion/react';
import Btn from '../components/Btn.jsx';
import LineUp from '../sections/LineUp.jsx';
import { products } from '../data/products.js';
import { reducedMotion } from '../lib/scroll.js';
import useTitle from '../lib/useTitle.js';
import '../sections/home.css';
import './pages.css';

export default function NotFound() {
  useTitle('Page not found');
  const still = reducedMotion();
  return (
    <>
      <section className="nf2 wrap">
        <p className="kicker">Error 404</p>
        <div className="nf2__code" aria-hidden="true">
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
        <h1 className="h2 nf2__title">This page has a hole in it.</h1>
        <p className="lead">The link may be wrong, or the page wandered off like the other sock. It happens to the best of us.</p>
        <Btn to="/shop">Continue shopping</Btn>
      </section>
      <LineUp items={products.slice(2, 5)} title="Try one of these instead." kicker="Still hanging" cta={false} />
    </>
  );
}
