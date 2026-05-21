# CREDITS

Original work. Prior art studied, reimplemented clean-room — not copied.

## Mathematical / physical references

- **Paul Bourke**, *Chladni patterns*. Canonical write-up of the
  `cos(nπx/L)·cos(mπy/L) − cos(mπx/L)·cos(nπy/L)` superposition used in v1.
  Used as a reference for the membrane-approximation formula; the formula
  itself is mathematics, not copyrightable.

- **Thomas Müller**, *Numerical Chladni figures from a finite-element scheme*,
  arXiv:1308.5523. FEM recipe consulted for the v2 plate eigensolve.

## Prior-art repos studied (architecture only, no code copied)

- `luciopaiva/chladni` — **no license declared, all rights reserved.**
  README + architecture notes (web-worker pattern, precomputed gradient field)
  studied as prior art and reimplemented clean-room. Zero source copied.

## Forkable MIT bases consulted

- `StellarScript/Cymatics` (MIT) — Three.js + React, 3D particle settling.
- `hilbertcube/Chladni-Patterns-Generator` (MIT) — square + polar models,
  with a README that explicitly identifies the biharmonic as the true model
  (a good conceptual bridge from v1 to v2).
- `CDInstitute/3DChladni` (MIT, SGI 2024) — marching-cubes 3D eigenfunction
  framing.

## v2 inspiration (not yet integrated)

- `CuriousAvenger/pyChladniPlate` — modal superposition + inverse photo-matching.
- `kai5z/Chladni-patterns` — Mindlin–Reissner driven steady state.
- `scikit-fem` — the Morley Kirchhoff-plate example is the assembly template.

## Cache-busting layer

- 3-shape favicon + on-save token bumper installed via the `cache-busting`
  superpower skill (Gerald's local toolkit).
