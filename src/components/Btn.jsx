import { forwardRef } from 'react';
import { Link } from 'react-router';
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

/**
 * <Btn> — sticker (default) or care-label button.
 * variant: 'sticker' | 'care' | 'ghost'; tone: 'hi' | 'pink' | 'green' | 'paper'
 */
const Btn = forwardRef(function Btn({ to, variant = 'sticker', tone = 'hi', tilt = -2, icon, children, className = '', ...rest }, ref) {
  const cls = `btn btn--${variant} btn--${tone} ${className}`;
  const inner = (
    <>
      {variant === 'care' && <TubIcon className="btn__care-icon" />}
      {icon}
      <span className="btn__label">{children}</span>
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
