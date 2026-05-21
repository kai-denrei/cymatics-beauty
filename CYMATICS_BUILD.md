# CYMATICS — Build Spec

> Agent brief for Claude Code CLI. Read this whole file before writing anything.
> Execute in phases. Do **not** skip the validation gate at the end of each phase.
> Commit at every gate. If a gate fails, stop and report — do not paper over physics with parameter fudging.

---

## 0. Purpose & framing (read twice)

Build an interactive cymatics tool in two honest stages:

- **v1 — Toy field.** The square-membrane superposition trick. Fast, pretty, runs in a browser with no build step. *Known to be physically wrong* and labelled as such in the code.
- **v2 — Real plate.** A `scikit-fem` biharmonic eigensolve with **free-edge boundary conditions** — i.e. the actual Kirchhoff–Love thin-plate eigenvalue problem that Chladni's bowed plates obey. This is the part with intellectual content; almost every public repo gives up here.
- **v3 (later) — Reactive.** Drive the renderer from real audio: uploaded tracks first, optional YouTube extraction second.

### The one distinction that governs everything

Three different physical systems get filed under "cymatics." Do not conflate them in code or comments:

| Regime | Governing operator | Particles go to | Order |
|---|---|---|---|
| Dry sand on a vibrating **plate** (classic Chladni) | biharmonic ∇⁴ (Kirchhoff–Love) | **nodes** (zero displacement) | 4th |
| Fine powder / lycopodium (**inverse** Chladni) | acoustic streaming in air, not the plate | **antinodes** | — |
| Liquid surface (water/oil) — Faraday waves | Mathieu equation, parametric instability | — | — |

**v1 silently substitutes a membrane (∇², 2nd order, drumhead) for a plate (∇⁴, 4th order).** It looks right and is wrong. v2 exists specifically to fix this. The agent must never "improve" v2 by reaching back for the membrane formula.

---

## 1. Licensing reality — do this correctly

- `luciopaiva/chladni` has **no license declared** ⇒ all rights reserved. **Do not copy its source verbatim.** Study its README and architecture notes (web-worker pattern, precomputed gradient field) as *prior art*, then reimplement clean-room.
- The pattern function itself is mathematics and not copyrightable — reimplement it freely.
- If a forkable MIT base is wanted, use one of these instead of luciopaiva's code:
  - `StellarScript/Cymatics` — MIT, Three.js + React, 3D particle settling.
  - `hilbertcube/Chladni-Patterns-Generator` — MIT, square + polar models, README explicitly states the biharmonic equation is the true model (good conceptual bridge to v2).
  - `CDInstitute/3DChladni` — MIT (SGI 2024), marching-cubes 3D, eigenfunction framing.
- Reference, not fork: Paul Bourke's Chladni article (the canonical write-up of the formula); `CuriousAvenger/pyChladniPlate` (MIT-style, modal superposition + inverse photo-matching) for v2 inspiration; Thomas Müller, *Numerical Chladni figures*, arXiv:1308.5523 for the FEM recipe.
- Ship a `LICENSE` (MIT) and a `CREDITS.md` attributing Bourke, Müller, and any MIT repo whose approach is reused.

---

## 2. Hard constraints

**v1 (browser):**
- Vanilla **HTML5 + ES modules + Canvas 2D**. **No build step**, no bundler, no framework, no npm runtime deps. Must run from `python3 -m http.server` or by opening `index.html`.
- ES modules via native `<script type="module">`. No transpile.
- Target: 60 fps with ≥100k particles on an M-series Mac at quarter-HD internal resolution. Heavy compute (field + gradient) goes in a **Web Worker**; main thread only animates particles.

**v2 (compute):**
- Python ≥3.11 in its own venv under `fem/`. Deps: `scikit-fem`, `numpy`, `scipy`, `matplotlib` (validation plots), `meshio`. Pin versions in `fem/requirements.txt`.
- v2 is an offline solver. It emits a **mode bank** (JSON + `.npy`) that v1's renderer can load. The two stages communicate through that artifact, not through a live Python server (keep v1 buildless).

