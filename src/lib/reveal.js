// Scroll reveals: one IntersectionObserver, CSS transitions only, each element once.
// - generic text/cards get [data-rv] → fade in + rise 24px, staggered 60 ms within a section
// - a few containers get .is-in and run their own CSS (socks drop, poster pins, receipts print, …)
// Nothing runs for prefers-reduced-motion. Only opacity / translate / scale / rotate / clip-path animate.
import { reducedMotion } from './scroll.js';

const GENERIC = [
  '#main section :is(h2, h3, p, blockquote)',
  '#main :is(.note, .badge, .about__sock, .acc2__item, .arc__item)',
  'footer.foot :is(.ftag, .report, .foot__bottom)'
].join(',');
// these animate themselves (gsap, framer, canvas) or are interactive scenes
const SKIP = '.snaprow, .hero2, .atp, .cko, .co, .pdp2, .poster, .rv__item, .cl, .laundry, .missing__floor, .missing__out, .washer, .bdrawer, .arc__head, [data-noreveal]';
const ONCE = '.cl--teaser, .missing, .rv__row, .laundry, .seam';

export function startReveal() {
  if (typeof window === 'undefined' || reducedMotion() || !('IntersectionObserver' in window)) return () => {};
  const root = document.documentElement;
  root.classList.add('rv-on');

  const io = new IntersectionObserver(
    (entries) => {
      const perSection = new Map();
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        const el = e.target;
        io.unobserve(el);
        if (el.matches(ONCE)) {
          el.classList.add('is-in');
          continue;
        }
        const sec = el.closest('section, footer') || document.body;
        const k = perSection.get(sec) || 0;
        perSection.set(sec, k + 1);
        el.style.setProperty('--rv-d', `${Math.min(k, 8) * 60}ms`);
        el.classList.add('is-in');
        // hand the element back to its own styles (hover transitions etc.) once it has arrived
        const done = (ev) => {
          if (ev.target !== el) return;
          el.removeEventListener('transitionend', done);
          el.removeAttribute('data-rv');
          el.classList.remove('is-in');
          el.style.removeProperty('--rv-d');
        };
        el.addEventListener('transitionend', done);
      }
    },
    { threshold: 0.15, rootMargin: '0px 0px -6% 0px' }
  );

  const seen = new WeakSet();
  const scan = (node) => {
    if (!(node instanceof Element)) return;
    const found = [...(node.matches(GENERIC) || node.matches(ONCE) ? [node] : []), ...node.querySelectorAll(`${GENERIC}, ${ONCE}`)];
    for (const el of found) {
      if (seen.has(el)) continue;
      seen.add(el);
      if (el.matches(ONCE)) {
        io.observe(el);
        continue;
      }
      if (el.closest(SKIP) || el.querySelector('.bt__c')) continue;
      // nested targets: only the outermost one moves
      const outer = el.parentElement?.closest('[data-rv]');
      if (outer) continue;
      el.setAttribute('data-rv', '');
      io.observe(el);
    }
  };

  scan(document.body);
  const mo = new MutationObserver((muts) => {
    for (const m of muts) for (const n of m.addedNodes) scan(n);
  });
  mo.observe(document.body, { childList: true, subtree: true });
  return () => {
    mo.disconnect();
    io.disconnect();
    root.classList.remove('rv-on');
  };
}
