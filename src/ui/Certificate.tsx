import { useEffect, useRef, useState } from 'react';
import { stamp } from '../scene/sound';
import { CERT_H, CERT_W, SEAL, certificatePNG, drawCertificate, drawSeal } from './certDraw';
import type { Sale } from './sale';

const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export default function Certificate({ sale, onAnother, onClose }: { sale: Sale; onAnother: () => void; onClose: () => void }) {
  const cvRef = useRef<HTMLCanvasElement>(null);
  const sealRef = useRef<HTMLCanvasElement>(null);
  const [drawn, setDrawn] = useState(false);
  const [sealed, setSealed] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let alive = true;
    const cv = cvRef.current!;
    cv.width = CERT_W * 2;
    cv.height = CERT_H * 2;
    const ctx = cv.getContext('2d')!;
    ctx.scale(2, 2);
    void drawCertificate(ctx, sale, false).then(() => {
      if (!alive) return;
      const sc = sealRef.current!;
      const size = SEAL.r * 2.6;
      sc.width = sc.height = size * 2;
      const g = sc.getContext('2d')!;
      g.scale(2, 2);
      drawSeal(g, size / 2, size / 2, SEAL.r);
      setDrawn(true);
    });
    return () => {
      alive = false;
    };
  }, [sale]);

  // the seal is pressed in a beat after the certificate appears
  useEffect(() => {
    if (!drawn) return;
    const fast = reduced();
    const t1 = setTimeout(() => stamp(), fast ? 0 : 520);
    const t2 = setTimeout(() => setSealed(true), fast ? 0 : 520);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [drawn]);

  const save = async () => {
    setSaving(true);
    try {
      const blob = await certificatePNG(sale);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `atelier-holey-HOL-${sale.serial}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 4000);
    } finally {
      setSaving(false);
    }
  };

  const sealStyle: React.CSSProperties = {
    left: `${((SEAL.x - SEAL.r * 1.3) / CERT_W) * 100}%`,
    top: `${((SEAL.y - SEAL.r * 1.3) / CERT_H) * 100}%`,
    width: `${((SEAL.r * 2.6) / CERT_W) * 100}%`,
  };

  return (
    <div className="cert-scrim" role="dialog" aria-modal="true" aria-label="Certificate of Authenticity">
      <div className="cert">
        <div className="cert-paper">
          <canvas ref={cvRef} className="cert-canvas" />
          <canvas
            ref={sealRef}
            className={`cert-seal ${drawn ? 'is-pressing' : ''} ${sealed ? 'is-set' : ''}`}
            style={sealStyle}
            aria-hidden
          />
        </div>
        <div className="cert-actions">
          <button className="btn btn-primary" onClick={save} disabled={!sealed || saving}>
            {saving ? 'Saving…' : 'Save as image'}
          </button>
          <button className="btn btn-ghost" onClick={onAnother}>
            Pull another sock
          </button>
          <button className="btn btn-link" onClick={onClose}>
            Back to receipt
          </button>
        </div>
      </div>
    </div>
  );
}
