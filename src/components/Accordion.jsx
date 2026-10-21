import { useId, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import './accordion.css';

// Stacked tags that pop open on a spring.
export default function Accordion({ items, defaultOpen = 0 }) {
  const [open, setOpen] = useState(defaultOpen);
  const id = useId();
  return (
    <div className="acc2">
      {items.map((r, i) => {
        const isOpen = open === i;
        return (
          <div className={`acc2__item ${isOpen ? 'is-open' : ''}`} key={r.title} style={{ '--tilt': `${(i % 3) - 1}deg` }}>
            <h3 className="acc2__h">
              <button
                type="button"
                className="acc2__btn"
                aria-expanded={isOpen}
                aria-controls={`${id}-${i}`}
                id={`${id}-b-${i}`}
                onClick={() => setOpen(isOpen ? -1 : i)}
              >
                <span>{r.title}</span>
                <motion.span className="acc2__icon" animate={{ rotate: isOpen ? 135 : 0 }} transition={{ type: 'spring', stiffness: 500, damping: 12 }} aria-hidden="true">
                  +
                </motion.span>
              </button>
            </h3>
            <AnimatePresence initial={false}>
              {isOpen && (
                <motion.div
                  id={`${id}-${i}`}
                  role="region"
                  aria-labelledby={`${id}-b-${i}`}
                  className="acc2__panel"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ type: 'spring', stiffness: 360, damping: 26 }}
                >
                  <p className="acc2__body">{r.body}</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}
