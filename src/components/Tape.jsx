import './tape.css';

// A strip of printed packing tape running across the page.
export default function Tape({ items, tone = 'hi', tilt = -2.5, speed = 32, reverse = false, className = '' }) {
  const run = Array.from({ length: 4 }, () => items).flat();
  const strip = (hidden) => (
    <div className="tapem__strip" aria-hidden={hidden || undefined}>
      {run.map((t, i) => (
        <span key={i} className="tapem__item">
          {t}
          <img src="/logo/holey_03_nail-icon-H.svg" alt="" width="22" height="25" />
        </span>
      ))}
    </div>
  );
  return (
    <div className="tapem-clip">
    <div className={`tapem tapem--${tone} ${className}`} style={{ '--tilt': `${tilt}deg`, '--speed': `${speed}s`, '--dir': reverse ? 'reverse' : 'normal' }} role="marquee" aria-label={items.join(', ')}>
      <div className="tapem__track" aria-hidden="true">
        {strip(false)}
        {strip(true)}
      </div>
    </div>
    </div>
  );
}
