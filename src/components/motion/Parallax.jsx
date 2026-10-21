import { useLayoutEffect, useRef } from 'react';
import { gsap, reducedMotion } from '../../lib/scroll.js';

// Image inside a rounded outlined box that drifts + slowly scales as it
// passes through the viewport (Vibe: y ±7.5%, scale 1 → 1.18).
export default function Parallax({ className = '', children, style, amount = 0.075, scale = 1.18, as: Tag = 'div', ...rest }) {
  const ref = useRef(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || reducedMotion()) return;
    const img = el.querySelector('img');
    if (!img) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(
        img,
        { yPercent: -amount * 100, scale: 1 },
        {
          yPercent: amount * 100,
          scale,
          ease: 'none',
          scrollTrigger: { trigger: el, start: 'top bottom', end: 'bottom top', scrub: 0.4 }
        }
      );
    }, el);
    return () => ctx.revert();
  }, [amount, scale]);

  return (
    <Tag ref={ref} className={`box parallax ${className}`} style={style} {...rest}>
      {children}
    </Tag>
  );
}
