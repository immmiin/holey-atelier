// Lenis smooth scroll wired into GSAP's ticker so ScrollTrigger stays in sync.
// Mirrors Vibe: lerp .1, only for fine pointers, never with reduced motion.
import Lenis from 'lenis';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

let lenis = null;
let tick = null;

export const reducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export function initScroll() {
  if (lenis || reducedMotion()) return;
  if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
  lenis = new Lenis({
    lerp: 0.1,
    smoothWheel: true,
    syncTouch: false,
    prevent: (node) => node.closest?.('[data-lenis-prevent]')
  });
  lenis.on('scroll', ScrollTrigger.update);
  tick = (time) => lenis.raf(time * 1000);
  gsap.ticker.add(tick);
  gsap.ticker.lagSmoothing(0);
}

export function destroyScroll() {
  if (!lenis) return;
  gsap.ticker.remove(tick);
  lenis.destroy();
  lenis = null;
}

export function scrollToTop() {
  if (lenis) lenis.scrollTo(0, { immediate: true, force: true });
  else window.scrollTo(0, 0);
}

export function scrollTo(target, opts = {}) {
  if (lenis) lenis.scrollTo(target, { offset: -90, ...opts });
  else {
    const el = typeof target === 'string' ? document.querySelector(target) : target;
    el?.scrollIntoView({ behavior: reducedMotion() ? 'auto' : 'smooth' });
  }
}

let locks = 0;
export function lockScroll() {
  locks++;
  lenis?.stop();
  document.documentElement.style.overflow = 'hidden';
}
export function unlockScroll() {
  locks = Math.max(0, locks - 1);
  if (locks) return;
  lenis?.start();
  document.documentElement.style.overflow = '';
}

export { gsap, ScrollTrigger };
