---
role: ux
owner: gerald
status: active
last-updated: 2026-05-21
---

# UX / Design

## Scope
Owns the editorial dark aesthetic, the mono-numeric control layout, and the on-screen physics-honesty label. Cache-busting visual widget (3 shapes) is also a UX surface.

## Decisions
| Date | Decision | Rationale | Linked roles |
|---|---|---|---|
| 2026-05-21 | Palette locked: bg `#0d0d0f`, amber `#d9a441`, teal `#3fb6a8`; serif headings, monospace numbers | Spec §2 aesthetic | [[dev]] |
| 2026-05-21 | The "MODE: membrane approx (m,n)" label is part of UI chrome, not a toggleable overlay — physics caveat must always be visible | Spec §Phase 1 + Phase 2: regime visibility is the whole reason v1 and v2 exist as separate stages | [[arch]], [[pm]] |
| 2026-05-21 | Cache-bust badge = 3 shapes in the corner (per cache-busting skill); colour-cycles with token so a stale tab is visible at a glance | User requested explicitly. The badge is the only UI element that can falsify itself, which is exactly the point. | [[devops]] |

## Dead Ends
| Date | What was tried | Why it failed / was rejected |
|---|---|---|

## Lessons

## Open Questions
- [ ] Does the 3-shape favicon collide with the editorial dark aesthetic, or does its function (state indicator) override aesthetics? — owner: gerald — since: 2026-05-21

## Assumptions
- [A user looking at the page in 2 minutes can distinguish "fresh load" from "stale cached" via the 3-shape widget without explanation] — status: untested — since: 2026-05-21

## Dependencies
Blocked by: [[dev]] (controls panel must exist before UX polish)
Feeds into:

## Session Log
2026-05-21 — Aesthetic palette and physics-honesty label policy committed; cache-bust widget framed as a UX feature, not a build tool.
