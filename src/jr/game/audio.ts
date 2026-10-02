/* Procedural WebAudio: BGM step-sequencer, synthesized SFX and a live engine drone. */
type MusicMode = 'menu' | 'arena' | 'battle' | 'build' | 'result' | null;

const midi = (n: number) => 440 * Math.pow(2, (n - 69) / 12);

interface Song {
  bpm: number;
  chords: number[][]; // midi notes per bar
  bass: number[]; // 16 steps: index into chord (-1 rest), 9 = octave root
  lead: number[]; // 32 steps (2 bars) scale degrees, -1 rest
  drums: string[]; // 16 steps: k s h combos
  leadType: OscillatorType;
  swing?: number;
}

const MAJ = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21];
const SONGS: Record<Exclude<MusicMode, null>, Song> = {
  menu: {
    bpm: 108,
    chords: [[60, 64, 67], [57, 60, 64], [65, 69, 72], [67, 71, 74]],
    bass: [0, -1, -1, 0, -1, -1, 2, -1, 0, -1, -1, 0, -1, 1, -1, -1],
    lead: [4, -1, 3, 2, -1, 2, 4, -1, 5, -1, 4, -1, 2, -1, -1, -1, 3, -1, 2, 1, -1, 1, 2, -1, 4, -1, 2, -1, 0, -1, -1, -1],
    drums: ['k', '', 'h', '', 's', '', 'h', 'k', 'k', '', 'h', '', 's', '', 'h', 'h'],
    leadType: 'triangle',
    swing: 0.12,
  },
  build: {
    bpm: 96,
    chords: [[62, 65, 69], [60, 64, 67], [58, 62, 65], [60, 64, 67]],
    bass: [0, -1, 2, -1, 0, -1, 2, -1, 0, -1, 2, -1, 1, -1, 2, -1],
    lead: [2, -1, -1, 4, -1, -1, 3, -1, 2, -1, 1, -1, -1, -1, -1, -1, 2, -1, -1, 4, -1, 5, 4, -1, 2, -1, -1, -1, -1, -1, -1, -1],
    drums: ['k', '', 'h', '', 's', '', 'h', '', 'k', 'k', 'h', '', 's', '', 'h', ''],
    leadType: 'sine',
    swing: 0.15,
  },
  arena: {
    bpm: 164,
    chords: [[57, 60, 64], [53, 57, 60], [55, 59, 62], [52, 55, 59]],
    bass: [0, 9, 0, 9, 0, 9, 2, 9, 0, 9, 0, 9, 1, 9, 2, 9],
    lead: [5, 4, 5, 7, 5, 4, 2, -1, 4, 2, 4, 5, 4, 2, 0, -1, 5, 4, 5, 7, 8, 7, 5, -1, 7, 5, 4, 2, 4, 5, 7, -1],
    drums: ['k', 'h', 's', 'h', 'k', 'k', 's', 'h', 'k', 'h', 's', 'h', 'k', 's', 's', 's'],
    leadType: 'square',
  },
  battle: {
    bpm: 148,
    chords: [[60, 64, 67], [55, 59, 62], [57, 60, 64], [53, 57, 60]],
    bass: [0, -1, 9, 0, -1, 0, 9, -1, 0, -1, 9, 0, 2, -1, 1, -1],
    lead: [4, -1, 5, 4, 2, -1, 4, -1, 7, -1, 5, 4, 5, -1, -1, -1, 4, -1, 5, 4, 2, -1, 0, -1, 2, -1, 4, 2, 0, -1, -1, -1],
    drums: ['k', 'h', 'h', 'h', 's', 'h', 'k', 'h', 'k', 'h', 'k', 'h', 's', 'h', 's', 'h'],
    leadType: 'sawtooth',
  },
  result: {
    bpm: 120,
    chords: [[60, 64, 67], [65, 69, 72], [62, 65, 69], [67, 71, 74]],
    bass: [0, -1, 2, -1, 0, -1, 2, -1, 0, -1, 2, -1, 1, -1, 2, -1],
    lead: [0, 2, 4, 7, -1, 7, 9, -1, 7, -1, 4, -1, 5, -1, -1, -1, 4, 5, 7, 9, -1, 9, 7, -1, 5, -1, 4, -1, 2, -1, -1, -1],
    drums: ['k', '', 'h', '', 's', '', 'h', '', 'k', '', 'h', 'k', 's', '', 'h', 'h'],
    leadType: 'triangle',
  },
};

class AudioEngine {
  ctx: AudioContext | null = null;
  master!: GainNode;
  musicBus!: GainNode;
  sfxBus!: GainNode;
  noise!: AudioBuffer;
  muted = false;
  mode: MusicMode = null;
  private step = 0;
  private nextTime = 0;
  private timer: number | null = null;
  private engOsc: OscillatorNode | null = null;
  private engOsc2: OscillatorNode | null = null;
  private engGain: GainNode | null = null;
  private engFilter: BiquadFilterNode | null = null;
  private lastPlay: Record<string, number> = {};

