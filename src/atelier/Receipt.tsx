import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { printerStep } from './sound';
import { type Sale, breakdown, clock, fmtDate, fmtTime, holePct, money } from './sale';

const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function Line({ l, r, red }: { l: string; r: string; red?: boolean }) {
  return (
    <li className={red ? 'is-red' : undefined}>
      <span className="rc-l">{l}</span>
      <span className="rc-dots" aria-hidden />
      <span className="rc-r">{r}</span>
    </li>
  );
}

/** a code-drawn barcode; bar widths come from the order number */
function Barcode({ value }: { value: string }) {
  const bars = useMemo(() => {
    let h = 2166136261;
    const out: [number, number][] = [];
    let x = 0;
    for (let i = 0; i < 64; i++) {
      h = Math.imul(h ^ value.charCodeAt(i % value.length) ^ i, 16777619) >>> 0;
      const w = 1 + (h % 3);
      if (i % 2 === 0) out.push([x, w]);
      x += w + ((h >>> 4) % 2);
    }
    return { out, width: x };
  }, [value]);
  return (
    <svg className="rc-barcode" viewBox={`0 0 ${bars.width} 40`} preserveAspectRatio="none" aria-hidden>
      {bars.out.map(([x, w], i) => (
        <rect key={i} x={x} y={0} width={w} height={40} />
      ))}
    </svg>
  );
}

export default function Receipt({
  sale,
  top,
  center,
  onCert,
  onAnother,
  onBasket,
  hidden = false,
  inline = false,
}: {
  hidden?: boolean;
  /** in the page flow (checkout) instead of hanging under the price tag */
  inline?: boolean;
  sale: Sale;
  top?: number;
  center?: number | null;
  onCert: () => void;
  onAnother: () => void;
  onBasket?: () => void;
}) {
  const paperRef = useRef<HTMLDivElement>(null);
  const holeRef = useRef<HTMLDivElement>(null);
  const colRef = useRef<HTMLDivElement>(null);
  const [h, setH] = useState(0);
  const [fed, setFed] = useState(0);
  const [mask, setMask] = useState('');
  const n = holePct(sale);
  const b = breakdown(sale);
  const d = Math.round(10 + 66 * Math.min(1, sale.p));
  const done = h > 0 && fed >= h;

  // the paper's shape: torn zig-zag bottom and a die-cut hole the size of the hole you made
  useLayoutEffect(() => {
    const paper = paperRef.current, hole = holeRef.current;
    if (!paper || !hole) return;
    const measure = () => {
    const w = paper.offsetWidth, ph = paper.offsetHeight;
    const r = d / 2;
    const cx = hole.offsetLeft + hole.offsetWidth / 2, cy = hole.offsetTop + hole.offsetHeight / 2;
    const tooth = 9, depth = 6;
    let path = `M0 0H${w}V${ph - depth}`;
    for (let x = w; x > 0; x -= tooth) path += `L${Math.max(0, x - tooth / 2)} ${ph}L${Math.max(0, x - tooth)} ${ph - depth}`;
    path += `Z M${cx - r} ${cy}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0Z`;
    const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='${w}' height='${ph}' viewBox='0 0 ${w} ${ph}'><path fill-rule='evenodd' d='${path}'/></svg>`;
    setMask(`url("data:image/svg+xml,${encodeURIComponent(svg)}")`);
    setH(ph);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(paper);
    return () => ro.disconnect();
  }, [d]);

  // print: the strip feeds out of the slot a line at a time, with printer chatter
  const fedRef = useRef(0);
  useEffect(() => {
    if (!h) return;
    if (reduced()) {
      printerStep();
      fedRef.current = h;
      setFed(h);
      return;
    }
    const id = setInterval(() => {
      const f = (fedRef.current = Math.min(h, fedRef.current + 16 + Math.random() * 10));
      setFed(f);
      printerStep();
      if (f >= h) clearInterval(id);
    }, 55);
    return () => clearInterval(id);
  }, [h]);

  // follow the paper down as it prints
  useEffect(() => {
    const col = colRef.current;
    if (!inline && col && fed > col.clientHeight - 80) col.scrollTop = fed - col.clientHeight + 80;
  }, [fed, inline]);

  const order = `HOL-${sale.serial}`;
  const style: React.CSSProperties | undefined = inline ? undefined : center == null ? { top } : { top, left: center };

  return (
    <div
      className={`rc-col ${inline ? 'is-inline' : center == null ? 'is-centered' : ''}`}
      ref={colRef}
      style={style}
      role={inline ? 'group' : 'dialog'}
      aria-label="Atelier Holey receipt"
      inert={hidden}
    >
      <div className="rc-slot" aria-hidden />
      <div className="rc-feed" style={{ height: h ? fed : undefined }}>
        <div className="rc-shadow">
          <div className="rc-paper" ref={paperRef} style={mask ? { WebkitMaskImage: mask, maskImage: mask } : undefined}>
            <header className="rc-head">
              <div className="rc-house">Atelier Holey</div>
              <div className="rc-sub">New York · Maison du Trou</div>
              <div className="rc-meta">
                <span>Order No.</span>
                <span>{order}</span>
              </div>
              <div className="rc-meta">
                <span>{fmtDate(sale.date)}</span>
                <span>{fmtTime(sale.date)}</span>
              </div>
              <div className="rc-meta">
                <span>Artisan:</span>
                <span>{sale.name}</span>
              </div>
            </header>
            <hr className="rc-rule" />
            <ul className="rc-lines">
              <Line l={`1 × ${sale.sockName}`} r={money(b.base)} />
              <Line l={`Hand-distressing ${n}%`} r={money(b.distressing)} />
              <Line l={`Labor ${clock(sale.laborMs)}`} r={money(0)} />
              <Line l="Brand premium" r={money(b.premium)} />
              <Line l="Artisan wage" r={money(0)} red />
            </ul>
            <hr className="rc-rule rc-rule-double" />
            <div className="rc-total">
              <span>Total</span>
              <span>{money(b.total)}</span>
            </div>
            <div className="rc-vis">
              <img className="rc-sil" src={sale.outline} alt={`Outline of the sock: ${100 - n}% remaining`} />
              <div className="rc-holebox">
                <div className="rc-hole" ref={holeRef} style={{ width: d, height: d }} aria-hidden />
                <span>Hole {n}%</span>
              </div>
            </div>
            <div className="rc-remaining">Sock remaining {100 - n}%</div>
            <Barcode value={order + sale.name} />
            <div className="rc-code">
              {order} · No. 0{sale.sockId}
            </div>
            <footer className="rc-foot">
              Your hands. Our premium.
              <br />
              No refunds on feelings.
            </footer>
          </div>
        </div>
      </div>
      {done && (
        <div className="rc-actions">
          <button className="abtn abtn-primary" onClick={onCert} autoFocus>
            Get certificate
          </button>
          <button className="abtn abtn-ghost" onClick={onAnother}>
            Pull another sock
          </button>
          {onBasket && (
            <button className="abtn abtn-link" onClick={onBasket}>
              View basket
            </button>
          )}
        </div>
      )}
    </div>
  );
}
