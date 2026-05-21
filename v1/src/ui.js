// Wiring for the controls panel. Returns a reactive state object that main.js
// can read each frame; mutations from the UI surface as property updates plus
// an onChange callback for the (m, n) pair (which forces a worker recompute).

export function wireUI(state) {
  const $ = (id) => document.getElementById(id);

  const m       = $("m");
  const n       = $("n");
  const mOut    = $("m-out");
  const nOut    = $("n-out");
  const mnWarn  = $("mn-warn");
  const count   = $("count");
  const countOut= $("count-out");
  const temp    = $("temp");
  const tempOut = $("temp-out");
  const speed   = $("speed");
  const speedOut= $("speed-out");
  const auto       = $("auto");
  const continuous = $("continuous");
  const pause      = $("pause");
  const reseed     = $("reseed");
  const badge      = $("mode-badge");
  const audioBtn   = $("audio-toggle");
  const freqOut    = $("freq");

  function refreshMN() {
    state.m = +m.value;
    state.n = +n.value;
    mOut.textContent = state.m;
    nOut.textContent = state.n;
    const collide = state.m === state.n;
    mnWarn.hidden = !collide;
    badge.textContent = `MODE: membrane approx (m=${state.m}, n=${state.n})`;
    if (!collide) state.onModeChange?.(state.m, state.n);
  }

  m.addEventListener("input", refreshMN);
  n.addEventListener("input", refreshMN);

  count.addEventListener("input", () => {
    state.count = +count.value;
    countOut.textContent = state.count.toLocaleString();
  });
  temp.addEventListener("input", () => {
    state.temperature = +temp.value;
    tempOut.textContent = state.temperature.toFixed(2);
  });
  speed.addEventListener("input", () => {
    state.speed = +speed.value;
    speedOut.textContent = state.speed.toFixed(2);
  });
  auto.addEventListener("change", () => { state.autoCycle = auto.checked; });
  continuous.addEventListener("change", () => { state.continuous = continuous.checked; });
  pause.addEventListener("change", () => { state.paused = pause.checked; });
  reseed.addEventListener("click", () => { state.reseedRequested = true; });

  audioBtn.addEventListener("click", () => {
    state.audioMuted = !state.audioMuted;
    audioBtn.textContent = state.audioMuted ? "unmute" : "mute";
    audioBtn.setAttribute("aria-pressed", String(!state.audioMuted));
    state.onAudioToggle?.(state.audioMuted);
  });

  // Exposed for main.js to update on (m,n) change.
  state.setFrequencyDisplay = (hz) => {
    freqOut.textContent = hz != null ? `${hz.toFixed(1)} Hz` : "— Hz";
  };

  // Initial sync.
  state.m = +m.value;
  state.n = +n.value;
  state.count = +count.value;
  state.temperature = +temp.value;
  state.speed = +speed.value;
  state.autoCycle = auto.checked;
  state.continuous = continuous.checked;
  state.paused = pause.checked;
  state.audioMuted = true;
  countOut.textContent = state.count.toLocaleString();
  tempOut.textContent = state.temperature.toFixed(2);
  speedOut.textContent = state.speed.toFixed(2);
  badge.textContent = `MODE: membrane approx (m=${state.m}, n=${state.n})`;
}
