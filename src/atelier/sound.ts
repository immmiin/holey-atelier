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
