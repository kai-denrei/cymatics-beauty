// Wiring for the controls panel. Constructs BrailleSlider instances in place
// of native <input type=range>, then attaches change handlers that funnel
// through state.applyMode (m, n) or update state directly (count, temp,
// speed). Icon buttons replace native toggles for pause / continuous /
// cycle / reseed. About dialog opens on the "+" trigger.

import { BrailleSlider } from "./braille-slider.js?v=bde1b86f";

export function wireUI(state, opts = {}) {
  const $ = (id) => document.getElementById(id);
  const live = opts.live;

  const freqOut = $("freq");

  const pauseBtn      = $("pause-btn");
  const continuousBtn = $("continuous-btn");
  const cycleBtn      = $("cycle-btn");
  const reseedBtn     = $("reseed-btn");
  const liveBtn       = $("live-btn");
  const audioBtn      = $("audio-toggle");

  const aboutBtn      = $("about-btn");
  const aboutDialog   = $("about-dialog");
  const aboutClose    = aboutDialog?.querySelector(".about-close");

  const defaultCount = opts.defaultCount ?? 60000;

  const fmtInt = (v) => Number(v).toLocaleString();
  const fmt2   = (v) => Number(v).toFixed(2);

  // --- Sliders ---------------------------------------------------------------
  // Landing defaults are deliberate (see request 2026-05-21): they put the
  // visualizer at a strong, dense pattern out of the gate, so the page
  // looks alive on first paint rather than mid-settle. `defaultCount` from
  // main.js is ignored on purpose — 154k particles is the chosen anchor.
  const sliders = {
    m: new BrailleSlider({
      mount: $("slot-m"), min: 1, max: 12, step: 1, value: 9,
      label: "M", palette: "amber", format: fmtInt,
    }),
    n: new BrailleSlider({
      mount: $("slot-n"), min: 1, max: 12, step: 1, value: 4,
      label: "N", palette: "amber", format: fmtInt,
    }),
    temp: new BrailleSlider({
      mount: $("slot-temp"), min: 0, max: 1, step: 0.01, value: 0.75,
      label: "J", palette: "amber", format: fmt2,
    }),
    speed: new BrailleSlider({
      mount: $("slot-speed"), min: 0.1, max: 3, step: 0.05, value: 1.6,
      label: "S", palette: "amber", format: fmt2,
    }),
    count: new BrailleSlider({
      mount: $("slot-count"), min: 2000, max: 200000, step: 2000,
      value: 154000,
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
    if (live?.active) {
      // Pause the audio-driven M/N for the spec's 1.8s window so a manual
      // < / > tap is honoured. J/S still track the stream within the window.
      state.liveOverrideUntil = performance.now() + 1800;
    }
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

  // --- LIVE (audio-reactive driver) ------------------------------------------
  // ⌁ flips state.live; the live receiver in main.js gates auto-cycle/cont.
  // off, and we disable those buttons here to make the precedence visible.
  // Auto-mute the internal ♪ when LIVE comes on (studio is the sound source,
  // running both produces a doubled, detuned drone). No auto-unmute on off —
  // user owns ♪ from then on.
  if (liveBtn && live) {
    liveBtn.addEventListener("click", () => {
      const on = !live.active;
      live.setActive(on);
      setToggle(liveBtn, on);
      liveBtn.setAttribute("aria-label", on ? "live audio off" : "live audio on");
      if (on && !state.audioMuted) {
        audioBtn.click();   // share the mute path so ♪ aria-pressed stays in sync.
      }
    });

    live.onChange((on) => {
      continuousBtn.disabled = on;
      cycleBtn.disabled = on;
      if (on) liveBtn.classList.remove("detect");
    });

    // Discoverability hint: while LIVE is OFF but the studio is broadcasting,
    // pulse the ⌁ button so the user knows there's something to bind. The
    // receiver itself stays silent in this mode — clicking the button is the
    // only thing that actually applies the stream. Per STUDIO_INTEGRATION.md
    // §5: "live OFF: ignore the channel entirely" remains intact (we only
    // observe the timestamp, not the payload).
    setInterval(() => {
      const should = !live.active && live.isBroadcastFresh();
      liveBtn.classList.toggle("detect", should);
    }, 250);
  }

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
  state.continuous  = true;     // ∞ on by default per landing spec
  state.paused      = false;    // play mode on
  state.audioMuted  = true;
  setToggle(continuousBtn, state.continuous);
}
