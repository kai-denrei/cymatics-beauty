// Braille progress-bar slider.
//
// Replaces native <input type=range>. Each instance is a row of N braille
// cells (default 4); one cell advances through 9 fill states (⠀ → ⣿),
// and completed cells are colored from a six-stop palette. With N=4 there
// are 37 discrete states; the seek bar in studio2 uses N=8 (73 states,
// 8 cells × 8 dots ≈ 1 dot per bar across a 64-bar arrangement).
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

// Default (percentage) state machine: cells × 9 + 1 states. Each cell has 9
// in-cell states — 8 dot-fills plus a 9th "transition" state where the cell
// flips to its done color BEFORE the next cell starts filling. This extra
// state is what lets a percentage-driven slider hit 100% visually even when
// the value range doesn't divide evenly into the dot count.
//
// `cells` >= 1. Done colors cycle every 4 cells because the palette only
// defines done-1..done-4.
function stateAt(n, cells) {
  const glyphs = new Array(cells).fill(PLACEHOLDER);
  const colors = new Array(cells).fill("dim");
  if (n <= 0) return { glyphs, colors };
  const blockState = n - 1;
  const block = Math.floor(blockState / 9);
  const inBlock = blockState % 9;
  for (let i = 0; i < block; i++) colors[i] = `done-${(i % 4) + 1}`;
  if (inBlock < 8) {
    glyphs[block] = FILL_SHAPES[inBlock + 1];
    colors[block] = "default";
  } else {
    colors[block] = `done-${(block % 4) + 1}`;
  }
  return { glyphs, colors };
}

// Tight state machine: cells × 8 states total, ONE dot per state. No extra
// in-cell transition state — when a cell fills to 8 dots it flips directly
// to its done color, and the next step starts filling the next cell. Used
// by the studio2 seek bar so 1 dot maps exactly to 1 bar of the arrangement
// (no mid-bar "2-dot jumps" to land on a transition state). Color change
// every 8th dot is the only signal that 8 bars are done.
function stateAtTight(n, cells) {
  const glyphs = new Array(cells).fill(PLACEHOLDER);
  const colors = new Array(cells).fill("dim");
  if (n <= 0) return { glyphs, colors };
  for (let block = 0; block < cells; block++) {
    const dots = Math.max(0, Math.min(8, n - block * 8));
    if (dots === 0) continue;          // still PLACEHOLDER ⣿ in dim
    if (dots === 8) {
      glyphs[block] = PLACEHOLDER;     // ⣿
      colors[block] = `done-${(block % 4) + 1}`;
    } else {
      glyphs[block] = FILL_SHAPES[dots];
      colors[block] = "default";
    }
  }
  return { glyphs, colors };
}

function stateIndexForPercent(percent, totalStates) {
  const p = Math.max(0, Math.min(100, percent));
  return Math.floor((p / 100) * (totalStates - 1));
}

export class BrailleSlider {
  constructor({ mount, min, max, step, value, label, palette = "amber", format, cells = 4, tight = false }) {
    this.min = min;
    this.max = max;
    // NOTE: `stepSize`, not `step`. We also have a `step(dir)` method below;
    // an instance property named `step` would SHADOW that method (instance
    // properties beat prototype methods on lookup) and cause every < / >
    // tap to throw TypeError silently inside the event handler. This bug
    // was responsible for three rounds of "buttons don't work."
    this.stepSize = step;
    this.cells = cells;
    this.tight = tight;
    // Tight: one state per dot, cells*8 total. Default: cells*9+1 (with the
    // legacy in-cell transition state).
    this.totalStates = tight ? cells * 8 : cells * 9 + 1;
    this.value = this._snap(value ?? min);
    this.palette = PALETTES[palette] || PALETTES.amber;
    this.format = format || ((v) => String(v));
    this.label = label || "";
    this.handlers = [];
    this._build(mount);
    this.render();
  }

  // Update min/max in place — used by the studio2 seek slider when a new
  // preset loads with a different arrangement length. In tight mode the
  // state index is computed as `value - min`, so updating max changes the
  // slider's reach without changing the dots-per-bar ratio.
  setRange({ min, max } = {}) {
    if (min != null) this.min = min;
    if (max != null) this.max = max;
    if (this.value > this.max) this.value = this.max;
    if (this.value < this.min) this.value = this.min;
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
    let stateIndex;
    if (this.tight) {
      // Direct 1:1 — slider value (offset from min) IS the dot count, clamped
      // to the visual capacity (cells*8). Bypasses the percentage formula so
      // shorter ranges don't stretch to fill the whole bar; instead the bar
      // fills proportionally and 1 dot always = 1 unit of the slider.
      stateIndex = Math.max(0, Math.min(this.totalStates - 1, (this.value - this.min) | 0));
    } else {
      const pct = (this.value - this.min) / (this.max - this.min) * 100;
      stateIndex = stateIndexForPercent(pct, this.totalStates);
    }
    const stateFn = this.tight ? stateAtTight : stateAt;
    const state = stateFn(stateIndex, this.cells);
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
