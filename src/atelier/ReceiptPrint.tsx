import { useEffect, useRef, useState } from 'react';
import { printerStep } from './sound';
import { type Order, RECEIPT_W, clock, drawReceipt, money, orderTotal, receiptPNG, split } from './receiptDraw';

const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* The receipt feeds out of a printer slot a line at a time, with printer chatter. */
export default function ReceiptPrint({ order, onBack }: { order: Order; onBack: () => void }) {
  const cvRef = useRef<HTMLCanvasElement>(null);
  const [h, setH] = useState(0);
  const [fed, setFed] = useState(0);
  const [saving, setSaving] = useState(false);
  const done = h > 0 && fed >= h;

  useEffect(() => {
    let alive = true;
    (async () => {
      const H = await drawReceipt(null, order);
      const cv = cvRef.current;
      if (!alive || !cv) return;
      const dpr = Math.min(3, window.devicePixelRatio || 1);
      cv.width = RECEIPT_W * dpr;
      cv.height = H * dpr;
      const ctx = cv.getContext('2d')!;
      ctx.scale(dpr, dpr);
      await drawReceipt(ctx, order);
      if (alive) setH(H);
    })();
    return () => {
      alive = false;
    };
  }, [order]);

  useEffect(() => {
    if (!h) return undefined;
    if (reduced()) {
      printerStep();
      setFed(h);
      return undefined;
    }
    let f = 0;
    const id = setInterval(() => {
      f = Math.min(h, f + 15 + Math.random() * 10);
      setFed(f);
      printerStep();
      if (f >= h) clearInterval(id);
    }, 55);
    return () => clearInterval(id);
  }, [h]);

  const save = async () => {
    setSaving(true);
    try {
      const blob = await receiptPNG(order);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `holey-receipt-${order.id}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 4000);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rprint">
      <div className="rprint__printer" aria-hidden="true">
        <span className="rprint__slot" />
      </div>
      <div className="rprint__feed" style={{ height: h ? fed : 0 }}>
        <div className="rprint__shadow">
          <canvas ref={cvRef} className="rprint__paper" style={{ width: RECEIPT_W, height: h || undefined }} aria-hidden="true" />
        </div>
      </div>
      {/* the same receipt, for screen readers */}
      <ul className="sr-only" aria-label={`Receipt ${order.id}`}>
        {order.lines.map((l) => (
          <li key={l.slug}>
            1 × {l.name}, {money(l.base)}
            {l.hole != null &&
              `; hand-distressing ${l.hole}%, ${money(split(l).distressing)}; labor ${clock(l.laborMs ?? 0)}, $0.00; brand premium ${money(split(l).premium)}`}
          </li>
        ))}
        <li>Artisan wage $0.00</li>
        <li>Total {money(orderTotal(order))}</li>
        <li>Your hands. Our premium. No refunds on feelings.</li>
      </ul>
      {done && (
        <div className="rprint__actions">
          <button type="button" className="abtn abtn-primary" onClick={save} disabled={saving}>
            {saving ? 'Saving…' : 'Save receipt'}
          </button>
          <button type="button" className="abtn abtn-ghost" onClick={onBack}>
            Back to the line
          </button>
        </div>
      )}
    </div>
  );
}
