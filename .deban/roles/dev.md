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
