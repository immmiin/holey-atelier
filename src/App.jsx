import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { Route, Routes, useLocation } from 'react-router';
import { MotionConfig } from 'motion/react';
import { CartProvider } from './context/CartContext.jsx';
import Grain from './components/Grain.jsx';
import Nav from './components/Nav.jsx';
import Footer from './components/Footer.jsx';
import BasketDrawer from './components/BasketDrawer.jsx';
import Toast from './components/Toast.jsx';
import HoleCursor from './components/HoleCursor.jsx';
import WashTransition from './components/WashTransition.jsx';
import Home from './pages/Home.jsx';
import { initScroll, scrollTo, scrollToTop, ScrollTrigger } from './lib/scroll.js';
import { toggleMute, unlockSound } from './atelier/sound.ts';

const Shop = lazy(() => import('./pages/Shop.jsx'));
const Product = lazy(() => import('./pages/Product.jsx'));
const About = lazy(() => import('./pages/About.jsx'));
const Faq = lazy(() => import('./pages/Faq.jsx'));
const Contact = lazy(() => import('./pages/Contact.jsx'));
const Checkout = lazy(() => import('./pages/Checkout.jsx'));
const Legal = lazy(() => import('./pages/Legal.jsx'));
const NotFound = lazy(() => import('./pages/NotFound.jsx'));

const samePage = (a, b) => a.pathname === b.pathname && a.search === b.search;

function scrollToHash(hash) {
  if (!hash) return;
  // give lazy sections a beat to mount
  setTimeout(() => {
    const el = document.getElementById(decodeURIComponent(hash.slice(1)));
    if (el) scrollTo(el, { offset: -100 });
  }, 120);
}

/* Routes render `shown`, which only catches up with the real location once the
   washing-machine door has closed over the screen. */
function WashedRoutes() {
  const location = useLocation();
  const [shown, setShown] = useState(location);
  const [phase, setPhase] = useState('idle');
  const pending = useRef(location);

  useEffect(() => {
    pending.current = location;
    if (samePage(location, shown)) {
      setShown(location);
      scrollToHash(location.hash);
      return;
    }
    setPhase((p) => (p === 'idle' ? 'cover' : p));
  }, [location]); // eslint-disable-line react-hooks/exhaustive-deps

  const covered = useCallback(() => {
    const next = pending.current;
    setShown(next);
    scrollToTop();
    setPhase('reveal');
  }, []);

  const revealed = useCallback(() => {
    // someone clicked again mid-spin: go round once more
    if (!samePage(pending.current, shown)) setPhase('cover');
    else setPhase('idle');
  }, [shown]);

  useEffect(() => {
    if (phase !== 'reveal') return undefined;
    scrollToHash(shown.hash);
    const t = setTimeout(() => ScrollTrigger.refresh(), 300);
    return () => clearTimeout(t);
  }, [phase, shown]);

  return (
    <>
      <main id="main" className="page" tabIndex={-1}>
        <Suspense fallback={<div className="page-loading" aria-busy="true" />}>
          <Routes location={shown}>
            <Route path="/" element={<Home />} />
            <Route path="/shop" element={<Shop />} />
            <Route path="/socks/:slug" element={<Product />} />
            <Route path="/products/:slug" element={<Product />} />
            <Route path="/about" element={<About />} />
            <Route path="/faq" element={<Faq />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/checkout" element={<Checkout />} />
            <Route path="/legal/:page" element={<Legal />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </main>
      <WashTransition phase={phase} onCovered={covered} onRevealed={revealed} />
    </>
  );
}

/* Sound is always on: the AudioContext starts on the first gesture (no autoplay block).
   "M" quietly mutes and unmutes; there is no visible control. */
function useAtelierSound() {
  useEffect(() => {
    const unlock = () => unlockSound();
    const key = (e) => {
      unlock();
      const t = e.target;
      if ((e.key === 'm' || e.key === 'M') && !e.metaKey && !e.ctrlKey && !(t instanceof HTMLElement && t.closest('input, textarea, select, [contenteditable]'))) {
        toggleMute();
      }
    };
    window.addEventListener('pointerdown', unlock, { capture: true });
    window.addEventListener('keydown', key, { capture: true });
    return () => {
      window.removeEventListener('pointerdown', unlock, { capture: true });
      window.removeEventListener('keydown', key, { capture: true });
    };
  }, []);
}

export default function App() {
  useAtelierSound();
  useEffect(() => {
    initScroll();
    document.fonts?.ready.then(() => ScrollTrigger.refresh());
    window.addEventListener('load', () => ScrollTrigger.refresh(), { once: true });
  }, []);

  return (
    <MotionConfig reducedMotion="user">
      <CartProvider>
        <a className="skip-link" href="#main">
          Skip to content
        </a>
        <Nav />
        <WashedRoutes />
        <Footer />
        <BasketDrawer />
        <Toast />
        <Grain />
        <HoleCursor />
      </CartProvider>
    </MotionConfig>
  );
}
