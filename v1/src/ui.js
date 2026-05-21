// Wiring for the controls panel. Constructs BrailleSlider instances in place
// of native <input type=range>, then attaches change handlers that funnel
// through state.applyMode (m, n) or update state directly (count, temp,
// speed). Icon buttons replace native toggles for pause / continuous /
// cycle / reseed. About dialog opens on the "+" trigger.

import { BrailleSlider } from "./braille-slider.js?v=5a82704b";
import { PRESET_OPTIONS } from "./live.js?v=5a82704b";

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
  // ⌁ now opens a dropdown of presets. Picking a preset:
  //   - enables LIVE (auto-mutes internal ♪ to avoid double-drone)
  //   - sends {type:'preset', key} on the cymatics-control channel if the
  //     studio is already broadcasting (live.isBroadcastFresh()), so the
  //     studio swaps to that preset in place — no new tab spawned
  //   - otherwise opens studio.html?preset=KEY&autoplay=1 in a named tab
  //     ("cymatics-studio") so picking again just re-targets the same tab
  // Picking "off" disables LIVE without touching the studio (audio keeps
  // playing on the other tab; cymatics just stops binding to it).
  const liveMenu = $("live-menu");
  if (liveBtn && live && liveMenu) {
    // Build menu items.
    function makeItem(key, label) {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "live-menu-item";
      b.dataset.preset = key;
      b.role = "menuitem";
      b.textContent = label;
      return b;
    }
    liveMenu.appendChild(makeItem("off", "off"));
    for (const { key, label } of PRESET_OPTIONS) {
      liveMenu.appendChild(makeItem(key, label));
    }

    function closeMenu() {
      liveMenu.hidden = true;
      liveBtn.setAttribute("aria-expanded", "false");
    }
    function openMenu() {
      liveMenu.hidden = false;
      liveBtn.setAttribute("aria-expanded", "true");
      // Close on next outside click (or Esc).
      setTimeout(() => {
        const onDoc = (e) => {
          if (!e.target.closest("#live-menu") && e.target !== liveBtn) {
            closeMenu();
            document.removeEventListener("click", onDoc, true);
          }
        };
        document.addEventListener("click", onDoc, true);
      }, 0);
    }
    function pickPreset(key) {
      if (key === "off") {
        if (live.active) {
          live.setActive(false);
          setToggle(liveBtn, false);
          liveBtn.setAttribute("aria-label", "live audio — pick a preset");
        }
        return;
      }
      // Engage LIVE if not already on.
      if (!live.active) {
        live.setActive(true);
        setToggle(liveBtn, true);
        liveBtn.setAttribute("aria-label", "live audio active");
        if (!state.audioMuted) audioBtn.click();  // auto-mute internal ♪
      }
      // Drive the studio: in-place if broadcasting, otherwise open a tab.
      if (live.isBroadcastFresh()) {
        live.sendControl({ type: "preset", key });
      } else {
        const chan = new URL(location.href).searchParams.get("chan");
        let url = "./studio.html?preset=" + encodeURIComponent(key) + "&autoplay=1";
        if (chan) url += "&chan=" + encodeURIComponent(chan);
        window.open(url, "cymatics-studio");
      }
    }

    liveMenu.addEventListener("click", (e) => {
      const item = e.target.closest(".live-menu-item");
      if (!item) return;
      pickPreset(item.dataset.preset);
      closeMenu();
    });
    liveBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      if (liveMenu.hidden) openMenu(); else closeMenu();
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && !liveMenu.hidden) closeMenu();
    });

    live.onChange((on) => {
      continuousBtn.disabled = on;
      cycleBtn.disabled = on;
      if (on) liveBtn.classList.remove("detect");
    });

    // Discoverability hint + now-playing label. While LIVE is OFF but the
    // studio is broadcasting, the ⌁ button pulses. The label below the
    // iconbar shows the currently-loaded preset name; both surfaces become
    // dim when no broadcast has arrived in the last 500ms. Per
    // STUDIO_INTEGRATION.md §5: "live OFF: ignore the channel entirely"
    // remains intact (we only observe the timestamp + label string).
    const nowPlayingEl = $("now-playing");
    if (nowPlayingEl) {
      live.onTrack((label) => {
        nowPlayingEl.textContent = label || "—";
      });
    }
    setInterval(() => {
      const fresh = live.isBroadcastFresh();
      liveBtn.classList.toggle("detect", !live.active && fresh);
      if (nowPlayingEl) nowPlayingEl.classList.toggle("dim", !fresh);
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