**Aesthetic (both stages):**
- Dark editorial. Background near-black `#0d0d0f`. Serif for headings, monospace for numbers/controls. Accent amber `#d9a441`, secondary teal `#3fb6a8`. Nodal lines render bright on dark. No gradients-as-decoration, no rounded-everything. Numbers everywhere (m, n, frequency, eigenvalue) shown in mono.

---

## 3. Repo layout

```
cymatics/
  README.md                 # user-facing; how to run each stage
  LICENSE                   # MIT
  CREDITS.md
  CYMATICS_BUILD.md         # this file
  v1/
    index.html
    src/
      main.js               # app shell, render loop, UI wiring
      field.js              # pattern + gradient (the "cheat"), runs in worker
      worker.js             # web worker entry
      particles.js          # particle integrator
      ui.js                 # controls
      modebank.js           # (added in Phase 2 handoff) loads FEM mode bank
    styles.css
  fem/
    requirements.txt
    plate.py                # mesh, bilinear forms, eigensolve
    boundary.py             # BC handling (free / clamped / simply-supported)
    extract.py              # nodal-line extraction -> contours
    export.py              # write mode bank for v1
    validate.py             # analytic + Chladni-law checks
    cli.py                  # `python -m fem.cli ...`
    out/                    # generated mode banks (gitignored)
  v3/                       # added in Phase 3
    audio.js                # Web Audio FFT -> dominant frequency
    ingest_youtube.py       # OPTIONAL, local-only, see Phase 3 caveats
```

---

## Phase 1 — v1: toy field (vanilla JS)

### Goal
A live Chladni toy: pick m, n (or auto-cycle), watch particles settle onto nodal lines. Fast, buildless, honest about being the membrane approximation.

### The field
Square plate, side L, screen coords (x, y) ∈ [0, L]²:

```
f(x, y) = cos(nπx/L)·cos(mπy/L) − cos(mπx/L)·cos(nπy/L)
```

Nodal set is `f = 0`. m = n yields nothing — guard against it. In `field.js`, put a top-of-file comment block stating plainly: *this is the membrane/Helmholtz superposition, not the Kirchhoff plate; frequencies implied here are not physical; v2 replaces this.*

