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
| 2026-05-22 | **Two-channel bridge between cymatics and studio**: `BroadcastChannel('cymatics')` is the one-way audio→field stream (60Hz, per STUDIO_INTEGRATION §0); `BroadcastChannel('cymatics-control')` is a new discrete-command lane carrying `{type:'preset', key}` and `{type:'stop'}` from cymatics → studio. Spec was deliberately extended. | The user wanted the cymatics dropdown to drive the studio's preset choice. Adding control payloads to the existing channel would have polluted the 60Hz stream and broken the "one-way only" promise for that channel. Two channels keep responsibilities crisp. | [[dev]], [[ux]] |
| 2026-05-22 | **Cymatics OWNS the audio source via a hidden same-origin iframe** (`<iframe src="studio.html?headless=1">`). Studio runs as both a standalone tab (full UI, editor mode) AND as the embedded engine inside cymatics (headless, engine only). | User asked for "MASTER TUNE on the main page" and "don't bring me to the studio." Same-origin iframe means user activation propagates → AudioContext unblocks on the dropdown click. Studio HTML stays a single artefact serving two roles via the `?headless=1` query param — no engine duplication. | [[dev]] |
| 2026-05-22 | Cymatics tab consumes BOTH the embedded iframe AND any externally-opened standalone studio tab through the same `cymatics` channel. Last-write-wins. No mute coordination. | Edge case: user opens BOTH the cymatics page and a separate studio tab on the same origin — they will hear two engines layered. Documented and accepted; not common in practice. Future fix: an "owner" handshake on the control channel to ensure exactly one engine is master. | [[dev]] |

## Dead Ends
| Date | What was tried | Why it failed / was rejected |
|---|---|---|
| 2026-05-22 | Routing preset selection through `window.open(url, "cymatics-studio")` with `?preset=&autoplay=1` and a named target | User rejected wholesale: "clicking a tune from the main page in the drop should NOT bring the user to the studio." Replaced with the embedded-iframe architecture above. |

## Lessons
- **Two channels beat one when responsibilities differ.** Mixing 60Hz feature streams with rare discrete commands on the same `BroadcastChannel` invites payload-type sniffing, schema drift, and broken one-way guarantees. Pay the cost of a second channel name. — from 2026-05-22
- **A spec invariant ("one-way only") can be extended by introducing a new channel without violating the original.** The new channel inherits a new contract; the old channel keeps its promise. — from 2026-05-22

## Open Questions
- [ ] Should `modebank.json` ship under `v1/data/` (served as static asset) or stay under `fem/out/` and be symlinked? — owner: gerald — since: 2026-05-21

## Assumptions
- [The spec's three "physical systems" distinction (plate vs membrane vs Faraday vs inverse) will hold against future scope creep; v3 audio-reactive will not be allowed to silently introduce a fourth model] — status: validated — since: 2026-05-21
- [No build step is achievable for v1 even with cache-busting layered on top — the on-save watcher rewrites tokens, not source] — status: untested — since: 2026-05-21

## Dependencies
Blocked by:
Feeds into: [[dev]], [[devops]]

## Session Log
2026-05-22 — Bridge architecture between cymatics and studio settled: two channels (`cymatics` 60Hz audio→field stream; `cymatics-control` discrete commands cymatics→studio), embedded same-origin iframe as the audio source for the cymatics page, standalone studio.html available as the editor view. Spec extension documented above.
2026-05-21 — Architecture contract between stages and cache-busting integration locked in at scaffold time.
