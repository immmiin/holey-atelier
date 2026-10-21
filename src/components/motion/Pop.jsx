import { useLayoutEffect, useRef } from 'react';
import { gsap, reducedMotion } from '../../lib/scroll.js';

// Stickers and badges pop in with a little overshoot when they scroll into view.
export default function Pop({ as: Tag = 'div', className = '', rotate = -10, delay = 0.1, children, ...rest }) {
  const ref = useRef(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || reducedMotion()) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(
        el,
        { scale: 0, rotate: rotate - 40 },
        {
          scale: 1,
          rotate,
          duration: 0.7,
          delay,
          ease: 'back.out(2.2)',
          scrollTrigger: { trigger: el, start: 'top 92%', once: true }
        }
      );
    }, el);
    return () => ctx.revert();
  }, [rotate, delay]);

  return (
    <Tag ref={ref} className={className} style={{ transform: `rotate(${rotate}deg)` }} {...rest}>
      {children}
    </Tag>
  );
}
