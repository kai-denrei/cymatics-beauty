// Wiring for the controls panel. Constructs BrailleSlider instances in place
// of native <input type=range>, then attaches change handlers that funnel
// through state.applyMode (for m/n) or update state directly (for count,
// temp, speed). Icon buttons replace native toggles for pause / continuous /
// cycle. About dialog opens on the "+" trigger.

import { BrailleSlider } from "./braille-slider.js";

const PALETTE_M     = "amber";
const PALETTE_N     = "amber";
const PALETTE_COUNT = "teal";
const PALETTE_TEMP  = "teal";
const PALETTE_SPEED = "teal";

export function wireUI(state, opts = {}) {
  const $ = (id) => document.getElementById(id);

  const mnWarn     = $("mn-warn");
  const badge      = $("mode-badge");
  const freqOut    = $("freq");

  const pauseBtn      = $("pause-btn");
  const continuousBtn = $("continuous-btn");
  const cycleBtn      = $("cycle-btn");
  const reseedBtn     = $("reseed-btn");
  const audioBtn      = $("audio-toggle");

  const aboutBtn      = $("about-btn");
  const aboutDialog   = $("about-dialog");
  const aboutClose    = aboutDialog?.querySelector(".about-close");

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
      label: "speed", palette: PALETTE_SPEED, format: fmt2,
    }),
  };
  state.sliders = sliders;

  // --- Mode application (m/n shared path) ------------------------------------
  state.applyMode = (m, n) => {
    state.m = m;
    state.n = n;
    const collide = m === n;
    mnWarn.hidden = !collide;
    badge.textContent = `MODE: m=${m}, n=${n}`;
    if (!collide) state.onModeChange?.(m, n);
  };

  sliders.m.onChange((v) => state.applyMode(v, state.n));
  sliders.n.onChange((v) => state.applyMode(state.m, v));

  sliders.count.onChange((v) => { state.count = v; });
  sliders.temp.onChange((v)  => { state.temperature = v; });
  sliders.speed.onChange((v) => { state.speed = v; });

  // --- Icon-button toggles ---------------------------------------------------
  function setToggle(btn, on, glyphOn, glyphOff) {
    btn.setAttribute("aria-pressed", String(on));
    if (glyphOn != null && glyphOff != null) {
      btn.textContent = on ? glyphOn : glyphOff;
    }
  }

  pauseBtn.addEventListener("click", () => {
    state.paused = !state.paused;
    setToggle(pauseBtn, state.paused, "▶", "⏸");
    pauseBtn.setAttribute("aria-label", state.paused ? "play" : "pause");
  });

  continuousBtn.addEventListener("click", () => {
    state.continuous = !state.continuous;
    setToggle(continuousBtn, state.continuous);
  });

  cycleBtn.addEventListener("click", () => {
    state.autoCycle = !state.autoCycle;
    setToggle(cycleBtn, state.autoCycle);
  });

  reseedBtn.addEventListener("click", () => {
    state.reseedRequested = true;
    // Quick visual pulse.
    reseedBtn.classList.add("pulse");
    setTimeout(() => reseedBtn.classList.remove("pulse"), 250);
  });

  // --- Audio -----------------------------------------------------------------
  audioBtn.addEventListener("click", () => {
    state.audioMuted = !state.audioMuted;
    setToggle(audioBtn, !state.audioMuted, "🔊", "🔇");
    audioBtn.setAttribute("aria-label", state.audioMuted ? "unmute audio" : "mute audio");
    state.onAudioToggle?.(state.audioMuted);
  });

  state.setFrequencyDisplay = (hz) => {
    freqOut.textContent = hz != null ? `${hz.toFixed(1)} Hz` : "— Hz";
  };

  // --- About dialog ----------------------------------------------------------
  if (aboutBtn && aboutDialog) {
    const openDlg  = () => { try { aboutDialog.showModal(); } catch { aboutDialog.setAttribute("open", ""); } };
    const closeDlg = () => { try { aboutDialog.close(); } catch { aboutDialog.removeAttribute("open"); } };
    aboutBtn.addEventListener("click", openDlg);
    aboutClose?.addEventListener("click", closeDlg);
    // Backdrop click closes the dialog.
    aboutDialog.addEventListener("click", (e) => {
      if (e.target === aboutDialog) closeDlg();
    });
  }

  // --- Initial sync ----------------------------------------------------------
  state.m           = sliders.m.value;
  state.n           = sliders.n.value;
  state.count       = sliders.count.value;
  state.temperature = sliders.temp.value;
  state.speed       = sliders.speed.value;
  state.autoCycle   = false;
  state.continuous  = false;
  state.paused      = false;
  state.audioMuted  = true;

  badge.textContent = `MODE: m=${state.m}, n=${state.n}`;
}
