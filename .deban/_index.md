---
project: cymatics
created: 2026-05-21
status: active
mode: solo
stale_threshold_days: 30
---

# cymatics — Index

## Brief

Interactive cymatics tool, built in three honest stages. **v1**: vanilla HTML5 + Canvas 2D toy field — square-membrane superposition `cos(nπx/L)·cos(mπy/L) − cos(mπx/L)·cos(nπy/L)`, labelled in code as the physics cheat. Buildless, ≥100k particles target. **v2**: scikit-fem biharmonic eigensolve on Kirchhoff–Love plate, free-edge natural BC, exports `modebank.json` to v1. **v3**: audio-reactive — uploaded tracks first, optional local YouTube ingest behind a CLI flag. Spec lives in `CYMATICS_BUILD.md`. Goal of this session: working V1 on localhost.

## Active Roles
- [[dev]] — owner: gerald
- [[arch]] — owner: gerald
- [[pm]] — owner: gerald
- [[ux]] — owner: gerald
- [[qa]] — owner: gerald
- [[devops]] — owner: gerald

## Key Decisions
- **Cymatics OWNS the audio source** — a hidden same-origin `<iframe src="studio.html?headless=1">` lives inside the cymatics page. The ⌁ dropdown sends `{type:'preset', key}` on a new `cymatics-control` BroadcastChannel (separate lane from the audio→field `cymatics` stream); the iframe loads the preset and plays. No second tab is opened. See [[arch]], [[dev]].
- **Bidirectional channel structure**: `cymatics` carries the 60Hz audio-feature stream (one-way per STUDIO_INTEGRATION §0); a NEW `cymatics-control` channel carries discrete control commands (`preset`, `stop`) from cymatics → studio. Spec was extended explicitly. See [[arch]].
- **Cache-busting toolkit extended**: the upstream `cache-busting` skill only fingerprints HTML/CSS. A project-local `v1/scripts/fingerprint-js-imports.py` was added to fingerprint ES-module imports inside .js files (static `import…from`, dynamic `import(…)`, `new URL("./X.js", import.meta.url)`). Without this, three rounds of "fix the buttons" shipped to GH Pages but never reached the user's browser. See [[devops]].
- **Preset content must be SPECTRALLY distinct, not just melodically distinct**: feature→(M,N) mapping reads `centroid` and `bass`; two presets with the same drum vocab produce the same field regardless of pitch. Six presets re-tuned along orthogonal (BPM, hat density, kick density, voicing) axes. See [[ux]], [[dev]].

## Open Questions (cross-role)
- [ ] **RESUME HERE — main↔studio LINKS BROKEN.** User reports cross-tab navigation doesn't work as expected. Symptoms unclear; needs diagnosis. Candidates: ↗ button URL malformed; iframe not receiving control messages; `?preset=` / `?autoplay=` params not honored; back-link from studio losing `?chan=`. See [[arch]], [[dev]], [[qa]].
- [ ] **RESUME HERE — CYMATICS VISUALS DON'T REFLECT SELECTED TUNE on either page.** This is the basic v2 functionality and is failing despite shipping ~20 commits aimed at it. The audio→field chain has a break somewhere. Diagnostic procedure in [[qa]] § "Resume diagnostic". DO NOT iterate further on the existing code paths — the user explicitly flagged "turning in circle." See [[qa]], [[arch]], [[dev]].
- [ ] Can Canvas 2D actually sustain ≥100k particles at 60fps on M-series? Spec asserts; not yet measured. — see [[dev]], [[qa]]
- [ ] How does the cache-busting on-save watcher coexist with the buildless v1 constraint? — see [[devops]], [[arch]]
