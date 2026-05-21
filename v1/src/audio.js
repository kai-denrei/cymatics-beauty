// Synth driver + scope.
//
// Generates a sine tone keyed to the current (m, n) mode and exposes an
// AnalyserNode for waveform visualization. Default muted — audio is gated
// behind the first user gesture (browser autoplay policy), so the
// AudioContext is created lazily on the first call to `setMuted(false)`.
//
// Architecture:
//   oscillator ──┬──► analyser     (always, drives the scope)
//                └──► gain ──► destination   (audible path, mutable)
//
// Frequency map: a square *membrane* (the v1 cheat field) has analytic
// eigenfrequencies f_mn ∝ √(m² + n²). We pick a base of 60 Hz so that the
// default (m, n) = (3, 5) → 60·√34 ≈ 350 Hz, which sits in a pleasant
// midrange. This is *not* a real Chladni plate frequency. v2 will export
// real eigenfrequencies in the mode bank.

const BASE_HZ = 60;
const FFT_SIZE = 1024;

export function modeFrequency(m, n) {
  return BASE_HZ * Math.sqrt(m * m + n * n);
}

export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.osc = null;
    this.gain = null;
    this.analyser = null;
    this.timeData = null;
    this.muted = true;
    this.currentHz = modeFrequency(3, 5);
  }

  _ensureContext() {
    if (this.ctx) return;
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();

    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.value = this.currentHz;

    const gain = ctx.createGain();
    gain.gain.value = 0;  // start silent

    const analyser = ctx.createAnalyser();
    analyser.fftSize = FFT_SIZE;
    analyser.smoothingTimeConstant = 0;

    osc.connect(analyser);
    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();

    this.ctx = ctx;
    this.osc = osc;
    this.gain = gain;
    this.analyser = analyser;
    this.timeData = new Uint8Array(analyser.frequencyBinCount * 2); // FFT_SIZE samples in time domain
  }

  async setMuted(muted) {
    this.muted = muted;
    if (!muted) {
      this._ensureContext();
      if (!this.ctx) return;
      if (this.ctx.state === "suspended") {
        try { await this.ctx.resume(); } catch { /* no-op */ }
      }
    }
    if (this.gain && this.ctx) {
      const t = this.ctx.currentTime;
      this.gain.gain.cancelScheduledValues(t);
      this.gain.gain.linearRampToValueAtTime(muted ? 0 : 0.05, t + 0.05);
    }
  }

  setFrequency(hz) {
    this.currentHz = hz;
    if (this.osc && this.ctx) {
      const t = this.ctx.currentTime;
      this.osc.frequency.cancelScheduledValues(t);
      this.osc.frequency.linearRampToValueAtTime(hz, t + 0.08);
    }
  }

  // Read the latest time-domain samples into `out` (Uint8Array). Returns true
  // if data was written, false if the engine hasn't been started yet.
  readTimeDomain(out) {
    if (!this.analyser) return false;
    this.analyser.getByteTimeDomainData(out);
    return true;
  }

  get fftSize() { return FFT_SIZE; }
  get isRunning() { return !!this.ctx; }
}

// Draw a single-frame oscilloscope onto `ctx`. If the engine hasn't started,
// draws a flat baseline so the panel doesn't look broken.
export function drawScope(ctx, engine, w, h, color = "#3fb6a8") {
  ctx.fillStyle = "#0a0a0c";
  ctx.fillRect(0, 0, w, h);

  // Baseline grid: midline + faint top/bottom rules.
  ctx.strokeStyle = "rgba(255,255,255,0.06)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, h / 2);
  ctx.lineTo(w, h / 2);
  ctx.stroke();

  ctx.strokeStyle = color;
  ctx.lineWidth = 1.25;
  ctx.beginPath();

  if (engine.isRunning) {
    const samples = engine.timeData;
    engine.readTimeDomain(samples);
    const n = samples.length;
    const step = n / w;
    for (let x = 0; x < w; x++) {
      const v = samples[(x * step) | 0] / 255;
      const y = (1 - v) * h;
      if (x === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
  } else {
    // Not started yet — flat line, dim.
    ctx.strokeStyle = "rgba(63,182,168,0.35)";
    ctx.moveTo(0, h / 2);
    ctx.lineTo(w, h / 2);
  }

  ctx.stroke();
}
