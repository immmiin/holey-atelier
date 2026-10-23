// All sounds are synthesised with WebAudio. Sound is on by default; the
// context is created/resumed on the first pointerdown or keydown (so no
// autoplay block). "M" toggles mute; there is no visible control.

let ac: AudioContext | null = null;
let master: GainNode | null = null;
let noise: AudioBuffer | null = null;
let muted = false;
let creak: { gain: GainNode; bp: BiquadFilterNode } | null = null;

const MASTER = 0.3;

function ctx() {
  if (!ac) {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    ac = new AC();
    master = ac.createGain();
    master.gain.value = muted ? 0 : MASTER;
    master.connect(ac.destination);
    noise = ac.createBuffer(1, ac.sampleRate, ac.sampleRate);
    const d = noise.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  return ac;
}

export function unlockSound() {
  const a = ctx();
  if (a && a.state !== 'running') void a.resume();
}

export function toggleMute() {
  muted = !muted;
  if (master && ac) master.gain.setTargetAtTime(muted ? 0 : MASTER, ac.currentTime, 0.02);
  return muted;
}

function live() {
  return ac && master && noise && ac.state === 'running' ? ac : null;
}

function burst(a: AudioContext, t: number, dur: number, freq: number, q: number, gain: number, type: BiquadFilterType = 'bandpass') {
  const src = a.createBufferSource();
  src.buffer = noise;
  const f = a.createBiquadFilter();
  f.type = type;
  f.frequency.value = freq;
  f.Q.value = q;
  const g = a.createGain();
  g.gain.setValueAtTime(gain, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(f).connect(g).connect(master!);
  src.start(t, Math.random() * 0.5, dur + 0.02);
}

/** a soft yarn tick: one stitch pops */
export function tick(strength = 1) {
  const a = live();
  if (!a) return;
  burst(a, a.currentTime, 0.035, 1700 + Math.random() * 1100, 2.5, 0.5 * strength);
  burst(a, a.currentTime, 0.02, 5200 + Math.random() * 800, 1.2, 0.08 * strength, 'highpass');
}

/** a gentle stretch/creak whose loudness follows the thread tension (0–1+) */
export function setTension(t: number) {
  const a = live();
  if (!a) return;
  if (!creak) {
    const src = a.createBufferSource();
    src.buffer = noise;
    src.loop = true;
    const bp = a.createBiquadFilter();
    bp.type = 'bandpass';
    bp.Q.value = 9;
    bp.frequency.value = 420;
    const gain = a.createGain();
    gain.gain.value = 0;
    // a slow flutter makes it read as fibres creaking rather than hiss
    const lfo = a.createOscillator();
    lfo.frequency.value = 19;
    const depth = a.createGain();
    depth.gain.value = 0.5;
    const flutter = a.createGain();
    flutter.gain.value = 0.5;
    lfo.connect(depth).connect(flutter.gain);
    src.connect(bp).connect(flutter).connect(gain).connect(master!);
    src.start();
    lfo.start();
    creak = { gain, bp };
  }
  const x = Math.max(0, Math.min(1.2, t));
  creak.gain.gain.setTargetAtTime(0.32 * Math.pow(x, 1.6), a.currentTime, 0.05);
  creak.bp.frequency.setTargetAtTime(380 + 520 * x, a.currentTime, 0.08);
}

/** the clothesline twangs when a sock is unpinned */
export function twang() {
  const a = live();
  if (!a) return;
  const t = a.currentTime;
  for (const [f, det, gain] of [
    [147, -4, 0.22],
    [294, 3, 0.08],
  ] as const) {
    const o = a.createOscillator();
    o.type = 'triangle';
    o.frequency.setValueAtTime(f + det, t);
    o.frequency.exponentialRampToValueAtTime(f * 0.94, t + 0.7);
    const g = a.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.8);
    const lp = a.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 1400;
    o.connect(lp).connect(g).connect(master!);
    o.start(t);
    o.stop(t + 0.85);
  }
  burst(a, t, 0.05, 900, 1, 0.12);
}

/** one line of receipt-printer chatter */
export function printerStep() {
  const a = live();
  if (!a) return;
  const t = a.currentTime;
  for (let i = 0; i < 3; i++) burst(a, t + i * 0.012, 0.012, 2600 + Math.random() * 1600, 3, 0.18);
  const o = a.createOscillator();
  o.type = 'sawtooth';
  o.frequency.value = 96 + Math.random() * 8;
  const lp = a.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 320;
  const g = a.createGain();
  g.gain.setValueAtTime(0.05, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);
  o.connect(lp).connect(g).connect(master!);
  o.start(t);
  o.stop(t + 0.06);
}

/** paper tearing: a quick run of crackly, high-passed bursts that sweep upward */
export function rip(strength = 1) {
  const a = live();
  if (!a) return;
  const t = a.currentTime;
  const n = 9 + Math.floor(Math.random() * 5);
  for (let i = 0; i < n; i++) {
    const at = t + i * (0.012 + Math.random() * 0.014);
    burst(a, at, 0.018 + Math.random() * 0.02, 1400 + i * 260 + Math.random() * 500, 1.4, (0.22 + Math.random() * 0.2) * strength, 'bandpass');
  }
  burst(a, t, 0.16, 3200, 0.7, 0.12 * strength, 'highpass');
}

/** a light papery tap when a torn tab lands */
export function tap() {
  const a = live();
  if (!a) return;
  burst(a, a.currentTime, 0.03, 900 + Math.random() * 300, 1.5, 0.18);
}

let rumble: { gain: GainNode; lp: BiquadFilterNode; osc: OscillatorNode } | null = null;

/** the washer drum: a low rumble whose loudness and pitch follow its speed (0–1) */
export function setRumble(level: number) {
  const a = live();
  if (!a) return;
  if (!rumble) {
    const src = a.createBufferSource();
    src.buffer = noise;
    src.loop = true;
    const lp = a.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 140;
    lp.Q.value = 1.2;
    const osc = a.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = 38;
    const og = a.createGain();
    og.gain.value = 0.5;
    const gain = a.createGain();
    gain.gain.value = 0;
    src.connect(lp).connect(gain);
    osc.connect(og).connect(gain);
    gain.connect(master!);
    src.start();
    osc.start();
    rumble = { gain, lp, osc };
  }
  const x = Math.max(0, Math.min(1, level));
  rumble.gain.gain.setTargetAtTime(0.55 * Math.pow(x, 1.3), a.currentTime, 0.08);
  rumble.lp.frequency.setTargetAtTime(110 + 260 * x, a.currentTime, 0.1);
  rumble.osc.frequency.setTargetAtTime(32 + 30 * x, a.currentTime, 0.1);
}

/** a detent on the washer dial */
export function dialClick() {
  const a = live();
  if (!a) return;
  burst(a, a.currentTime, 0.014, 3800, 3, 0.35);
  burst(a, a.currentTime + 0.004, 0.02, 1200, 2, 0.12);
}

/** the washer door pops open */
export function doorPop() {
  const a = live();
  if (!a) return;
  const t = a.currentTime;
  const o = a.createOscillator();
  o.type = 'sine';
  o.frequency.setValueAtTime(320, t);
  o.frequency.exponentialRampToValueAtTime(90, t + 0.12);
  const g = a.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.5, t + 0.005);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
  o.connect(g).connect(master!);
  o.start(t);
  o.stop(t + 0.2);
  burst(a, t, 0.05, 2400, 1, 0.2);
}

/** a soft wooden clothespin click (the home line-up switching socks) */
export function pinClick() {
  const a = live();
  if (!a) return;
  burst(a, a.currentTime, 0.012, 2400, 2.5, 0.16);
  burst(a, a.currentTime + 0.035, 0.016, 1500, 2, 0.1);
}

/** the washer door swinging open: a short, low clunk */
export function clunk() {
  const a = live();
  if (!a) return;
  const t = a.currentTime;
  const o = a.createOscillator();
  o.type = 'triangle';
  o.frequency.setValueAtTime(120, t);
  o.frequency.exponentialRampToValueAtTime(48, t + 0.14);
  const g = a.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.6, t + 0.006);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.2);
  o.connect(g).connect(master!);
  o.start(t);
  o.stop(t + 0.22);
  burst(a, t, 0.04, 380, 0.8, 0.35, 'lowpass');
}
