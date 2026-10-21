import { useCallback, useEffect, useRef, useState } from 'react';
import '@fontsource/jetbrains-mono/400.css';
import '@fontsource/jetbrains-mono/700.css';
import { type HudState, type SceneEvent, Scene } from './scene/Scene';
import { SOCKS } from './scene/socks';
import { toggleMute, unlockSound } from './scene/sound';
import { tune } from './scene/tuning';
import About from './ui/About';
import Badge from './ui/Badge';
import Certificate from './ui/Certificate';
import Intro from './ui/Intro';
import Receipt from './ui/Receipt';
import Wordmark from './ui/Wordmark';
import { type Sale, clock, money } from './ui/sale';
import './app.css';

type Stage = 'intro' | 'line' | 'choosing' | 'badge' | 'pull' | 'receipt' | 'cert';

const MESSAGES: [number, string][] = [
  [0, 'Just a sock. Disappointing.'],
  [0.06, 'Lightly distressed.'],
  [0.22, 'Less sock. More value.'],
  [0.42, 'Mostly hole. Very premium.'],
  [0.66, 'Barely there. Barely legal.'],
  [0.88, 'Couture.'],
];
const SOLD_OUT = "Sold out: there's no sock left.";

function messageFor(p: number, finished: boolean) {
  if (finished) return SOLD_OUT;
  let m = MESSAGES[0][1];
  for (const [t, s] of MESSAGES) if (p >= t) m = s;
  return m;
}

