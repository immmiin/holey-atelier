import { useLayoutEffect, useRef } from 'react';
import { gsap, reducedMotion } from '../../lib/scroll.js';

// Letters drop in and land with an elastic squash when the heading scrolls into view.
export default function BounceText({ as: Tag = 'h2', text, className = '', delay = 0, immediate = false, ...rest }) {
  const ref = useRef(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || reducedMotion()) return undefined;
    const chars = el.querySelectorAll('.bt__c');
    const ctx = gsap.context(() => {
      gsap.from(chars, {
        yPercent: -120,
        scaleY: 1.4,
        scaleX: 0.7,
        rotate: () => gsap.utils.random(-25, 25),
        opacity: 0,
        duration: 1.1,
        delay,
        ease: 'elastic.out(1, 0.45)',
        stagger: 0.035,
        scrollTrigger: immediate ? undefined : { trigger: el, start: 'top 88%', once: true }
      });
    }, el);
    return () => ctx.revert();
  }, [text, delay, immediate]);

  const lines = text.split('\n');
  return (
    <Tag ref={ref} className={className} aria-label={text.replace(/\n/g, ' ')} {...rest}>
      {lines.map((line, li) => (
        <span key={li} aria-hidden="true" style={{ display: 'block' }}>
          {line.split(' ').map((w, wi, arr) => (
            <span key={wi} style={{ display: 'inline-block', whiteSpace: 'nowrap' }}>
              {[...w].map((c, ci) => (
                <span key={ci} className="bt__c" style={{ display: 'inline-block', transformOrigin: '50% 100%' }}>
                  {c}
                </span>
              ))}
              {wi < arr.length - 1 ? ' ' : null}
            </span>
          ))}
        </span>
      ))}
    </Tag>
  );
}
