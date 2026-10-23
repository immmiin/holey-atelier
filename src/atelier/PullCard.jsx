import { useEffect, useImperativeHandle, useRef, useState, forwardRef } from 'react';
import { PullStage } from './PullStage.ts';
import { sockModel } from './models.ts';
import { SOCKS } from './socks.ts';
import { distressedOf, newSeed, newSerial } from './distress.js';
import './pull-card.css';

/* The Atelier's pull scene in a card (product page): the sock hangs from a short line with its loose
   thread at the toe; pulling unravels it exactly as in the Atelier (same PullStage: stick-slip pops,
   heap on the card's floor, sound). The parent gets the live HUD (price, hole, labor) and an API:
   reset() and take() → the distressed basket line (freezes the sock). */

/** where things go in a card W×H (canvas coords) */
function layoutFor(W, H) {
  // desktop cards hang from a grommet at the top centre: the line runs just under it
  const ropeY = W < 560 ? Math.max(28, H * 0.08) : H * 0.17;
  const baseY = H * 0.93; // the heap's floor
  const sockH = (baseY - ropeY) * 0.62;
  const imgW = (sockH / 0.961) * 0.8;
  return { W, H, pinX: W / 2, lineYAt: () => ropeY, imgW, smallW: imgW / 2.4, baseY, offX: 0, offY: 0, mobile: W < 760, ropeY, inset: W < 560 ? 14 : 44 };
}

const PullCard = forwardRef(function PullCard({ product, onHud, onGrab, className = '' }, ref) {
  const wrap = useRef(null);
  const canvas = useRef(null);
  const stageRef = useRef(null);
  const hud = useRef(null);
  const ids = useRef({ serial: newSerial(), unravelSeed: newSeed() });
  const [rope, setRope] = useState({ w: 0, y: 28, inset: 14 });
  const onHudRef = useRef(onHud);
  onHudRef.current = onHud;
  const onGrabRef = useRef(onGrab);
  onGrabRef.current = onGrab;

  const def = SOCKS.find((s) => s.slug === product.slug);

  // one stage per card
  useEffect(() => {
    const stage = new PullStage(
      canvas.current,
      (h) => {
        hud.current = h;
        onHudRef.current?.(h);
      },
      (e) => e === 'grab' && onGrabRef.current?.()
    );
    stageRef.current = stage;
    window.__holeyCard = stage; // test hook, like the Atelier's window.__holey
    return () => stage.dispose();
  }, []);

  // (re)hang the sock: on mount, when the product changes, and on reset
  const [gen, setGen] = useState(0);
  useEffect(() => {
    const stage = stageRef.current, el = wrap.current;
    if (!stage || !el || !def) return undefined;
    let alive = true;
    stage.close();
    ids.current = { serial: newSerial(), unravelSeed: newSeed() };
    sockModel(def.id).then((m) => {
      if (!alive) return;
      const r = el.getBoundingClientRect();
      const L = layoutFor(r.width, r.height);
      setRope({ w: r.width, y: L.ropeY, inset: L.inset });
      stage.setLayout(L);
      stage.open(def, m, L);
    });
    return () => {
      alive = false;
    };
  }, [def, gen]);

  // keep the layout in step with the card's size
  useEffect(() => {
    const el = wrap.current;
    if (!el) return undefined;
    const ro = new ResizeObserver(() => {
      const r = el.getBoundingClientRect();
      if (!r.width || !r.height) return;
      const L = layoutFor(r.width, r.height);
      setRope({ w: r.width, y: L.ropeY, inset: L.inset });
      stageRef.current?.setLayout(L);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useImperativeHandle(ref, () => ({
    get stage() {
      return stageRef.current;
    },
    reset: () => setGen((g) => g + 1),
    /** freeze the sock and return its basket line, or null if nothing has been pulled yet */
    take() {
      const stage = stageRef.current, h = hud.current;
      if (!stage || !h || h.phase !== 'pull' || h.p <= 0) return null;
      stage.freeze();
      return distressedOf(stage, h, ids.current);
    },
    /** the sock's box on screen (for the fly-to-basket animation) */
    el: wrap.current
  }));

  return (
    <div ref={wrap} className={`pullcard ${className}`} style={{ '--sock': product.color }}>
      <svg className="pullcard__line" width={rope.w} height={rope.y + 12} aria-hidden="true">
        <path d={`M${rope.inset} ${rope.y} H${rope.w - rope.inset}`} />
        <circle cx={rope.inset} cy={rope.y} r="8" />
        <circle cx={rope.w - rope.inset} cy={rope.y} r="8" />
      </svg>
      <span className="pullcard__floor" aria-hidden="true" />
      <canvas
        ref={canvas}
        className="pullcard__stage"
        aria-label={`${product.name} hanging in the card. Drag its loose thread down, or hold Space, to unravel it and set your price.`}
      />
    </div>
  );
});

export default PullCard;
