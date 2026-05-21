// Braille progress-bar slider.
//
// Replaces native <input type=range>. Each instance is a row of four braille
// cells; one cell advances through 9 fill states (⠀ → ⣿), and the
// four cells are colored from a six-stop palette as fill crosses 25/50/75/100%
// boundaries. 37 discrete states map onto the [min,max] range.
//
// Rendering logic and palette extracted from kai-denrei/braille-lab/progress/
// (MIT). Same state machine; rewrapped as a vanilla-JS reusable component
// with < and > step buttons, tap-to-seek, drag-to-seek, long-press repeat,
// and arrow-key support.

const FILL_SHAPES = [
  "⠀", "⡀", "⡄", "⡆", "⡇",
  "⣇", "⣧", "⣷", "⣿",
];
const PLACEHOLDER = "⣿";
const TOTAL_STATES = 37;

export const PALETTES = {
  amber: {
    dim:      "#2a2620",
    default:  "#8a6a3a",
    "done-1": "#c89a55",
    "done-2": "#dcb46d",
    "done-3": "#efc88a",
    "done-4": "#ffdca8",
  },
  teal: {
    dim:      "#1a2628",
    default:  "#3a7a82",
    "done-1": "#5ab0b8",
    "done-2": "#7accd0",
    "done-3": "#a0dde0",
    "done-4": "#c8f0f4",
  },
  green: {
    dim:      "#1e2618",
    default:  "#4e7a3a",
    "done-1": "#73b05a",
    "done-2": "#99cc7a",
    "done-3": "#b8dd9d",
    "done-4": "#d8f0c2",
  },
  mono: {
    dim:      "#2a2a2a",
    default:  "#6a6a6a",
    "done-1": "#a0a0a0",
    "done-2": "#bcbcbc",
    "done-3": "#d8d8d8",
    "done-4": "#ffffff",
  },
};

function stateAt(n) {
  const glyphs = [PLACEHOLDER, PLACEHOLDER, PLACEHOLDER, PLACEHOLDER];
  const colors = ["dim", "dim", "dim", "dim"];
  if (n <= 0) return { glyphs, colors };
  const blockState = n - 1;
  const block = Math.floor(blockState / 9);
  const inBlock = blockState % 9;
  for (let i = 0; i < block; i++) colors[i] = `done-${i + 1}`;
  if (inBlock < 8) {
    glyphs[block] = FILL_SHAPES[inBlock + 1];
    colors[block] = "default";
  } else {
    colors[block] = `done-${block + 1}`;
  }
  return { glyphs, colors };
}

function stateIndexForPercent(percent) {
  const p = Math.max(0, Math.min(100, percent));
  return Math.floor((p / 100) * (TOTAL_STATES - 1));
}

export class BrailleSlider {
  constructor({ mount, min, max, step, value, label, palette = "amber", format }) {
    this.min = min;
    this.max = max;
    // NOTE: `stepSize`, not `step`. We also have a `step(dir)` method below;
    // an instance property named `step` would SHADOW that method (instance
    // properties beat prototype methods on lookup) and cause every < / >
    // tap to throw TypeError silently inside the event handler. This bug
    // was responsible for three rounds of "buttons don't work."
    this.stepSize = step;
    this.value = this._snap(value ?? min);
    this.palette = PALETTES[palette] || PALETTES.amber;
    this.format = format || ((v) => String(v));
    this.label = label || "";
    this.handlers = [];
    this._build(mount);
    this.render();
  }

  _build(mount) {
    mount.classList.add("bsl");
    mount.innerHTML = `
      <button type="button" class="bsl-step bsl-step-labeled" data-dir="-1"
              aria-label="decrease ${this.label}">
        <span class="bsl-label">${this.label}</span>
        <span class="bsl-arrow">&lt;</span>
      </button>
      <div class="bsl-bar" role="slider" tabindex="0"
           aria-label="${this.label}"></div>
      <button type="button" class="bsl-step" data-dir="1"
              aria-label="increase ${this.label}">&gt;</button>
    `;
    this.barEl = mount.querySelector(".bsl-bar");
    this.btns  = mount.querySelectorAll(".bsl-step");

    for (const btn of this.btns) {
      const dir = parseInt(btn.dataset.dir, 10);
      this._wireButton(btn, dir);
    }

    this.barEl.addEventListener("pointerdown", (e) => this._seekStart(e));
    this.barEl.addEventListener("keydown",     (e) => this._onKey(e));
  }