### Particle model
- N particles, random start. Each step: sample the **gradient** of |f| at the particle's cell and nudge **down-gradient** toward the nearest node, plus a small temperature term (random jitter) that decays as the pattern stabilises, so grains "shake" into place rather than snap.
- Precompute field + gradient once per (m, n) on a grid in the worker; particles only do cheap lookups on the main thread. (This is the luciopaiva insight — reimplement, don't copy.)
- Gradient field: per cell, central differences of |f|; store as Float32Array, packed as a flat buffer and transferred (not copied) from worker to main thread.

### UI (mono controls, amber/teal)
- m, n integer steppers (with m≠n guard).
- Particle count, jitter/temperature, settle speed sliders.
- Auto-cycle toggle (random (m,n) every X s, as luciopaiva does) — "as if the drive frequency were sweeping."
- Pause / reseed.
- A visible label: `MODE: membrane approx (m,n)` so the physics caveat is on screen, not just in code.

### Validation gate 1
- [ ] Runs from `python3 -m http.server` with zero install.
- [ ] 100k particles ≥ 60 fps at quarter-HD internal res on Apple silicon.
- [ ] Recognisable figures for several (m,n); m=n handled gracefully.
- [ ] Worker transfer (not structured-clone copy) confirmed via no main-thread jank on pattern switch.
- [ ] `field.js` carries the "this is the cheat" comment.
- **Commit:** `v1: membrane-approx Chladni toy`.

---

## Phase 2 — the real jump: `scikit-fem` biharmonic eigensolve, free edges

This is the substance. The membrane formula is discarded here. Solve the **Kirchhoff–Love thin-plate** eigenvalue problem on a real mesh.

### The PDE
Transverse displacement w(x,y,t):

```
D ∇⁴w + ρh ∂²w/∂t² = 0 ,   D = E h³ / [12(1−ν²)]
```

Separate time → biharmonic eigenproblem. Weak form of the Kirchhoff bending energy (the bilinear form to assemble):

```
a(u,v) = ∫_Ω [ ν Δu Δv + (1−ν) ( u_xx v_xx + 2 u_xy v_xy + u_yy v_yy ) ] dΩ
m(u,v) = ∫_Ω u v dΩ
```

Generalized eigenproblem: **K φ = λ M φ**, with λ = ρh ω² / D. Eigenvectors φ are mode shapes; **nodal lines are their zero level sets** — that is what sand traces.

### Element choice — the actual hard part
4th-order ⇒ the weak form needs **C¹ continuity** (gradients continuous across element edges). Stock Lagrange (`ElementTriP1/P2`) are only C⁰ and will give wrong/garbage bending modes. Use one of:

- **`ElementTriMorley`** — non-conforming plate-bending element, the pragmatic starting point. scikit-fem ships a Kirchhoff-plate example built on it; mirror that assembly. Cheap, converges, good enough to get correct nodal topology.
- **`ElementTriArgyris`** — fully C¹ conforming (quintic, 21 DOF/triangle). The "correct" choice; more expensive and finicky. Move to this once Morley validates, if higher fidelity is wanted.

Do **not** substitute a 2nd-order Laplacian element to make life easier — that silently reintroduces the membrane and defeats the entire phase.

### Boundary conditions — the counter-intuitive bit
Chladni's plate is **free on all edges** (bowed, unclamped). In the *weak* formulation, a free edge is the **natural** BC: vanishing bending moment and vanishing effective (Kirchhoff) shear emerge automatically when you impose **nothing** on the boundary. So free edges are the *easy* BC to code — you just don't apply any Dirichlet constraint. (The historical difficulty with free edges was analytical, not finite-element.) Provide `boundary.py` with three switchable modes for validation:
- `free` — no constraints (this is the physical Chladni case, the default).
- `simply_supported` — w = 0 on ∂Ω (easiest to validate against closed form).
- `clamped` — w = 0 and ∂w/∂n = 0.

### Rigid-body modes — must handle
A free plate has **3 zero-energy modes** (1 translation + 2 rotations). The eigensolve will return 3 near-zero λ. Either (a) shift-invert around a positive target with `scipy.sparse.linalg.eigsh(K, M=M, sigma=σ, which='LM')`, or (b) compute the lowest k and discard the first 3. Document which. Without this, the first "Chladni modes" reported will be spurious.

### Solve
- Assemble sparse K, M. Use `eigsh` (symmetric generalized) with shift-invert for the lowest ~30 nonzero modes.
- Map λ → physical frequency: `ω = sqrt(λ D / (ρh))`, `f = ω/2π`. Use steel defaults (E=200 GPa, ρ=7850, ν=0.3, h=0.5 mm, square 0.24 m) so results are checkable against the literature.

### Nodal-line extraction (`extract.py`)
- For each retained mode, evaluate φ on a fine grid; extract the **zero contour** (marching squares, e.g. `skimage.measure.find_contours(field, 0.0)` or `matplotlib` contour at level 0).
- Store contours as polylines in plate coordinates.

### Export to v1 (`export.py`)
Emit `fem/out/modebank.json`:
```json
{
  "plate": {"L": 0.24, "h": 5e-4, "E": 2e11, "rho": 7850, "nu": 0.3, "bc": "free"},
  "modes": [
    {"index": 4, "freq_hz": 123.4, "lambda": 1.2e7,
     "nodal_lines": [[[x,y],...], ...]}
  ]
}
```
Add `v1/src/modebank.js`: load the bank, and add a renderer mode that **draws real nodal lines** and settles particles onto them (reuse the Phase-1 particle integrator, but the "field" is now distance-to-nearest-nodal-polyline instead of the membrane formula). UI gains a `MODE: FEM free-edge (f = … Hz)` label so the two regimes are visibly distinct on screen.

### Validation gate 2 — non-negotiable
- [ ] `simply_supported` square reproduces the closed-form eigenfrequencies `f_mn ∝ (m² + n²)` to <2% on a refined mesh (sanity anchor — this case *has* an analytic answer).
- [ ] `free` case shows the expected **3 rigid-body zero modes**, then physical modes.
- [ ] Free circular (or square) plate eigenfrequencies follow **Chladni's law trend** `f ∝ (m + 2n)²` qualitatively; nodal counts increase correctly with mode index.
- [ ] Mesh-refinement study: lowest ~6 nonzero frequencies converge as mesh halves.
- [ ] Morley vs Argyris agree on nodal **topology** for low modes.
- [ ] `modebank.json` loads in v1 and renders real nodal lines distinct from v1's membrane figures.
- **Commit:** `v2: scikit-fem biharmonic free-edge eigensolve + mode bank`.

> If any analytic check is off by more than a few %, the bug is almost always (a) C⁰ element sneaking in, (b) rigid-body modes not discarded, or (c) K/M assembled with mismatched DOF ordering. Check those before touching tolerances.

---

## Phase 3 — v3: audio-reactive (uploaded tracks, then YouTube)

### Architecture principle
Decouple the **drive signal → mode selection** map from both renderers. A driver produces a target frequency (or a small set of weighted frequencies); a matcher resolves it to the nearest entry in the Phase-2 eigenfrequency table; the renderer crossfades particles to that mode. v1's membrane renderer can take the same target by mapping frequency → (m,n) heuristically, but the FEM bank is the physically meaningful target.

### Path A — uploaded audio (primary, clean)
- Web Audio API: `<input type=file>` → `decodeAudioData` → `AnalyserNode` FFT.
- Per frame: get the magnitude spectrum, find the dominant bin (or top-k peaks), smooth over time (EMA) to avoid jitter.
- Matcher: nearest eigenfrequency in `modebank.json`; crossfade nodal-line target over ~0.5 s so particles flow between patterns instead of teleporting.
- Optional: bandpass into low/mid/high and drive three weighted modes simultaneously (closer to real multi-modal plate response).
- All client-side, no upload off-device. This is the default and the one to polish.

### Path B — YouTube ingestion (optional, local-only, caveated)
This needs honest handling, not silent automation:

- **Browsers cannot read YouTube audio directly** (CORS / DRM / ToS). Any "paste a YouTube link" feature requires a **local helper** that downloads/extracts audio, which is what `v3/ingest_youtube.py` is for (e.g. wrapping `yt-dlp` to pull bestaudio → wav).
- **Caveat to surface in the README, not bury:** downloading YouTube audio is contrary to YouTube's Terms of Service and may implicate the rights of the audio's owner. This helper is for **local, personal R&D on content you have the right to use** (your own uploads, CC-licensed, public-domain, or material you're licensed for). Do **not** ship it as a hosted feature, do not bundle downloaded audio in the repo, and `.gitignore` the audio cache.
- Pipeline once a local wav exists: identical to Path A (decode → FFT → match). The YouTube step is purely "get a local file"; everything downstream is shared.
- Keep `ingest_youtube.py` opt-in (not invoked by default), clearly commented with the above, and gated behind an explicit CLI flag.

### Validation gate 3
- [ ] Uploaded track drives smooth pattern transitions tracking dominant frequency.
- [ ] Matcher snaps to real FEM eigenfrequencies; on-screen readout shows detected Hz vs matched mode Hz.
- [ ] Multi-band mode (if built) produces visibly richer, multi-modal patterns.
- [ ] `ingest_youtube.py` is opt-in, documented with the ToS caveat, never auto-runs, audio cache gitignored.
- **Commit:** `v3: audio-reactive (file upload + optional local YouTube ingest)`.

### Phase 3 — generative studio path (intermediate, shipped 2026-05-21)

Ahead of Path A's uploaded-audio FFT pipeline and Path B's local YouTube
ingest, a third path is wired in: a sibling page (`v1/studio.html`) generates
trance/ambient/DnB beds in-engine with WebAudio, extracts the same spectral
features an upload pipeline would, and broadcasts the resulting (M, N, J, S)
stream to the cymatics tab over `BroadcastChannel`. v1's listener lives in
`v1/src/live.js`; activate it with the `⌁` icon button in the cymatics tab.

#### BroadcastChannel contract (verbatim per STUDIO_INTEGRATION §2)

The studio posts this object every animation frame (~60 Hz) on
`BroadcastChannel('cymatics')` (channel name overridable per-tab with
`?chan=NAME` on both URLs):

```js
{
  type: 'cymatics',          // discriminator — ignore anything else
  t: 1234.5,                 // performance.now() at emit
  M: 7,  N: 3,               // mode indices, int 1..12, M !== N
  J: 0.42,                   // jitter, 0..1
  S: 1.18,                   // settle speed, 0.1..3
  beat: true,                // kick onset this frame
  reseed: false,             // true once per bar (every 4th beat)
  rms: 0.31,                 // loudness 0..1
  bass: 0.55, mid: 0.20, treble: 0.08,  // band energy 0..1
  centroid: 0.34             // spectral brightness 0..1
}
```

One-way only: the cymatics tab never talks back. The receiver clamps `M ≠ N`
defensively even though the emitter already enforces it.

#### Membrane-cheat caveat (per STUDIO_INTEGRATION §1.2)

The studio's feature→mode mapping is a *cheat keyed to the membrane
approximation*, exactly like v1's tone. `(M, N)` are picked by binning
spectral centroid + bass energy onto the 1..12 grid the v1 toy field expects;
they are not derived from real plate eigenfrequencies. When v2's
`scikit-fem` mode bank lands, the same contract re-targets — `(M, N)` become
**bank indices**, and `live.js` maps `centroid`/`bass` onto bank-index space
at the `// v2:` marker. Do not "improve" the studio's `mapToField` by
reaching into the FEM solver — the two stay decoupled by design.

---

## Appendix A — physics reference (so v2 never regresses to a membrane)

- **Plate (correct, v2):** `D∇⁴w + ρh ∂²w/∂t² = 0`, `D = Eh³/[12(1−ν²)]`. 4th order. Needs C¹ FEM. Free edge = natural BC.
- **Membrane (the v1 cheat):** `∇²w + k²w = 0`. 2nd order. The `cos·cos − cos·cos` formula solves *this*, not the plate.
- **Chladni's law (circular plate, empirical):** `f ∝ (m + 2n)²`, m = diametric lines, n = nodal circles.
- **Modal/driven response (advanced, optional):** real plates are point-driven and damped → inhomogeneous Helmholtz with a source at the exciter, `(∇²/D² + k²)Ψ = A·δ(r−r_s)`, solved via Green's function / eigenfunction expansion. `pyChladniPlate` does this with modal superposition.
- **Inverse Chladni (do not implement as "plate"):** fine particles → antinodes via acoustic streaming; time-averaged Eulerian air velocity points the *wrong* way (toward nodes), Lagrangian velocity points toward antinodes. A separate fluid model, out of scope unless explicitly requested.

## Appendix B — repos & papers

- Study (no license): `luciopaiva/chladni` (+ Paul Bourke's Chladni article).
- Forkable MIT bases: `StellarScript/Cymatics`, `hilbertcube/Chladni-Patterns-Generator`, `CDInstitute/3DChladni`.
- v2 references: `CuriousAvenger/pyChladniPlate` (modal + inverse photo-matching); Thomas Müller, *Numerical Chladni figures*, arXiv:1308.5523 (FEM recipe); `kai5z/Chladni-patterns` (Mindlin–Reissner driven steady state).
- scikit-fem: use its Morley Kirchhoff-plate example as the assembly template.

## Appendix C — gotcha checklist

- [ ] Never use a C⁰/Laplacian element for the plate — it reintroduces the membrane.
- [ ] Free-edge = impose nothing (natural BC); don't over-constrain.
- [ ] Discard/handle the 3 rigid-body zero modes on free plates.
- [ ] Use shift-invert `eigsh` for the lowest nonzero modes; dense `eig` won't scale.
- [ ] Validate against the simply-supported analytic case before trusting free-edge numbers.
- [ ] v1 stays buildless — no Python server dependency at runtime; FEM talks to v1 only through the exported mode bank.
- [ ] Worker buffers transferred, not cloned.
- [ ] YouTube ingest stays opt-in, local, caveated, gitignored.
- [ ] No personal data in any committed file.
