import { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import Btn from '../components/Btn.jsx';
import BounceText from '../components/motion/BounceText.jsx';
import useTitle from '../lib/useTitle.js';
import './pages.css';

export default function Contact() {
  useTitle('Contact');
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState('');

  const submit = (e) => {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    if (!/^\S+@\S+\.\S+$/.test(String(data.get('email') || ''))) {
      setErr('We need an email that works. Unlike the other sock, we will write back.');
      return;
    }
    setErr('');
    setSent(true);
  };

  return (
    <section className="contact2 wrap">
      <div>
        <p className="kicker">Press · wholesale · sightings · emotional support</p>
        <BounceText as="h1" immediate text="Write to us." className="display" />
        <p className="lead">We reply within 3–5 business days, or once, depending.</p>
      </div>
      <AnimatePresence mode="wait">
        {sent ? (
          <motion.div
            key="ok"
            className="contact2__done card-ink"
            initial={{ scale: 0.6, rotate: -8, opacity: 0 }}
            animate={{ scale: 1, rotate: -2, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 360, damping: 13 }}
            role="status"
          >
            <span className="contact2__stamp">Received</span>
            <p className="h3">Message received.</p>
            <p>We’ll get back to you. Like the other sock: eventually, maybe.</p>
            <Btn to="/shop">Back to the sock</Btn>
          </motion.div>
        ) : (
          <motion.form key="form" className="contact2__form card-ink" onSubmit={submit} noValidate exit={{ opacity: 0, y: -12, rotate: 3 }}>
            <div className="contact2__row">
              <label className="field2">
                <span>Name</span>
                <input name="name" autoComplete="name" />
              </label>
              <label className="field2">
                <span>Email *</span>
                <input name="email" type="email" autoComplete="email" required aria-invalid={!!err || undefined} aria-describedby="contact-err" />
              </label>
            </div>
            <label className="field2">
              <span>Message</span>
              <textarea name="comment" rows="5" placeholder="Describe the missing sock in as much detail as you can bear." />
            </label>
            <p id="contact-err" className="small contact2__err" aria-live="polite">
              {err}
            </p>
            <Btn type="submit" tone="pink">
              Send it
            </Btn>
          </motion.form>
        )}
      </AnimatePresence>
    </section>
  );
}
