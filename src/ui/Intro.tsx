import { useState } from 'react';

export default function Intro({ onEnter }: { onEnter: () => void }) {
  const [leaving, setLeaving] = useState(false);
  const enter = () => {
    if (leaving) return;
    setLeaving(true);
    onEnter();
  };
  return (
    <section className={`intro ${leaving ? 'is-leaving' : ''}`} aria-label="Holey">
      <div className="intro-inner">
        <img className="intro-sticker s-hole" src="/brand/stickers/holey-sticker-07_hole-included.svg" alt="" />
        <img className="intro-sticker s-yarn" src="/brand/stickers/holey-sticker-09_yarn.svg" alt="" />
        <img className="intro-sticker s-admit" src="/brand/stickers/holey-sticker-06_admit-one-foot.svg" alt="" />
        <h1 className="intro-logo">
          <img src="/brand/holey_05_bubble-pink.svg" alt="Holey" />
        </h1>
        <p className="intro-line">One sock. Hole included.</p>
        <p className="intro-sub">Now hand-distressed by you.</p>
        <button className="btn btn-primary intro-btn" onClick={enter} autoFocus>
          Enter the Atelier
        </button>
      </div>
    </section>
  );
}
