// App shell. Drives the worker (which computes f and ∇|f|) and the main-thread
// particle integrator + ImageData renderer. Also owns the audio synth and the
// settlement-detected "continuous play" loop.

import { Particles }                from "./particles.js";
import { wireUI }                   from "./ui.js";
import { AudioEngine, drawScope, modeFrequency } from "./audio.js";

const MAX_PARTICLES = 200000;
const INTERNAL_W    = 540;
const INTERNAL_H    = 540;

// Continuous-play tuning.
const SETTLE_THRESHOLD = 0.006;   // EMA mean |v| under which we consider it "settled"
const MIN_DWELL_MS     = 1800;    // minimum time on a mode before continuous can swap
const PULSE_DECAY      = 0.965;   // per-frame multiplicative decay of the kick

const state = {
  m: 3, n: 5,
  count: 60000,
  temperature: 0.5,
  speed: 1,
  autoCycle: false,
  continuous: false,
  paused: false,
  audioMuted: true,
  reseedRequested: false,
  onModeChange: null,
  onAudioToggle: null,
  setFrequencyDisplay: null,
};

const canvas = document.getElementById("plate");
canvas.width  = INTERNAL_W;
canvas.height = INTERNAL_H;
const ctx = canvas.getContext("2d", { alpha: false });
ctx.imageSmoothingEnabled = false;

const img = ctx.createImageData(INTERNAL_W, INTERNAL_H);
const pixels = new Uint32Array(img.data.buffer);

const particles = new Particles(MAX_PARTICLES);
particles.resize(state.count);

let field = null;
let pendingMode = null;

const worker = new Worker(new URL("./worker.js", import.meta.url), { type: "module" });
worker.onmessage = (e) => {
  const msg = e.data;
  if (msg.type === "field") {
    field = { grid: msg.grid, gx: msg.gx, gy: msg.gy, f: msg.f };
    pendingMode = null;
  }
};

// Audio engine — lazy AudioContext, default muted.
const audio = new AudioEngine();
const scopeCanvas = document.getElementById("scope");
const scopeCtx = scopeCanvas.getContext("2d");

// Frame timing + continuous-play bookkeeping. Declared before `requestMode`
// because `requestMode` writes to them — TDZ otherwise.
const fpsEl  = document.getElementById("fps");
const msEl   = document.getElementById("frame-ms");
const liveEl = document.getElementById("live-count");

let fpsAccum = 0;
let fpsFrames = 0;
let fpsLastReport = performance.now();
let lastT = performance.now();
let autoLastSwap = performance.now();
let lastSwapAt = performance.now();
let settleEMA = 1;
let tempPulse = 0;
let settleSampleCounter = 0;

function requestMode(m, n) {
  if (m === n) return;
  pendingMode = { m, n };
  worker.postMessage({ type: "compute", m, n });
  const hz = modeFrequency(m, n);
  audio.setFrequency(hz);
  state.setFrequencyDisplay?.(hz);
  lastSwapAt = performance.now();
  settleEMA = 1;  // reset EMA so we don't immediately retrigger
  tempPulse = 1;  // kick the particles so they break free of the old basin
}

state.onModeChange = requestMode;
state.onAudioToggle = (muted) => { audio.setMuted(muted); };

wireUI(state);
requestMode(state.m, state.n);

// ImageData byte order is R,G,B,A. On little-endian (every browser target here),
// a Uint32 view reads as 0xAABBGGRR, so the literal puts A in the high byte.
// 0xFF 0A 0A 0C → A=255, B=10, G=10, R=12 → near-black background.
// 0xFF FF FF FF → A=255, B=255, G=255, R=255 → white particles.
const BG = 0xFF0A0A0C;
const PT = 0xFFFFFFFF;

function clearTo(color) {
  pixels.fill(color);
}

function randomMode(currentM, currentN) {
  let nm, nn, tries = 0;
  do {
    nm = 1 + Math.floor(Math.random() * 12);
    nn = 1 + Math.floor(Math.random() * 12);
    tries++;
  } while ((nm === nn || (nm === currentM && nn === currentN)) && tries < 10);
  return { m: nm, n: nn };
}

function triggerSwap() {
  const next = randomMode(state.m, state.n);
  const mEl = document.getElementById("m");
  const nEl = document.getElementById("n");
  mEl.value = next.m;
  nEl.value = next.n;
  // Single dispatch — refreshMN reads both slider values, computes the new
  // mode, updates the badge, and calls onModeChange exactly once.
  mEl.dispatchEvent(new Event("input"));
}

function frame(now) {
  const dt = Math.min(0.05, (now - lastT) / 1000);
  lastT = now;

  if (state.reseedRequested) {
    particles.reseed();
    state.reseedRequested = false;
  }

  if (particles.count !== state.count) particles.resize(state.count);

  // Continuous (settle-detected) takes priority over time-based auto-cycle
  // when both are on — settle is the more physical trigger.
  if (state.continuous && !pendingMode && (now - lastSwapAt) > MIN_DWELL_MS) {
    // Sample mean speed every ~6 frames and feed an EMA. The EMA is what we
    // compare against the threshold so a single low-speed frame doesn't trip it.
    settleSampleCounter++;
    if (settleSampleCounter >= 6) {
      settleSampleCounter = 0;
      const s = particles.meanSpeedSample(200);
      settleEMA = settleEMA * 0.82 + s * 0.18;
    }
    if (settleEMA < SETTLE_THRESHOLD) {
      triggerSwap();
    }
  } else if (state.autoCycle && now - autoLastSwap > 4000 && !pendingMode) {
    triggerSwap();
    autoLastSwap = now;
  }

  // Temperature pulse decays back to zero so the kick from a mode swap is
  // visible but doesn't persist.
  tempPulse *= PULSE_DECAY;
  const effectiveTemp = state.temperature + tempPulse;

  if (!state.paused) particles.step(field, dt, effectiveTemp, state.speed);

  // Render.
  clearTo(BG);
  const w = INTERNAL_W, h = INTERNAL_H;
  const pos = particles.pos;
  const n = particles.count;
  for (let i = 0; i < n; i++) {
    const x = (pos[i * 2]     * w) | 0;
    const y = (pos[i * 2 + 1] * h) | 0;
    if (x >= 0 && x < w && y >= 0 && y < h) {
      pixels[y * w + x] = PT;
    }
  }
  ctx.putImageData(img, 0, 0);

  // Scope.
  drawScope(scopeCtx, audio, scopeCanvas.width, scopeCanvas.height);

  // Stats.
  fpsAccum += dt;
  fpsFrames++;
  if (now - fpsLastReport > 500) {
    const fps = fpsFrames / fpsAccum;
    fpsEl.textContent = fps.toFixed(0);
    msEl.textContent = (1000 / fps).toFixed(1);
    liveEl.textContent = n.toLocaleString();
    fpsAccum = 0;
    fpsFrames = 0;
    fpsLastReport = now;
  }

  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