  // Belt-and-braces tap handling. Earlier attempts using only click or only
  // pointerup were unreliable on iOS: pointerleave fires on the tiniest
  // finger drift and was cancelling the tap, and bare click suffers the
  // touch-to-click delay + the page's scroll-priority heuristics. Now:
  //   - touchend with preventDefault fires step on touch (suppresses the
  //     synthesized click so it can't double-fire)
  //   - click handles mouse + keyboard
  //   - pointerdown + setTimeout handles long-press auto-repeat
  // didRepeat suppresses the single-tap path when long-press already advanced.
  _wireButton(btn, dir) {
    let holdT, repeatT;
    let didRepeat = false;

    const tap = () => this.step(dir);

    // ── Touch path ─────────────────────────────────────────────────────────
    btn.addEventListener("touchend", (e) => {
      e.preventDefault();
      if (didRepeat) { didRepeat = false; return; }
      tap();
    }, { passive: false });

    // ── Mouse + keyboard path ─────────────────────────────────────────────
    btn.addEventListener("click", () => {
      if (didRepeat) { didRepeat = false; return; }
      tap();
    });

    // ── Long-press detection ──────────────────────────────────────────────
    btn.addEventListener("pointerdown", (e) => {
      if (e.pointerType === "mouse" && e.button !== 0) return;
      didRepeat = false;
      btn.classList.add("bsl-step-active");
      holdT = setTimeout(() => {
        didRepeat = true;
        tap();
        repeatT = setInterval(tap, 60);
      }, 500);
    });

    const stopHold = () => {
      clearTimeout(holdT);
      clearInterval(repeatT);
      btn.classList.remove("bsl-step-active");
    };
    btn.addEventListener("pointerup",     stopHold);
    btn.addEventListener("pointercancel", stopHold);
    btn.addEventListener("pointerleave",  stopHold);
  }

  _seekStart(e) {
    e.preventDefault();
    this.barEl.focus();
    this.barEl.setPointerCapture(e.pointerId);
    const rect = this.barEl.getBoundingClientRect();
    const seek = (clientX) => {
      const p = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      this.setValue(this._snap(this.min + p * (this.max - this.min)));
    };
    seek(e.clientX);
    const move = (ev) => seek(ev.clientX);
    const up = (ev) => {
      this.barEl.removeEventListener("pointermove", move);
      this.barEl.removeEventListener("pointerup",     up);
      this.barEl.removeEventListener("pointercancel", up);
      try { this.barEl.releasePointerCapture(ev.pointerId); } catch { /* no-op */ }
    };
    this.barEl.addEventListener("pointermove", move);
    this.barEl.addEventListener("pointerup",     up);
    this.barEl.addEventListener("pointercancel", up);
  }

  _onKey(e) {
    switch (e.key) {
      case "ArrowLeft":
      case "ArrowDown":
        this.step(-1); e.preventDefault(); break;
      case "ArrowRight":
      case "ArrowUp":
        this.step(1); e.preventDefault(); break;
      case "PageDown":
        this.step(-10); e.preventDefault(); break;
      case "PageUp":
        this.step(10); e.preventDefault(); break;
      case "Home":
        this.setValue(this.min); e.preventDefault(); break;
      case "End":
        this.setValue(this.max); e.preventDefault(); break;
    }
  }

  _snap(v) {
    const k = Math.round((v - this.min) / this.stepSize);
    const snapped = this.min + k * this.stepSize;
    return Math.max(this.min, Math.min(this.max, snapped));
  }

  step(dir) {
    this.setValue(this._snap(this.value + dir * this.stepSize));
  }

  setValue(v, opts = {}) {
    const snapped = this._snap(v);
    if (snapped === this.value) return;
    this.value = snapped;
    this.render();
    if (!opts.silent) {
      for (const h of this.handlers) h(this.value);
    }
  }

  render() {
    const pct = (this.value - this.min) / (this.max - this.min) * 100;
    const state = stateAt(stateIndexForPercent(pct));
    this.barEl.innerHTML = state.glyphs.map((g, i) =>
      `<span style="color:${this.palette[state.colors[i]]}">${g}</span>`
    ).join("");
    this.barEl.setAttribute("aria-valuenow", String(this.value));
    this.barEl.setAttribute("aria-valuemin", String(this.min));
    this.barEl.setAttribute("aria-valuemax", String(this.max));
    this.barEl.setAttribute("aria-valuetext", this.format(this.value));
    this.barEl.setAttribute("title", `${this.label} = ${this.format(this.value)}`);
  }

  onChange(cb) { this.handlers.push(cb); return this; }
}
