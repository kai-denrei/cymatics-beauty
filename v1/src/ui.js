// Wiring for the controls panel. Constructs BrailleSlider instances in place
// of native <input type=range>, then attaches change handlers that funnel
// through state.applyMode (m, n) or update state directly (count, temp,
// speed). Icon buttons replace native toggles for pause / continuous /
// cycle / reseed. About dialog opens on the "+" trigger.

import { BrailleSlider } from "./braille-slider.js?v=5890bbbd";

export function wireUI(state, opts = {}) {
  const $ = (id) => document.getElementById(id);

  const freqOut = $("freq");

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
  // Single-letter labels match the compact dashboard mock.
  const sliders = {
    m: new BrailleSlider({
      mount: $("slot-m"), min: 1, max: 12, step: 1, value: 3,
      label: "M", palette: "amber", format: fmtInt,
    }),
    n: new BrailleSlider({
      mount: $("slot-n"), min: 1, max: 12, step: 1, value: 5,
      label: "N", palette: "amber", format: fmtInt,
    }),
    temp: new BrailleSlider({
      mount: $("slot-temp"), min: 0, max: 1, step: 0.01, value: 0.5,
      label: "J", palette: "amber", format: fmt2,
    }),
    speed: new BrailleSlider({
      mount: $("slot-speed"), min: 0.1, max: 3, step: 0.05, value: 1,
      label: "S", palette: "amber", format: fmt2,
    }),
    count: new BrailleSlider({
      mount: $("slot-count"), min: 2000, max: 200000, step: 2000,
      value: defaultCount,
      label: "P", palette: "teal", format: fmtInt,
    }),
  };
  state.sliders = sliders;

  // --- Mode application (m/n shared path) ------------------------------------
  // Manual user clicks land here via the onChange handlers below; triggerSwap
  // in main.js calls applyMode directly with values guaranteed-not-equal by
  // randomMode(). No collision branch needed.
  state.applyMode = (m, n) => {
    state.m = m;
    state.n = n;
    state.onModeChange?.(m, n);
  };

  // M ≠ N is enforced silently: if the user's < / > would land on the other
  // axis's value, skip one more step in the same direction. If that's
  // out of range, revert to the prior value. No flash, no toast, no row.
  function commitMode(which, newVal) {
    const other = which === "m" ? state.n : state.m;
    const prev  = which === "m" ? state.m : state.n;
    const slider = sliders[which];

    let target = newVal;
    if (target === other) {
      const dir = target >= prev ? 1 : -1;
      const skipped = target + dir;
      if (skipped >= slider.min && skipped <= slider.max && skipped !== other) {
        target = skipped;
      } else {
        // Out of range or also collides: stay put.
        slider.setValue(prev, { silent: true });
        return;
      }
      slider.setValue(target, { silent: true });
    }

    if (which === "m") state.applyMode(target, state.n);
    else               state.applyMode(state.m, target);
  }

  sliders.m.onChange((v) => commitMode("m", v));
  sliders.n.onChange((v) => commitMode("n", v));

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

  // U+FE0E (variation selector-15) forces text-style rendering on iOS;
  // without it, ⏸/⏵ default to color emoji.
  const GLYPH_PAUSE = "⏸︎";
  const GLYPH_PLAY  = "⏵︎";

  pauseBtn.addEventListener("click", () => {
    state.paused = !state.paused;
    setToggle(pauseBtn, state.paused, GLYPH_PLAY, GLYPH_PAUSE);
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
    reseedBtn.classList.add("pulse");
    setTimeout(() => reseedBtn.classList.remove("pulse"), 240);
  });

  // --- Audio -----------------------------------------------------------------
  // ♪ stays as the glyph; state is conveyed by aria-pressed (color shift).
  audioBtn.addEventListener("click", () => {
    state.audioMuted = !state.audioMuted;
    setToggle(audioBtn, !state.audioMuted);
    audioBtn.setAttribute("aria-label", state.audioMuted ? "unmute audio" : "mute audio");
    state.onAudioToggle?.(state.audioMuted);
  });

  state.setFrequencyDisplay = (hz) => {
    freqOut.textContent = hz != null ? `${hz.toFixed(1)} Hz` : "— Hz";
  };

  // --- About dialog ----------------------------------------------------------
  if (aboutBtn && aboutDialog) {
    const openDlg  = () => { try { aboutDialog.showModal(); } catch { aboutDialog.setAttribute("open", ""); } };
    const closeDlg = () => { try { aboutDialog.close();      } catch { aboutDialog.removeAttribute("open"); } };
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
}
