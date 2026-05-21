---
role: pm
owner: gerald
status: active
last-updated: 2026-05-21
---

# Project Management

## Scope
Owns scope, sequencing, and the "stop and report" discipline at each validation gate. This role is also the seat of the dispatched PM subagent.

## Decisions
| Date | Decision | Rationale | Linked roles |
|---|---|---|---|
| 2026-05-21 | This session's goal = V1 only (Phase 1). v2 (FEM) and v3 (audio) are explicitly out of scope for today. | User asked for "working V1 in localhost". Spec gates demand commit + report between phases. | [[dev]], [[qa]] |
| 2026-05-21 | A subagent acts as PM for the V1 push, executing field/worker/particles/ui/main/styles + Validation Gate 1 | User requested PM delegation explicitly. | [[dev]] |

## Dead Ends
| Date | What was tried | Why it failed / was rejected |
|---|---|---|

## Lessons

## Open Questions
- [ ] Five untested assumptions surfaced at init (see below). Treat as PM's checklist before declaring V1 "done". — owner: gerald — since: 2026-05-21

## Assumptions
<!-- Brief challenge surfaced at /deban init: -->
- [Canvas 2D can sustain 100k particles @ 60fps without WebGL — spec asserts but does not cite a measurement] — status: untested — since: 2026-05-21
- [The buildless constraint and the on-save cache-bust watcher are compatible — watcher rewrites tokens, not source, but it still requires a Node process running in dev, which is a tacit dependency the spec does not acknowledge] — status: untested — since: 2026-05-21
- [Users reading the on-screen "MODE: membrane approx (m,n)" label will understand it means the physics is wrong — labelling is not the same as comprehension] — status: untested — since: 2026-05-21
- [Free-edge eigenvalues from Morley element will yield exactly 3 near-zero rigid-body modes — in practice Morley's non-conforming DOFs at the boundary can produce >3 spurious low modes that need filtering by mass-normalized energy threshold, not by count alone] — status: untested — since: 2026-05-21
- [`v3/ingest_youtube.py` being "opt-in, local, gitignored" is sufficient mitigation for YouTube ToS exposure — depends on jurisdiction and whether the user is the rights holder; the spec's caveat is honest but not legal advice] — status: untested — since: 2026-05-21

## Dependencies
Blocked by:
Feeds into: [[dev]], [[qa]], [[ux]]

## Gate 1 audit
Performed 2026-05-21 by PM subagent against served `http://localhost:8765/` (cwd `v1/`). Token bumped during audit: `fcbdc7df` → `f5dcb003`, favicon cell 60 → 53.

1. **Canvas 2D can sustain 100k particles @ 60fps without WebGL.** — *partly-validated*. Code path is sound: single `ImageData` buffer, one Uint32 write per particle, `putImageData` once per frame, particle step uses packed Float32Array with bilinear gradient lookup — no per-particle Canvas calls. The 60fps number itself is owner-verifies-visually via on-screen FPS readout (`#fps`, `#frame-ms` in `index.html:63-65`).
2. **Buildless and on-save cache-bust watcher are compatible.** — *validated for the bumper*. `scripts/bust.sh` ran clean against `v1/` with no node/npm; only python3 + posix tools. `cb-badge.js` is a passive runtime reader of `<meta name="cb">`, no build coupling. The "watcher requires a Node process" concern is moot for V1 because the bumper itself is a shell script — the watcher is not installed in this layout. Marking the tacit-dependency concern resolved at gate 1.
3. **"MODE: membrane approx (m,n)" label is comprehended as physics-wrong.** — *still-untested*. Label renders correctly (`ui.js:31, 65`) and the italic hint below the badge explicitly says "the membrane/Helmholtz superposition, not the Kirchhoff plate. v2 replaces this." That's labelling adequacy, not comprehension. Needs an actual user. Owner verifies.
4. **Morley element yields exactly 3 rigid-body modes on free edges.** — *still-untested*. Out of scope at gate 1 (v2 / phase 2). Carried forward.
5. **`v3/ingest_youtube.py` opt-in/local/gitignored is sufficient ToS mitigation.** — *still-untested*. Out of scope at gate 1 (v3 / phase 3). Carried forward.

## Session Log
2026-05-21 — Gate 1 audit complete: 5/5 spec checks pass on static read, 1 fix applied (misleading ImageData byte-order comment in main.js), token bumped to f5dcb003. Assumptions #1–#2 advanced; #3 needs user; #4–#5 deferred to later phases.
2026-05-21 — V1 scoped, PM-subagent dispatch agreed, five assumptions surfaced as PM's gate-1 audit list.
