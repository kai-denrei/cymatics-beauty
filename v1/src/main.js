// App shell. Drives the worker (which computes f and ∇|f|) and the main-thread
// particle integrator + ImageData renderer. Also owns the audio synth and the
// settlement-detected "continuous play" loop.

import { Particles }                from "./particles.js?v=a9090546";
import { wireUI }                   from "./ui.js?v=a9090546";
import { AudioEngine, drawScope, modeFrequency } from "./audio.js?v=a9090546";
import { setupLive }                from "./live.js?v=a9090546";

const MAX_PARTICLES = 200000;

// Adaptive internal resolution + default count. On small / coarse-pointer
// devices we drop the render surface and the default particle count so the
// frame loop holds 60fps even on mid-tier mobile GPUs. The user can still
// crank the count up via the slider — this only sets the *default*.
const isCompact =
  window.matchMedia("(max-width: 720px), (pointer: coarse)").matches;
const INTERNAL_W = isCompact ? 360 : 540;
const INTERNAL_H = INTERNAL_W;
const DEFAULT_COUNT = isCompact ? 30000 : 60000;

// Continuous-play tuning.
const SETTLE_THRESHOLD = 0.006;   // EMA mean |v| under which we consider it "settled"
const MIN_DWELL_MS     = 1800;    // minimum time on a mode before continuous can swap
const MAX_DWELL_MS     = 6000;    // hard ceiling — swap even if EMA never crosses the
                                  // threshold. Some (M, N) at high S keep particles
                                  // orbiting nodes forever and would otherwise stick.
const PULSE_DECAY      = 0.965;   // per-frame multiplicative decay of the kick

const state = {
  m: 3, n: 5,
  count: DEFAULT_COUNT,
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
  applyMode: null,   // installed by wireUI
  sliders: null,     // installed by wireUI
  live: false,                 // flipped by setupLive.setActive
  liveOverrideUntil: 0,        // performance.now() ms; ui.js#commitMode writes
                               // this when LIVE is on so the receiver yields
                               // M/N for ~1.8s after a manual < / > tap.
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

const worker = new Worker(new URL("./worker.js?v=a9090546", import.meta.url), { type: "module" });
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
  // Reset BOTH swap clocks so a manual <,> press always gets the full dwell
  // window before continuous (settle) or auto-cycle (timer) overrides.
  const now = performance.now();
  lastSwapAt   = now;
  autoLastSwap = now;
  settleEMA = 1;
  tempPulse = 1;
}

state.onModeChange = requestMode;
state.onAudioToggle = (muted) => { audio.setMuted(muted); };

const live = setupLive(state, audio);
state.live = false;   // initial; live.setActive will flip it
wireUI(state, { defaultCount: DEFAULT_COUNT, live });
requestMode(state.m, state.n);

// Forward the current ?chan= (if any) onto the studio-link href so two-tab
// testing on a custom channel chains.
const studioLink = document.getElementById("studio-link");
if (studioLink) {
  const c = new URL(location.href).searchParams.get("chan");
  if (c) studioLink.href = "./studio.html?chan=" + encodeURIComponent(c);
}

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
  // Reseed FIRST so the cloud is uniformly scattered before the new field
  // pulls it into shape. This amplifies the visual transition — without it,
  // particles drift smoothly between modes and the change is muted.
  particles.reseed();
  state.sliders.m.setValue(next.m, { silent: true });
  state.sliders.n.setValue(next.n, { silent: true });
  state.applyMode(next.m, next.n);
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
  // when both are on — settle is the more physical trigger. Both are skipped
  // while paused (no particle motion → settle would fire instantly, and
  // timer-cycling a frozen plate makes no sense).
  if (!state.paused && state.continuous && !pendingMode && !state.live && (now - lastSwapAt) > MIN_DWELL_MS) {
    settleSampleCounter++;
    if (settleSampleCounter >= 6) {
      settleSampleCounter = 0;
      const s = particles.meanSpeedSample(200);
      settleEMA = settleEMA * 0.82 + s * 0.18;
    }
    const dwell = now - lastSwapAt;
    if (settleEMA < SETTLE_THRESHOLD || dwell > MAX_DWELL_MS) {
      triggerSwap();
    }
  } else if (!state.paused && state.autoCycle && now - autoLastSwap > 4000 && !pendingMode && !state.live) {
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

  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
