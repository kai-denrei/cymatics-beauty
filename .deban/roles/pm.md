---
role: pm
owner: gerald
status: active
last-updated: 2026-05-21
---

# Project Management

## ⚠ RESUME HERE — 2026-05-22

Two failures the user flagged at the close of the long iteration session and asked to solve **fresh** on the next context:

1. **Main page ↔ Studio LINKS BROKEN.** User says the pages "somewhat work individually, but their links are broken." Specific symptom not yet pinpointed. Diagnostic candidates:
   - `↗` button on the cymatics iconbar — opens `./studio.html` in a new tab; does the URL forward `?chan=` correctly? Does the new tab actually receive focus / load?
   - `↗ field` back-link in studio header — does it carry `?chan=` back to the cymatics URL?
   - Embedded iframe `studio.html?headless=1` — does the iframe finish loading before the user picks a preset? Does its `controlChan` listener register before the message arrives? Is the iframe's `chan` matching the parent's?
   - ⌁ dropdown → preset pick — does `live.sendControl({type:'preset', key})` actually reach the iframe? Verify by listening on `cymatics-control` from the dev console of cymatics tab.
2. **Cymatics VISUALS don't reflect the currently-selected tune** on either page. This is the basic v2 functionality and is failing despite ~20 commits aimed at it.

**Resume procedure (don't iterate, diagnose):**
1. Open `studio.html` standalone (no `?headless`) in a single tab. Pick `gm-trance`. Hit ▶. Read the on-screen M/N readout in the right pane: do M and N actually change on each beat? If NOT, the studio engine itself is broken — `mapToField` outputs static values regardless of audio. That's the bug.
2. If YES — M/N change in studio standalone — open cymatics in a new tab. Click `⌁`, pick the same preset. Does the cymatics field move? If NOT, the bridge (or the receiver) is broken.
3. If field doesn't move: open cymatics dev console, install a `BroadcastChannel('cymatics').onmessage = e => console.log(e.data)` shim. Pick a preset. Are messages arriving? If not, the iframe isn't broadcasting (autoplay blocked, AudioContext not unlocked).
4. If messages arrive but field doesn't move: `v1/src/live.js#onmessage` isn't applying. Could be: gated wrongly on `active`, `state.sliders` not wired, `state.applyMode` missing — log around the assignment lines.

**DO NOT** rewrite event handlers, restructure preset content, or do another cache-bust round before doing steps 1-4. The user spent half a session watching us iterate on the wrong layer.

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
| 2026-05-22 | "Fix the buttons" iteration — three separate event-handler rewrites (click → pointerup → touchend+click) across multiple turns without diagnosing the actual call target | The wiring was never the bug. The `step` instance property was shadowing the `step()` method. A single `console.log(typeof this.step)` would have ended the iteration in 30 seconds; instead it consumed ~half the session. PM lesson: when a fix doesn't land twice, demand a diagnostic step, not a third fix. |
| 2026-05-22 | Cache-busting the HTML+entry-point on each fix and trusting the deploy log ("Pages success") to mean the fix shipped | Module imports inside .js files weren't being fingerprinted; the user's browser kept executing the cached old modules. Three commits shipped a "fix" that the user could never see. PM lesson: "shipped to GH Pages" ≠ "running in the user's browser." Require a curl-and-verify-served-content step before declaring a fix done. |
| 2026-05-22 | Differentiating presets by only changing notes (G minor vs A minor, etc.) — keeping the same drum kit, chord rhythm, arp shape | User reported "they sound the same." Root cause: the audio→field mapping reads spectral features (centroid/bass/mid/treble), not pitch. Same drums + same instrumentation → same field, regardless of key. Fixed by re-tuning presets on (BPM, hat density, kick density, voicing) axes. PM lesson: when a visual-spec is driven by audio features, validate the feature variance, not the notation variance. |

## Lessons
- **"Doesn't work" from a user with a specific symptom is a diagnostic signal, not a request to rewrite a layer.** Ask one more question before iterating. — from 2026-05-22
- **A code change is not done until it's observed running in the user's browser, not just deployed.** The byte-on-server vs byte-in-browser-module-map gap is invisible to the developer and total to the user. — from 2026-05-22
- **Iteration without diagnosis is process debt that compounds.** Three fix attempts at the wrong layer cost more than one diagnostic pause would have. When the user says "still doesn't work" the second time, stop and instrument. — from 2026-05-22

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
2026-05-22 — Long iteration session. Many surface-level fixes shipped; two foundational failures (cross-tab links, audio→visual coupling) remain unresolved. User flagged "turning in circle" — next session must START WITH DIAGNOSIS, not fixes. See ⚠ RESUME HERE at top of this file.
2026-05-21 — Gate 1 audit complete: 5/5 spec checks pass on static read, 1 fix applied (misleading ImageData byte-order comment in main.js), token bumped to f5dcb003. Assumptions #1–#2 advanced; #3 needs user; #4–#5 deferred to later phases.
2026-05-21 — V1 scoped, PM-subagent dispatch agreed, five assumptions surfaced as PM's gate-1 audit list.
2026-05-21 — Studio integration complete: studio at `v1/studio.html`, receiver at `v1/src/live.js`, LIVE button + cross-link in iconbar, preset selector with 4 presets in studio. Cache-bust token rotated to `facc7321`. See `.deban/roles/dev.md` for the decision table.

## Studio integration — what was NOT built
- **Decision-point 4 v2 forward-compat** (per STUDIO_INTEGRATION §7.4): the receiver leaves a `// v2:` marker at the M/N apply site in `v1/src/live.js`. No actual bank-index mapping was written — when the FEM mode bank lands, the marker site is where `centroid`/`bass` get mapped onto bank-index space. This is deliberately deferred.
- **Path A (uploaded audio FFT pipeline)** and **Path B (`v3/ingest_youtube.py`)** from the v3 row remain unbuilt. The generative studio is a *third* path delivered ahead of both.
- **Dead-channel hold (spec §5 "guard against a dead channel")**: not explicitly coded. If the studio tab closes mid-session, the cymatics tab will simply hold whatever M/N/J/S last arrived because the receiver only writes on message receipt — no timer to detect silence. This satisfies the "leaves the field on its last state, not blanked" acceptance bullet, but no explicit watchdog was added.
