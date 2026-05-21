---
role: devops
owner: gerald
status: active
last-updated: 2026-05-21
---

# DevOps

## Scope
Owns local dev loop (the `python3 -m http.server` story), the cache-busting toolkit, and the v2 venv when Phase 2 starts.

## Decisions
| Date | Decision | Rationale | Linked roles |
|---|---|---|---|
| 2026-05-21 | Dev server = `python3 -m http.server` from repo root or `v1/`. No node/npm in v1 runtime path. | Spec §2 | [[arch]] |
| 2026-05-21 | Cache-busting toolkit installed at scaffold time, before any feature work — the on-save watcher exists so v1 development never serves a stale module while the spec is still in flux | User requested explicitly. | [[dev]], [[ux]] |

## Dead Ends
| Date | What was tried | Why it failed / was rejected |
|---|---|---|

## Lessons

## Open Questions
- [ ] If the cache-busting on-save watcher requires Node, is it acceptable as a *dev* dependency (yes) vs runtime (no)? — owner: gerald — since: 2026-05-21

## Assumptions
- [`python3 -m http.server` on macOS 15+ serves ES modules with correct `application/javascript` MIME by default] — status: untested — since: 2026-05-21

## Dependencies
Blocked by:
Feeds into: [[dev]]

## Session Log
2026-05-21 — Cache-bust bumper exercised cleanly during gate 1 audit: token fcbdc7df → f5dcb003, favicon cell 60 → 53, 4 URLs rewritten in 1 file via `bash v1/scripts/bust.sh --target v1 --quiet`. All same-origin assets serve 200 from python3 -m http.server on :8765.
2026-05-21 — Local dev story and cache-busting installation order recorded at scaffold time.
