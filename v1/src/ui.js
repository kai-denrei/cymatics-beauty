// Wiring for the controls panel. Constructs BrailleSlider instances in place
// of native <input type=range>, then attaches change handlers that funnel
// through state.applyMode (for m/n) or update state directly (for count,
// temp, speed). Exposed `state.sliders` lets main.js update sliders
// programmatically (continuous play / auto-cycle).

import { BrailleSlider } from "./braille-slider.js";

const PALETTE_M     = "amber";
const PALETTE_N     = "amber";
const PALETTE_COUNT = "teal";
const PALETTE_TEMP  = "teal";
const PALETTE_SPEED = "teal";

export function wireUI(state, opts = {}) {
  const $ = (id) => document.getElementById(id);

  const mnWarn  = $("mn-warn");
  const auto       = $("auto");
  const continuous = $("continuous");
  const pause      = $("pause");
  const reseed     = $("reseed");
  const badge      = $("mode-badge");
  const audioBtn   = $("audio-toggle");
  const freqOut    = $("freq");

  const defaultCount = opts.defaultCount ?? 60000;

  const fmtInt = (v) => Number(v).toLocaleString();
  const fmt2   = (v) => Number(v).toFixed(2);

  // --- Sliders ---------------------------------------------------------------
  const sliders = {
    m: new BrailleSlider({
      mount: $("slot-m"), min: 1, max: 12, step: 1, value: 3,
      label: "m", palette: PALETTE_M, format: fmtInt,
    }),
    n: new BrailleSlider({
      mount: $("slot-n"), min: 1, max: 12, step: 1, value: 5,
      label: "n", palette: PALETTE_N, format: fmtInt,
    }),
    count: new BrailleSlider({
      mount: $("slot-count"), min: 2000, max: 200000, step: 2000,
      value: defaultCount,
      label: "particles", palette: PALETTE_COUNT, format: fmtInt,
    }),
    temp: new BrailleSlider({
      mount: $("slot-temp"), min: 0, max: 1, step: 0.01, value: 0.5,
      label: "jitter", palette: PALETTE_TEMP, format: fmt2,
    }),
    speed: new BrailleSlider({
      mount: $("slot-speed"), min: 0.1, max: 3, step: 0.05, value: 1,
      label: "settle speed", palette: PALETTE_SPEED, format: fmt2,
    }),
  };
  state.sliders = sliders;

  // --- Mode application (m/n shared path) ------------------------------------
  state.applyMode = (m, n) => {
    state.m = m;
    state.n = n;
    const collide = m === n;
    mnWarn.hidden = !collide;
    badge.textContent = `MODE: membrane approx (m=${m}, n=${n})`;
    if (!collide) state.onModeChange?.(m, n);
  };

  sliders.m.onChange((v) => state.applyMode(v, state.n));
  sliders.n.onChange((v) => state.applyMode(state.m, v));

  sliders.count.onChange((v) => { state.count = v; });
  sliders.temp.onChange((v)  => { state.temperature = v; });
  sliders.speed.onChange((v) => { state.speed = v; });

  // --- Toggles ---------------------------------------------------------------
  auto.addEventListener("change",       () => { state.autoCycle  = auto.checked; });
  continuous.addEventListener("change", () => { state.continuous = continuous.checked; });
  pause.addEventListener("change",      () => { state.paused     = pause.checked; });
  reseed.addEventListener("click",      () => { state.reseedRequested = true; });

  // --- Audio -----------------------------------------------------------------
  audioBtn.addEventListener("click", () => {
    state.audioMuted = !state.audioMuted;
    audioBtn.textContent = state.audioMuted ? "unmute" : "mute";
    audioBtn.setAttribute("aria-pressed", String(!state.audioMuted));
    state.onAudioToggle?.(state.audioMuted);
  });

  state.setFrequencyDisplay = (hz) => {
    freqOut.textContent = hz != null ? `${hz.toFixed(1)} Hz` : "— Hz";
  };

  // --- Initial sync ----------------------------------------------------------
  state.m           = sliders.m.value;
  state.n           = sliders.n.value;
  state.count       = sliders.count.value;
  state.temperature = sliders.temp.value;
  state.speed       = sliders.speed.value;
  state.autoCycle   = auto.checked;
  state.continuous  = continuous.checked;
  state.paused      = pause.checked;
  state.audioMuted  = true;

  badge.textContent = `MODE: membrane approx (m=${state.m}, n=${state.n})`;
}
