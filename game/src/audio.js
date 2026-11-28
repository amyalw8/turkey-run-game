// Gobble Run — every sound is synthesized with WebAudio, so the game
// ships no audio files and plays the same offline. Created lazily on the
// first user gesture; M toggles it.
let context = null;
let master = null;
let muted = false;

function ensureContext() {
  if (context) return context;
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (!AudioContext) return null;
  try {
    context = new AudioContext();
  } catch {
    return null;
  }
  master = context.createGain();
  master.gain.value = 0.35;
  master.connect(context.destination);
  return context;
}

/** Unlock audio from a user gesture (key press or click). */
export function unlockAudio() {
  const ctx = ensureContext();
  if (ctx && ctx.state === 'suspended') ctx.resume();
}

export function toggleMuted() {
  muted = !muted;
  if (master) master.gain.value = muted ? 0 : 0.35;
  return muted;
}

export function isMuted() {
  return muted;
}

function tone(freq, seconds, type, volume, when = 0, slideTo = null) {
  if (muted) return;
  const ctx = ensureContext();
  if (!ctx) return;
  const start = ctx.currentTime + when;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, start);
  if (slideTo !== null) osc.frequency.exponentialRampToValueAtTime(slideTo, start + seconds);
  gain.gain.setValueAtTime(0, start);
  gain.gain.linearRampToValueAtTime(volume, start + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.001, start + seconds);
  osc.connect(gain);
  gain.connect(master);
  osc.start(start);
  osc.stop(start + seconds + 0.05);
}

function noise(seconds, volume, when = 0, lowpass = 1200) {
  if (muted) return;
  const ctx = ensureContext();
  if (!ctx) return;
  const start = ctx.currentTime + when;
  const length = Math.max(1, Math.floor(ctx.sampleRate * seconds));
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i += 1) data[i] = Math.random() * 2 - 1;
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = lowpass;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(volume, start);
  gain.gain.exponentialRampToValueAtTime(0.001, start + seconds);
  source.connect(filter);
  filter.connect(gain);
  gain.connect(master);
  source.start(start);
}

export const sounds = {
  /** The turkey's signature: two quick descending gobbles. */
  gobble() {
    tone(520, 0.09, 'square', 0.22, 0, 380);
    tone(460, 0.1, 'square', 0.22, 0.1, 300);
    tone(600, 0.07, 'square', 0.16, 0.2, 420);
  },
  jump() {
    tone(280, 0.18, 'sine', 0.3, 0, 560);
  },
  dash() {
    noise(0.22, 0.25, 0, 2600);
    tone(180, 0.2, 'sawtooth', 0.12, 0, 420);
  },
  pickup() {
    tone(660, 0.09, 'triangle', 0.28);
    tone(880, 0.12, 'triangle', 0.28, 0.08);
  },
  bonus() {
    tone(523, 0.1, 'triangle', 0.28);
    tone(659, 0.1, 'triangle', 0.28, 0.09);
    tone(784, 0.16, 'triangle', 0.28, 0.18);
  },
  hit() {
    noise(0.18, 0.4, 0, 900);
    tone(140, 0.25, 'sawtooth', 0.3, 0, 70);
  },
  /** The farmer is right behind you: two short alarm blips. */
  alarm() {
    tone(980, 0.08, 'square', 0.14);
    tone(980, 0.08, 'square', 0.14, 0.12);
  },
  /** The farmer winds up a lunge: a low growl, rising. */
  lunge() {
    tone(110, 0.35, 'sawtooth', 0.3, 0, 220);
    noise(0.3, 0.12, 0, 500);
  },
  /** The farmer loses the trail and starts searching: a puzzled blip. */
  search() {
    tone(520, 0.09, 'triangle', 0.22, 0, 660);
    tone(660, 0.12, 'triangle', 0.2, 0.1, 520);
  },
  caught() {
    tone(392, 0.22, 'sawtooth', 0.3, 0, 311);
    tone(311, 0.22, 'sawtooth', 0.3, 0.2, 233);
    tone(233, 0.4, 'sawtooth', 0.3, 0.4, 116);
  },
  win() {
    const notes = [523, 659, 784, 1047];
    notes.forEach((freq, i) => tone(freq, 0.22, 'triangle', 0.3, i * 0.13));
  },
  click() {
    tone(700, 0.05, 'square', 0.16);
  },
  hide() {
    noise(0.3, 0.18, 0, 700);
  },
};
