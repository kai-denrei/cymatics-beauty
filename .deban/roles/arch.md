---
role: arch
owner: gerald
status: active
last-updated: 2026-05-21
---

# Architecture

## Scope
Owns the contract between stages — what each layer is allowed to know, how v1 and v2 communicate, what the cache-busting layer guarantees. Defends the "honest stages" framing in the spec.

## Decisions
| Date | Decision | Rationale | Linked roles |
|---|---|---|---|
| 2026-05-21 | v1 and v2 communicate only via `fem/out/modebank.json` (and `.npy` siblings) — no live Python server at runtime | Spec §2: keep v1 buildless and shippable as static files | [[dev]], [[devops]] |
| 2026-05-21 | Driver→matcher→renderer indirection is enforced in v3 so v1's membrane and v2's FEM bank are both valid match targets | Spec §Phase 3: drive signal decoupled from renderer | [[dev]] |
| 2026-05-21 | Cache-busting token lives in a single source of truth (`v1/buildinfo.json` or equivalent) imported by both HTML refs and the visible 3-shape widget | Avoids drift between "what changed" and "what the badge shows" — the widget's whole purpose is to make stale loads visible | [[devops]], [[ux]] |

## Dead Ends
| Date | What was tried | Why it failed / was rejected |
|---|---|---|

## Lessons

## Open Questions
- [ ] Should `modebank.json` ship under `v1/data/` (served as static asset) or stay under `fem/out/` and be symlinked? — owner: gerald — since: 2026-05-21

## Assumptions
- [The spec's three "physical systems" distinction (plate vs membrane vs Faraday vs inverse) will hold against future scope creep; v3 audio-reactive will not be allowed to silently introduce a fourth model] — status: validated — since: 2026-05-21
- [No build step is achievable for v1 even with cache-busting layered on top — the on-save watcher rewrites tokens, not source] — status: untested — since: 2026-05-21

## Dependencies
Blocked by:
Feeds into: [[dev]], [[devops]]

## Session Log
2026-05-21 — Architecture contract between stages and cache-busting integration locked in at scaffold time.
