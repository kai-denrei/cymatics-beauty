---
role: qa
owner: gerald
status: active
last-updated: 2026-05-21
---

# QA / Validation

## Scope
Owns the validation gates 1, 2, 3. Gate failures stop work. Spec §0: "do not paper over physics with parameter fudging."

## Decisions
| Date | Decision | Rationale | Linked roles |
|---|---|---|---|
| 2026-05-21 | Gate 1 checklist is enforced as 5 explicit checks before V1 commit; the PM subagent owns running them | Spec §Phase 1 Validation Gate 1 | [[pm]], [[dev]] |
| 2026-05-21 | "100k particles @ 60fps" is measured with a visible on-screen FPS readout, not asserted in a comment | Number on screen is harder to fudge than a `// fast enough` comment | [[dev]] |

## Dead Ends
| Date | What was tried | Why it failed / was rejected |
|---|---|---|

## Lessons

## Open Questions
- [ ] Should the FPS readout sit inside the cache-bust widget (one piece of self-disclosing chrome) or be a separate corner element? — owner: gerald — since: 2026-05-21

## Assumptions
- [`m == n` guard is enough to keep the field non-degenerate — has not been tested for adversarial inputs like very large m, n where modular collisions on the grid matter] — status: untested — since: 2026-05-21

## Dependencies
Blocked by: [[dev]]
Feeds into:

## Session Log
2026-05-21 — Gate 1 audit run by PM subagent: spec items 1/3/4/5 PASS on static read; item 2 (60fps@100k) marked owner-verifies-visually with FPS readout wired in `index.html:63-65`. No functional defects beyond a misleading comment (fixed by dev).
2026-05-21 — Gate 1 framed as 5 explicit, observable checks; FPS goes on screen not in comments.
