---
role: dev
owner: gerald
status: active
last-updated: 2026-05-21
---

# Dev

## Scope
Implements v1 (vanilla JS/Canvas2D toy) and v2 (scikit-fem solver). Owns code quality, performance budgets, and the membrane-vs-plate honesty in comments and on-screen labels.

## Decisions
| Date | Decision | Rationale | Linked roles |
|---|---|---|---|
| 2026-05-21 | v1 uses native ES modules + Canvas 2D, no bundler | Spec §2 hard constraint: buildless, openable from `python3 -m http.server` or `file://` | [[arch]], [[devops]] |
| 2026-05-21 | Field + gradient computed in Web Worker; transferable buffers (not structured-clone copy) | Spec §Phase 1 + Appendix C: avoid main-thread jank on (m,n) switch | [[arch]], [[qa]] |
| 2026-05-21 | Render particles via `ImageData` pixel writes, not per-particle `fillRect` | Per-particle Canvas calls collapse to <30fps well before 100k particles; ImageData byte writes are the only Canvas2D path that touches 100k | [[qa]] |
| 2026-05-21 | Replaced contradictory byte-order comment in `src/main.js:71-72` with explicit per-byte breakdown of BG/PT Uint32 literals | Audit at gate 1 surfaced the contradiction ("ABGR" then "AABBGGRR"); literal values were correct, only the comment was wrong. | [[pm]], [[qa]] |
| 2026-05-21 | Studio integration: receiver module `v1/src/live.js`, BroadcastChannel `cymatics` (override `?chan=`), LIVE button `⌁` in iconbar | Per STUDIO_INTEGRATION brief. One-way bridge audio→field; no return channel. Worker schema, particle integrator, field equation untouched. | [[arch]], [[devops]] |
| 2026-05-21 | LIVE on disables ∞/↻ buttons + auto-mutes ♪ via shared mute path | Spec §5: beat-snap + per-bar reseed from stream replace auto-cycle; doubled drone if both sound sources active. ♪ stays user-toggleable; no auto-unmute on LIVE off so user owns ♪ after manual intervention. | [[ux]] |
| 2026-05-21 | Manual `<`/`>` overrides audio M/N for 1.8s via `state.liveOverrideUntil` written in `ui.js#commitMode` and read in `live.js` | Spec §5 mirrors the existing v1 override clock semantics (`lastSwapAt` in main.js). J/S still apply during the window per receiver design. | [[ux]] |
| 2026-05-21 | `(M,N)` mapping from spectral features stays as v1 membrane cheat; `// v2:` marker at the lookup site in `live.js` | Spec §1.2 honesty: feature→mode is a cheat keyed to the membrane approx, not real plate eigenfrequencies. v2 mode bank will reinterpret. | [[arch]] |

## Dead Ends
<!-- APPEND ONLY. Never delete. -->
| Date | What was tried | Why it failed / was rejected |
|---|---|---|

## Lessons
<!-- Distilled principles from Dead Ends. Written to be read cold. -->

## Open Questions
- [ ] Will the spec's 100k particles @ 60fps target hold under realistic jitter + gradient lookups, or does it need ImageData double-buffering / pixel-coalescing? — owner: gerald — since: 2026-05-21
- [ ] At Validation Gate 2, does Morley element really discard 3 rigid-body modes cleanly, or do edge rotational DOFs leak extra near-zero eigenvalues? — owner: gerald — since: 2026-05-21

## Assumptions
- [Canvas 2D ImageData putImageData can sustain 60fps with 100k particle writes on M4] — status: untested — since: 2026-05-21
- [Native ES module imports work consistently when served from `python3 -m http.server` with MIME for `.js`] — status: untested — since: 2026-05-21
- [scikit-fem's Morley element example in their docs is current and applies to free-edge BC without modification] — status: untested — since: 2026-05-21

## Dependencies
Blocked by:
Feeds into: [[qa]], [[ux]]

## Session Log
2026-05-21 — Gate 1 static audit: all 5 JS modules pass `node --check`; one comment fixed in main.js; no functional defects found.
2026-05-21 — Initial decisions on rendering strategy and worker transfer recorded ahead of implementation.
2026-05-21 — Studio integration wired: `v1/studio.html`, `v1/src/live.js`, LIVE/`↗` icons in iconbar, preset selector + 4 presets in studio. All 8 JS modules pass `node --check`; cache-bust rotated to `facc7321` with 7 imports fingerprinted across 3 JS files.