  init() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return;
    }
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    const ctx = new AC();
    this.ctx = ctx;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14;
    comp.ratio.value = 4;
    comp.connect(ctx.destination);
    this.master = ctx.createGain();
    this.master.gain.value = this.muted ? 0 : 0.8;
    this.master.connect(comp);
    this.musicBus = ctx.createGain();
    this.musicBus.gain.value = 0.32;
    this.musicBus.connect(this.master);
    this.sfxBus = ctx.createGain();
    this.sfxBus.gain.value = 0.75;
    this.sfxBus.connect(this.master);
    const len = ctx.sampleRate * 1.5;
    this.noise = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = this.noise.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    if (this.mode) this.startScheduler();
  }

  toggleMute() {
    this.muted = !this.muted;
    if (this.ctx) this.master.gain.setTargetAtTime(this.muted ? 0 : 0.8, this.ctx.currentTime, 0.05);
    window.dispatchEvent(new Event('junk-racers-sound'));
    return this.muted;
  }

  // ─── primitives ────────────────────────────────────────────────
  private tone(freq: number, t: number, dur: number, type: OscillatorType, vol: number, dest: AudioNode, slide?: number, attack = 0.005) {
    const c = this.ctx!;
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, slide), t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vol, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(dest);
    o.start(t);
    o.stop(t + dur + 0.05);
  }
  private noiseHit(t: number, dur: number, vol: number, dest: AudioNode, type: BiquadFilterType, freq: number, q = 1, sweepTo?: number) {
    const c = this.ctx!;
    const s = c.createBufferSource();
    s.buffer = this.noise;
    const f = c.createBiquadFilter();
    f.type = type;
    f.frequency.setValueAtTime(freq, t);
    if (sweepTo) f.frequency.exponentialRampToValueAtTime(sweepTo, t + dur);
    f.Q.value = q;
    const g = c.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f).connect(g).connect(dest);
    s.start(t, Math.random() * 0.5);
    s.stop(t + dur + 0.05);
  }
  private ok(name: string, gap = 0.04) {
    if (!this.ctx || this.muted) return false;
    const now = this.ctx.currentTime;
    if ((this.lastPlay[name] ?? 0) + gap > now) return false;
    this.lastPlay[name] = now;
    return true;
  }

  // ─── music ─────────────────────────────────────────────────────
  setMusic(mode: MusicMode) {
    if (this.mode === mode) return;
    this.mode = mode;
    this.step = 0;
    if (!this.ctx) return;
    if (mode) this.startScheduler();
    else this.stopScheduler();
  }
  private startScheduler() {
    if (!this.ctx) return;
    this.nextTime = this.ctx.currentTime + 0.08;
    if (this.timer !== null) return;
    this.timer = window.setInterval(() => this.schedule(), 25);
  }
  private stopScheduler() {
    if (this.timer !== null) clearInterval(this.timer);
    this.timer = null;
  }
  private schedule() {
    if (!this.ctx || !this.mode) return;
    const song = SONGS[this.mode];
    const stepDur = 60 / song.bpm / 4;
    while (this.nextTime < this.ctx.currentTime + 0.12) {
      const s = this.step;
      const swing = s % 2 === 1 ? stepDur * (song.swing ?? 0) : 0;
      this.playStep(song, s, this.nextTime + swing, stepDur);
      this.nextTime += stepDur;
      this.step = (s + 1) % 64;
    }
  }
  private playStep(song: Song, s: number, t: number, sd: number) {
    const bus = this.musicBus;
    const bar = Math.floor(s / 16) % song.chords.length;
    const chord = song.chords[bar];
    const i16 = s % 16;
    // drums
    const d = song.drums[i16];
    if (d.includes('k')) this.tone(150, t, 0.16, 'sine', 0.9, bus, 42);
    if (d.includes('s')) {
      this.noiseHit(t, 0.12, 0.35, bus, 'bandpass', 1900, 0.8);
      this.tone(190, t, 0.08, 'triangle', 0.2, bus, 120);
    }
    if (d.includes('h') || i16 % 2 === 0) this.noiseHit(t, 0.03, d.includes('h') ? 0.12 : 0.05, bus, 'highpass', 8000);
    // bass
    const b = song.bass[i16];
    if (b >= 0) {
      const n = b === 9 ? chord[0] - 12 : chord[Math.min(b, 2)] - 24;
      this.tone(midi(n), t, sd * 1.8, 'square', 0.16, bus, undefined, 0.004);
      this.tone(midi(n), t, sd * 1.8, 'sine', 0.22, bus);
    }
    // chord pad stab on downbeats
    if (i16 === 0 || i16 === 8) chord.forEach((n) => this.tone(midi(n), t, sd * 6, 'triangle', 0.045, bus, undefined, 0.03));
    // lead
    const l = song.lead[s % 32];
    if (l >= 0) {
      const root = song.chords[0][0];
      this.tone(midi(root + 12 + MAJ[l % MAJ.length] - (this.mode === 'arena' ? 3 : 0)), t, sd * 1.6, song.leadType, song.leadType === 'square' || song.leadType === 'sawtooth' ? 0.05 : 0.1, bus);
    }
  }

  // ─── engine drone ──────────────────────────────────────────────
  engineOn() {
    if (!this.ctx || this.engOsc) return;
    const c = this.ctx;
    this.engOsc = c.createOscillator();
    this.engOsc2 = c.createOscillator();
    this.engOsc.type = 'sawtooth';
    this.engOsc2.type = 'square';
    this.engFilter = c.createBiquadFilter();
    this.engFilter.type = 'lowpass';
    this.engFilter.frequency.value = 600;
    this.engGain = c.createGain();
    this.engGain.gain.value = 0;
    this.engOsc.connect(this.engFilter);
    this.engOsc2.connect(this.engFilter);
    this.engFilter.connect(this.engGain).connect(this.sfxBus);
    this.engOsc.start();
    this.engOsc2.start();
  }
  engine(speed01: number, boost: boolean) {
    if (!this.ctx || !this.engOsc) return;
    const t = this.ctx.currentTime;
    const f = 50 + speed01 * 120 + (boost ? 40 : 0);
    this.engOsc.frequency.setTargetAtTime(f, t, 0.08);
    this.engOsc2!.frequency.setTargetAtTime(f * 0.5 + 3, t, 0.08);
    this.engFilter!.frequency.setTargetAtTime(400 + speed01 * 1400 + (boost ? 900 : 0), t, 0.1);
    this.engGain!.gain.setTargetAtTime(this.muted ? 0 : 0.05 + speed01 * 0.07, t, 0.1);
  }
  engineOff() {
    if (!this.engOsc) return;
    try {
      this.engOsc.stop();
      this.engOsc2!.stop();
    } catch {
      /* noop */
    }
    this.engOsc = this.engOsc2 = null;
  }

  // ─── SFX ───────────────────────────────────────────────────────
  pickup(tier: 'common' | 'rare' | 'gold' | 'big', combo: number) {
    if (!this.ok('pickup', 0.03)) return;
    const t = this.ctx!.currentTime;
    const base = 72 + Math.min(combo, 12);
    const bus = this.sfxBus;
    if (tier === 'common') {
      this.tone(midi(base), t, 0.08, 'square', 0.12, bus);
      this.tone(midi(base + 7), t + 0.05, 0.1, 'square', 0.1, bus);
    } else if (tier === 'rare') {
      [0, 4, 7, 12].forEach((n, i) => this.tone(midi(base + n), t + i * 0.045, 0.14, 'triangle', 0.18, bus));
    } else {
      [0, 4, 7, 12, 16, 19].forEach((n, i) => this.tone(midi(base + n), t + i * 0.04, 0.2, 'square', 0.09, bus));
      [0, 7, 12].forEach((n, i) => this.tone(midi(base + 12 + n), t + 0.25 + i * 0.05, 0.3, 'sine', 0.15, bus));
      if (tier === 'big') this.noiseHit(t, 0.4, 0.3, bus, 'highpass', 4000, 1, 12000);
    }
  }
  smash() {
    if (!this.ok('smash', 0.08)) return;
    const t = this.ctx!.currentTime;
    this.tone(120, t, 0.35, 'sine', 0.9, this.sfxBus, 35);
    this.noiseHit(t, 0.4, 0.7, this.sfxBus, 'lowpass', 3000, 0.7, 300);
    for (let i = 0; i < 5; i++) this.tone(800 + Math.random() * 1600, t + 0.03 + i * 0.04, 0.12, 'square', 0.06, this.sfxBus, 300 + Math.random() * 400);
  }
  bump() {
    if (!this.ok('bump', 0.12)) return;
    const t = this.ctx!.currentTime;
    this.tone(90, t, 0.18, 'sine', 0.6, this.sfxBus, 40);
    this.noiseHit(t, 0.12, 0.3, this.sfxBus, 'lowpass', 900);
  }
  clank() {
    if (!this.ok('clank', 0.1)) return;
    const t = this.ctx!.currentTime;
    this.tone(320, t, 0.25, 'square', 0.12, this.sfxBus, 180);
    this.tone(523, t, 0.3, 'triangle', 0.12, this.sfxBus);
    this.noiseHit(t, 0.1, 0.25, this.sfxBus, 'bandpass', 2500, 2);
  }
  boost() {
    if (!this.ok('boost', 0.25)) return;
    const t = this.ctx!.currentTime;
    this.noiseHit(t, 0.6, 0.45, this.sfxBus, 'bandpass', 400, 1.5, 4000);
    this.tone(200, t, 0.5, 'sawtooth', 0.12, this.sfxBus, 900);
  }
  jump() {
    if (!this.ok('jump', 0.2)) return;
    const t = this.ctx!.currentTime;
    this.tone(300, t, 0.25, 'square', 0.1, this.sfxBus, 900);
  }
  land() {
    if (!this.ok('land', 0.2)) return;
    const t = this.ctx!.currentTime;
    this.tone(110, t, 0.15, 'sine', 0.5, this.sfxBus, 50);
  }
  beep(high = false) {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;
    this.tone(high ? 1046 : 523, t, high ? 0.5 : 0.22, 'square', 0.18, this.sfxBus);
    if (high) this.tone(1568, t, 0.5, 'triangle', 0.12, this.sfxBus);
  }
  alarm() {
    if (!this.ok('alarm', 0.5)) return;
    const t = this.ctx!.currentTime;
    for (let i = 0; i < 3; i++) {
      this.tone(660, t + i * 0.32, 0.15, 'square', 0.13, this.sfxBus, 990);
      this.tone(990, t + i * 0.32 + 0.15, 0.15, 'square', 0.13, this.sfxBus, 660);
    }
  }
  fanfare() {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;
    [60, 64, 67, 72, 67, 72, 76].forEach((n, i) => this.tone(midi(n + 12), t + i * 0.08, 0.2, 'square', 0.08, this.sfxBus));
  }
  whistle() {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;
    this.tone(2200, t, 0.6, 'sine', 0.2, this.sfxBus, 1900);
    this.tone(2600, t, 0.6, 'sine', 0.08, this.sfxBus, 2300);
  }
  coin(i = 0) {
    if (!this.ok('coin', 0.03)) return;
    const t = this.ctx!.currentTime;
    this.tone(midi(84 + (i % 5)), t, 0.07, 'square', 0.07, this.sfxBus);
  }
  item() {
    if (!this.ok('item', 0.15)) return;
    const t = this.ctx!.currentTime;
    this.tone(400, t, 0.15, 'triangle', 0.2, this.sfxBus, 1200);
    this.tone(800, t + 0.08, 0.15, 'triangle', 0.15, this.sfxBus, 1600);
  }
  missile() {
    if (!this.ok('missile', 0.2)) return;
    const t = this.ctx!.currentTime;
    this.noiseHit(t, 0.8, 0.35, this.sfxBus, 'bandpass', 3000, 3, 600);
    this.tone(900, t, 0.6, 'sawtooth', 0.06, this.sfxBus, 300);
  }
  explode() {
    if (!this.ok('explode', 0.1)) return;
    const t = this.ctx!.currentTime;
    this.tone(80, t, 0.6, 'sine', 0.9, this.sfxBus, 25);
    this.noiseHit(t, 0.7, 0.8, this.sfxBus, 'lowpass', 2000, 0.6, 100);
  }
  spin() {
    if (!this.ok('spin', 0.3)) return;
    const t = this.ctx!.currentTime;
    for (let i = 0; i < 6; i++) this.tone(700 - i * 60, t + i * 0.07, 0.07, 'square', 0.08, this.sfxBus);
    this.noiseHit(t, 0.6, 0.2, this.sfxBus, 'bandpass', 1200, 4, 400);
  }
  shoot() {
    if (!this.ok('shoot', 0.07)) return;
    const t = this.ctx!.currentTime;
    this.tone(520, t, 0.06, 'square', 0.12, this.sfxBus, 180);
  }
  partOff() {
    if (!this.ok('partOff', 0.12)) return;
    const t = this.ctx!.currentTime;
    this.tone(260, t, 0.18, 'sawtooth', 0.22, this.sfxBus, 70);
  }
  pop() {
    if (!this.ok('pop', 0.1)) return;
    const t = this.ctx!.currentTime;
    this.tone(900, t, 0.08, 'sine', 0.3, this.sfxBus, 200);
  }
  click() {
    if (!this.ok('click', 0.03)) return;
    const t = this.ctx!.currentTime;
    this.tone(1200, t, 0.04, 'square', 0.06, this.sfxBus, 800);
  }
}

export const sfx = new AudioEngine();

let unlocked = false;
export function bindAudioUnlock() {
  if (unlocked || typeof window === 'undefined') return;
  unlocked = true;
  const go = () => sfx.init();
  window.addEventListener('pointerdown', go);
  window.addEventListener('keydown', go);
  window.addEventListener('touchstart', go, { passive: true });
}
