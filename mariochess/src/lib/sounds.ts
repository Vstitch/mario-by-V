// Synthesized SFX via Web Audio API — no asset files needed.
let ctx: AudioContext | null = null;
function getCtx() {
  if (typeof window === "undefined") return null;
  if (!ctx) ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
  return ctx;
}

function tone(freq: number, dur: number, type: OscillatorType = "square", vol = 0.15, delay = 0) {
  const c = getCtx();
  if (!c) return;
  const t = c.currentTime + delay;
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  gain.gain.setValueAtTime(vol, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
  osc.connect(gain).connect(c.destination);
  osc.start(t);
  osc.stop(t + dur);
}

export const sfx = {
  move: () => tone(440, 0.08, "square", 0.08),
  select: () => tone(660, 0.05, "triangle", 0.1),
  capture: () => {
    tone(880, 0.06, "square", 0.12);
    tone(1320, 0.06, "square", 0.12, 0.05);
    tone(1760, 0.1, "square", 0.1, 0.1);
  },
  check: () => {
    tone(220, 0.15, "sawtooth", 0.15);
    tone(180, 0.15, "sawtooth", 0.15, 0.1);
  },
  victory: () => {
    [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.18, "square", 0.14, i * 0.12));
  },
  defeat: () => {
    [400, 350, 300, 200].forEach((f, i) => tone(f, 0.2, "sawtooth", 0.12, i * 0.15));
  },
  coin: () => {
    tone(988, 0.08, "square", 0.12);
    tone(1319, 0.18, "square", 0.12, 0.06);
  },
};
