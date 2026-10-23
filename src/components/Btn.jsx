import { forwardRef, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router';
import { reducedMotion } from '../lib/scroll.js';
import { pinClick, unlockSound } from '../atelier/sound';
import { motion } from 'motion/react';
import './btn.css';

const MotionLink = motion.create(Link);

// press = squash, release = pop back (spring with low damping so it wobbles)
const press = { scaleX: 1.12, scaleY: 0.82, x: 3, y: 4 };
const hover = { rotate: 0, y: -2 };
const spring = { type: 'spring', stiffness: 520, damping: 11, mass: 0.7 };

// Laundry-care "wash tub" symbol for care-label buttons
export function TubIcon(props) {
  return (
    <svg viewBox="0 0 32 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      <path d="M2 4 5.5 21h21L30 4" />
      <path d="M3 8c3 2.4 5.4 2.4 8.2 0s5.4-2.4 8.2 0 5.4 2.4 8.4 0" />
    </svg>
  );
}

/* the "Pull a thread" signature: a short 2-ply yarn tail hanging off the bottom-right corner */
export function YarnTail() {
  return (
    <span className="btn__tail" aria-hidden="true">
      <svg viewBox="0 0 14 30" fill="none" strokeLinecap="round">
        <path className="btn__ply btn__ply--a" d="M5 1c3 3-3 6 0 9s-3 6 0 9 -3 6 0 9" />
        <path className="btn__ply btn__ply--b" d="M9 1c-3 3 3 6 0 9s3 6 0 9 3 6 0 9" />
      </svg>
    </span>
  );
}

const PULL_AT = 60; // px of pull that opens the Atelier

/* The yarn tail you can pull to enter: drag it down and it stretches while the pill dips a little
   (spring); past ~60px a soft pop, the pill bounces back and you're in the Atelier. Let go earlier and
   it springs back. A plain click on the pill still works; with reduced motion it's click only. */
export function PullTail({ to = '/atelier' }) {
  const tail = useRef(null);
  const navigate = useNavigate();
  useEffect(() => {
    const t = tail.current;
    if (!t || reducedMotion()) return undefined;
    const host = t.closest('a, button');
    let d = null;
    const set = (dy) => {
      t.style.transform = `scaleY(${(1 + dy / 22).toFixed(3)})`;
      if (host) host.style.translate = `0 ${Math.min(10, dy * 0.16).toFixed(1)}px`;
    };
    const springBack = (fromDy, bounce) => {
      t.style.transform = '';
      t.animate([{ transform: `scaleY(${1 + fromDy / 22})` }, { transform: 'scaleY(0.85)' }, { transform: 'scaleY(1)' }], { duration: 420, easing: 'cubic-bezier(0.3, 1.6, 0.5, 1)' });
      if (host) {
        const from = Math.min(10, fromDy * 0.16);
        host.style.translate = '';
        host.animate([{ translate: `0 ${from}px` }, { translate: `0 ${bounce ? -7 : -2}px` }, { translate: '0 0' }], { duration: bounce ? 380 : 320, easing: 'ease-out' });
      }
    };
    const down = (e) => {
      if (e.button && e.button !== 0) return;
      // the pill itself shouldn't squash or navigate: this is a pull, not a press
      e.stopPropagation();
      e.preventDefault();
      unlockSound();
      t.setPointerCapture(e.pointerId);
      d = { id: e.pointerId, y0: e.clientY, dy: 0, moved: false };
    };
    const move = (e) => {
      if (!d || e.pointerId !== d.id) return;
      d.dy = Math.max(0, e.clientY - d.y0);
      if (d.dy > 4) d.moved = true;
      if (d.dy >= PULL_AT) {
        const dy = d.dy;
        d = null;
        pinClick();
        springBack(dy, true);
        setTimeout(() => navigate(to), 160);
        return;
      }
      set(d.dy);
    };
    const up = (e) => {
      if (!d || e.pointerId !== d.id) return;
      const { dy, moved } = d;
      d = null;
      springBack(dy, false);
      // a pull that didn't make it isn't a click either
      if (moved && host) host.addEventListener('click', (ev) => (ev.preventDefault(), ev.stopPropagation()), { capture: true, once: true });
    };
    // native listeners, so they run before the pill's own (motion) press handlers
    t.addEventListener('pointerdown', down);
    t.addEventListener('pointermove', move);
    t.addEventListener('pointerup', up);
    t.addEventListener('pointercancel', up);
    t.addEventListener('click', (e) => e.preventDefault());
    return () => {
      t.removeEventListener('pointerdown', down);
      t.removeEventListener('pointermove', move);
      t.removeEventListener('pointerup', up);
      t.removeEventListener('pointercancel', up);
    };
  }, [navigate, to]);
  return (
    <span ref={tail} className="btn__tail btn__tail--pull" aria-hidden="true" title="Pull to enter">
      <svg viewBox="0 0 14 30" fill="none" strokeLinecap="round">
        <path className="btn__ply btn__ply--a" d="M5 1c3 3-3 6 0 9s-3 6 0 9 -3 6 0 9" />
        <path className="btn__ply btn__ply--b" d="M9 1c-3 3 3 6 0 9s3 6 0 9 3 6 0 9" />
      </svg>
    </span>
  );
}

/**
 * <Btn> — sticker (default), care-label, or the "thread" signature button.
 * variant: 'sticker' | 'care' | 'ghost' | 'thread' (every CTA into the Atelier); tone: 'hi' | 'pink' | 'green' | 'paper'
 */
const Btn = forwardRef(function Btn({ to, variant = 'sticker', tone = 'hi', tilt = -2, icon, children, className = '', pullTo, ...rest }, ref) {
  const cls = `btn btn--${variant} btn--${tone} ${className}`;
  const inner = (
    <>
      {variant === 'care' && <TubIcon className="btn__care-icon" />}
      {icon}
      <span className="btn__label">{children}</span>
      {variant === 'thread' && (pullTo ? <PullTail to={pullTo} /> : <YarnTail />)}
    </>
  );
  const motionProps = {
    initial: { rotate: tilt },
    whileHover: hover,
    whileTap: press,
    transition: spring
  };
  if (to) {
    return (
      <MotionLink ref={ref} to={to} className={cls} {...motionProps} {...rest}>
        {inner}
      </MotionLink>
    );
  }
  return (
    <motion.button ref={ref} type="button" className={cls} {...motionProps} {...rest}>
      {inner}
    </motion.button>
  );
});

export default Btn;