const params = new URLSearchParams(location.search);
const OG = params.has('og');
const showTune = params.has('tune');

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<Scene | null>(null);
  const tagRef = useRef<HTMLDivElement>(null);
  const priceRef = useRef<HTMLDivElement>(null);
  const pctRef = useRef<HTMLElement>(null);
  const laborRef = useRef<HTMLElement>(null);
  const hud = useRef<HudState | null>(null);
  const [stage, setStageState] = useState<Stage>(OG ? 'line' : 'intro');
  const stageRef = useRef<Stage>(stage);
  const setStage = useCallback((s: Stage) => {
    stageRef.current = s;
    setStageState(s);
  }, []);
  const [pullMsg, setPullMsg] = useState(MESSAGES[0][1]);
  const [finished, setFinished] = useState(false);
  const [toast, setToast] = useState<{ text: string; id: number } | null>(null);
  const [name, setName] = useState('');
  const [sockId, setSockId] = useState(0);
  const [sale, setSale] = useState<Sale | null>(null);
  const [rcPos, setRcPos] = useState<{ top: number; center: number | null }>({ top: 0, center: null });
  const [about, setAbout] = useState(false);
  const serial = useRef('0000');
  const lastPair = useRef(0);

  const say = useCallback((text: string) => setToast({ text, id: Date.now() }), []);

  // ------------------------------------------------------------ the scene
  useEffect(() => {
    const cv = canvasRef.current!;
    const onEvent = (e: SceneEvent) => {
      if (e === 'pair') {
        const t = performance.now();
        if (t - lastPair.current > 2600) {
          lastPair.current = t;
          say('Never a pair.');
        }
      } else if (e === 'ready') {
        setStage('badge');
      } else if (e === 'finished') {
        setFinished(true);
      }
    };
    const scene = new Scene(
      cv,
      (h) => {
        hud.current = h;
        const st = stageRef.current;
        if (h.phase === 'choosing' && st === 'line') {
          setStage('choosing');
          setSockId(h.sockId);
          serial.current = String(1000 + Math.floor(Math.random() * 9000));
        }
        const live = h.phase === 'pull' || h.phase === 'frozen' || h.phase === 'badge';
        if (priceRef.current) priceRef.current.textContent = money(live ? h.price : 9);
        if (pctRef.current) pctRef.current.textContent = `${live ? (h.finished ? 100 : Math.min(99, Math.floor(h.p * 100))) : 0}%`;
        if (laborRef.current) laborRef.current.textContent = clock(live ? h.laborMs : 0);
        if (tagRef.current) {
          tagRef.current.style.top = `${h.lineY}px`;
          tagRef.current.style.transform = `rotate(${(-2 + h.shiver * 1.4).toFixed(2)}deg)`;
        }
        if (h.phase === 'pull') {
          const m = messageFor(h.p, h.finished);
          setPullMsg((old) => (old === m ? old : m));
        }
      },
      onEvent,
    );
    sceneRef.current = scene;
    (window as unknown as { __holey: Scene }).__holey = scene;
    return () => scene.dispose();
  }, [say, setStage]);

  // sound unlocks on the first gesture; "M" mutes (no visible control)
  useEffect(() => {
    const unlock = () => unlockSound();
    const key = (e: KeyboardEvent) => {
      unlock();
      if ((e.key === 'm' || e.key === 'M') && !(e.target instanceof HTMLInputElement)) {
        const muted = toggleMute();
        say(muted ? 'Muted.' : 'Sound on.');
      }
    };
    window.addEventListener('pointerdown', unlock, { capture: true });
    window.addEventListener('keydown', key, { capture: true });
    return () => {
      window.removeEventListener('pointerdown', unlock, { capture: true });
      window.removeEventListener('keydown', key, { capture: true });
    };
  }, [say]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2400);
    return () => clearTimeout(t);
  }, [toast]);

  // ?og: a composed still of the scene for the Open Graph image
  useEffect(() => {
    if (!OG) return;
    const id = setInterval(() => {
      const s = sceneRef.current;
      if (!s) return;
      if (s.phase === 'line' && s.socks.every((x) => x.img)) s.choose(1);
      if (s.phase === 'badge') {
        setName('You');
        s.startPull();
        s.setProgress(0.47);
        setStage('pull');
        clearInterval(id);
      }
    }, 200);
    return () => clearInterval(id);
  }, [setStage]);

  // ------------------------------------------------------------ flow
  const enter = () => {
    unlockSound();
    setTimeout(() => setStage('line'), 650);
  };

  const startDistressing = (n: string) => {
    setName(n);
    sceneRef.current?.startPull();
    setPullMsg(MESSAGES[0][1]);
    setStage('pull');
  };

  const basket = async () => {
    const h = hud.current, s = sceneRef.current;
    if (!s || !h || stageRef.current !== 'pull' || h.p <= 0) {
      say('Too much sock. Please pull harder.');
      return;
    }
    s.freeze();
    await document.fonts.load("400 14px 'JetBrains Mono'").catch(() => undefined);
    const art = s.artwork();
    const def = SOCKS.find((d) => d.id === h.sockId)!;
    setSale({
      sockId: def.id,
      sockName: def.name,
      name: name || 'You',
      p: h.p,
      price: h.price,
      laborMs: h.laborMs,
      serial: serial.current,
      date: new Date(),
      finished: h.finished,
      outline: s.outlineImage(110, 150).toDataURL('image/png'),
      ghost: s.outlineImage(art.sockBox.w, art.sockBox.h, true),
      art,
    });
    const r = tagRef.current!.getBoundingClientRect();
    const narrow = window.innerWidth < 700;
    setRcPos(narrow ? { top: 64, center: null } : { top: r.bottom - 6, center: r.left + r.width / 2 });
    setStage('receipt');
  };

  const another = () => {
    sceneRef.current?.backToLine();
    setSale(null);
    setFinished(false);
    setSockId(0);
    setStage('line');
  };

  const def = SOCKS.find((d) => d.id === sockId);
  let msg = '';
  if (stage === 'line') msg = 'Pick a sock. Never a pair.';
  else if (stage === 'choosing' || stage === 'badge') msg = 'Sign your work.';
  else if (stage === 'pull' || stage === 'receipt' || stage === 'cert') msg = pullMsg;

  return (
    <main className={`stage stage-${stage} ${OG ? 'is-og' : ''}`}>
      <canvas
        ref={canvasRef}
        className="scene"
        aria-label="A clothesline with six socks. Pick one, then drag its loose thread (or hold Space) to unravel it."
      />

      <header className="brand">
        <Wordmark />
        <div className="brand-sub">Atelier — Hand-distressed by {name || 'You'}</div>
      </header>

      {stage !== 'intro' && (
        <div className="tag" ref={tagRef}>
          <div className="tag-card">
            <span className="tag-eyelet" aria-hidden />
            <div className="tag-house">Atelier Holey</div>
            <div className="tag-name">{def ? `No. 0${def.id} · ${def.name}` : 'One sock · Hole included'}</div>
            <div className="tag-price" ref={priceRef} aria-live="off">
              $9.00
            </div>
            <dl className="tag-rows">
              <div>
                <dt>Your wage</dt>
                <dd className="wage">$0.00</dd>
              </div>
              <div>
                <dt>Hole</dt>
                <dd ref={pctRef}>0%</dd>
              </div>
              <div>
                <dt>Labor</dt>
                <dd ref={laborRef}>0:00</dd>
              </div>
            </dl>
            <button className={`basket ${finished && stage === 'pull' ? 'is-ready' : ''}`} onClick={basket} disabled={stage === 'receipt' || stage === 'cert'}>
              Add to basket
            </button>
          </div>
        </div>
      )}

      {msg && stage !== 'intro' && (
        <p className="msg" key={msg} aria-live="polite">
          {msg}
        </p>
      )}

      {stage === 'line' && (
        <div className="sr-only">
          {SOCKS.map((s) => (
            <button key={s.id} onClick={() => sceneRef.current?.choose(s.id)}>
              Choose sock No. 0{s.id}, {s.name}
            </button>
          ))}
        </div>
      )}

      {stage === 'badge' && <Badge onStart={startDistressing} />}

      {(stage === 'receipt' || stage === 'cert') && sale && (
        <Receipt sale={sale} top={rcPos.top} center={rcPos.center} hidden={stage === 'cert'} onCert={() => setStage('cert')} onAnother={another} />
      )}
      {stage === 'cert' && sale && <Certificate sale={sale} onAnother={another} onClose={() => setStage('receipt')} />}

      {toast && (
        <div className="toast" key={toast.id} role="status">
          {toast.text}
        </div>
      )}

      {stage !== 'intro' && !OG && (
        <button className="about-link" onClick={() => setAbout(true)}>
          About
        </button>
      )}
      {about && <About onClose={() => setAbout(false)} />}

      {OG && stage === 'pull' && <div className="og-head">Less sock.<br />Higher price.</div>}

      {stage === 'intro' && <Intro onEnter={enter} />}

      {showTune && <TunePanel onChange={() => void sceneRef.current?.rebuild()} />}
    </main>
  );
}

function TunePanel({ onChange }: { onChange: () => void }) {
  const row = (label: string, key: keyof typeof tune, min: number, max: number, step: number) => (
    <label key={key}>
      <span>
        {label} <b>{tune[key]}</b>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        defaultValue={tune[key]}
        onChange={(e) => {
          tune[key] = Number(e.target.value);
          onChange();
        }}
      />
    </label>
  );
  return (
    <aside className="tune">
      <strong>Feel</strong>
      {row('Stitch stiffness', 'stiffness', 0.4, 2.5, 0.05)}
      {row('Pulls to unravel', 'pulls', 6, 30, 1)}
      {row('Yarn thickness', 'yarn', 0.6, 2.2, 0.05)}
      {row('Row height (px)', 'rowH', 4, 20, 1)}
      {row('Heap / sock area', 'heapRatio', 0.3, 0.7, 0.01)}
    </aside>
  );
}
