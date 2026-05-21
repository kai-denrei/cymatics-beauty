---
role: dev
owner: gerald
status: active
last-updated: 2026-05-21 (v2 studio swap)
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
| 2026-05-21 | Wholesale-replaced `v1/studio.html` with the v2 arrangement-timeline base (`cymatics-studio2.html`) + 3 surgical additions: preset selector, `↗ field` back-link with `?chan=` forwarding, membrane-cheat comment on `mapToField` | Diff between v1 studio and v2 was large enough (palette/arrangement split, per-track buses, riser, master filter, bar/section readout, arrange toggle) that a surgical merge would have been harder to audit than a clean swap. BroadcastChannel payload is byte-identical — cymatics receiver untouched. | [[arch]], [[ux]] |
| 2026-05-21 | Default preset on cold load is `gm-trance` (G minor); ships 4 presets: `gm-trance`, `am-trance`, `ambient-72`, `dnb-170` | gm-trance has the most-tested arrangement (intro→build→peak→breakdown→riser→drop@64) and matches `TranceMusicExample.md`. Each preset bundles `{label, bpm, palette, arrangement}` so swapping the selector swaps both textareas + bpm and restarts the arrangement. | [[ux]] |
| 2026-05-22 | Continuous-mode dwell capped at 6 s via `MAX_DWELL_MS` in `main.js:24` | High-S / high-J configs caused particles to orbit nodes forever; `settleEMA` never crossed `SETTLE_THRESHOLD = 0.006`; user reported "stuck on one mode after ~20 cycles." Cap is a ceiling on top of the settle trigger — normal settle-driven swaps still happen at their natural pace; only stuck modes get punted. | [[qa]] |
| 2026-05-22 | Reseed-on-swap: `triggerSwap` calls `particles.reseed()` *before* applying the new (M, N) so the cloud sprinkles uniformly and the new field then pulls it into shape | User asked for "amplified next effect" — without the reseed, particles drift between modes and the change is muted. | [[ux]] |
| 2026-05-22 | Main field render: particle color teal `0xFFA3B35F` + multiplicative fade `FADE_NUM=200` (~0.78/frame) for trails | Matches the studio preview canvas; the standalone field already looks like the studio's mini-version. `pixels.fill(BG)` replaced with `fadeFrame()` that decays RGB channels in-place. Alpha pre-initialised to 255 once. | [[ux]] |
| 2026-05-22 | M ≠ N enforced silently via `commitMode` skip-or-stay in `ui.js:74` | Removed the layout-breaking warning row; if a manual `<`/`>` lands on the other axis's value, slider steps one more in the same direction (or reverts if out of range). triggerSwap unaffected (randomMode already guarantees ≠). | [[ux]] |
| 2026-05-22 | Landing defaults: M=9, N=4, J=0.75, S=1.6, P=154 000, ∞ continuous ON, play | User-chosen anchor — strong, dense pattern on first paint. `defaultCount` from main.js's media-query branch is ignored on purpose; 154k is the choice regardless of device. | [[ux]] |
| 2026-05-22 | ⌁ button conjures a dropdown menu of presets (was a toggle); ⌁ now opens / closes the popover | Per user request. The "off" item disables LIVE; preset items send `{type:'preset', key}` on `cymatics-control` and engage LIVE. | [[ux]], [[arch]] |
| 2026-05-22 | Cymatics page now embeds a hidden same-origin iframe `studio.html?headless=1` as the audio source | User explicitly didn't want the dropdown to open a new tab. Iframe loads the studio engine; user activation propagates same-origin so the AudioContext unblocks on the dropdown click. The `↗` button still opens studio.html in a separate tab for the editor view. | [[arch]], [[devops]] |
| 2026-05-22 | Presets re-differentiated along (BPM, hat density, kick density, chord voicing) axes | User reported gm/am sounded the same and chaconne/greensleeves sounded the same. Root cause: same drum vocab + same instrumentation → same spectral features → same (M,N). Six presets now on distinct coordinates: gm 138 ·16th-hat, am 110 ·sparse-hat halftime, ambient 72 ·no-hat, dnb 170 ·busy, chaconne 124 ·NO HATS ·snare2/4 ·4-note dense chord, greensleeves 100 ·8th-hat ·sparse kick ·3-note triads. | [[ux]] |

## Dead Ends
<!-- APPEND ONLY. Never delete. -->
| Date | What was tried | Why it failed / was rejected |
|---|---|---|
| 2026-05-22 | `BrailleSlider` class with both `this.step = step` (instance prop holding the step size) AND a `step(dir)` method (advance value by dir) | JavaScript class instance own-property *shadows* the prototype method of the same name. After `this.step = 1` runs in the constructor, `this.step` resolves to the **number**, not the function. Every `<` / `>` tap called `1(-1)` → `TypeError: this.step is not a function`, caught silently inside the event-handler boundary by the browser, logged to a console the iPhone user could not see. Buttons appeared completely dead. Bug shipped with the FIRST commit of BrailleSlider and survived **three rounds** of "fix the buttons" patches that all rewrote the event handler (click, pointerup, touchend) without ever verifying the call target. Repro confirmed in a 6-line node snippet. Fix: rename the instance property to `this.stepSize`. |
| 2026-05-22 | Relying on the `cache-busting` skill's `fingerprint-urls.py` to propagate token changes through the project | The skill walks only `.html` / `.htm` / `.css` (script line: `if ext not in (".html", ".htm", ".css"): continue`). ES module imports inside `.js` files (`import…from "./X.js"`, `import("./X.js")`, `new URL("./worker.js", import.meta.url)`) never received `?v=` and were **pinned forever** by the browser's module map. Every bump rebuilt the HTML+entry-point URL but the user kept executing modules cached from their first visit. Three rounds of "fix the buttons" shipped to GH Pages without ever reaching the user's browser. Diagnosed by curl-comparing the served file against the local file and finding the served version had the fix but the import URLs were naked. Fix: new `v1/scripts/fingerprint-js-imports.py` invoked from `bust.sh`, three regexes covering all three import forms. |
| 2026-05-22 | First iteration of `fingerprint-js-imports.py` with regex `\.{1,2}/[^"\']+?\.js` (no optional query-string suffix) | After the FIRST bust, every JS-import URL became `./X.js?v=OLD`. The SECOND bust's regex couldn't match the trailing `?v=OLD` because the regex stopped at `.js`. So the script reported "0 imports across 0 files" and silently shipped a build whose JS modules were still tagged with the previous token. Fix: extend the URL group to optionally consume `(?:\?[^"\']*)?`. Cache-bust now idempotent across multiple bumps. |
| 2026-05-22 | Three event-handler rewrites for `<` / `>` buttons (click → pointerup → touchend+click) trying to fix "buttons don't work" on iOS | The wiring was never the bug. Every rewrite shifted symptoms but the underlying call target (`this.step(dir)`) was broken from line one of the constructor. ~half a session burned. The signal the user kept giving — "neither the braille bar nor the value change" — pointed unambiguously at the call target, not the listener. |
| 2026-05-22 | `window.open(url, "cymatics-studio")` fallback in the ⌁ pickPreset path | User explicitly didn't want any path that opens a second tab. Replaced wholesale with the embedded-iframe architecture. |

## Lessons
<!-- Distilled principles from Dead Ends. Written to be read cold. -->
- **Class instance properties shadow prototype methods of the same name.** Never write `this.step = step` if there is also a `step(dir)` method on the class. The instance lookup wins; the method becomes unreachable; calls throw `TypeError` silently inside event handlers. — from dead end on 2026-05-22
- **When an event-driven feature "doesn't work" after one rewrite of the listener, the listener is not the bug.** Verify the call target is callable. A one-line `console.log(typeof this.method)` would have ended the iteration in 30 seconds. — from dead end on 2026-05-22
- **Cache-busting must propagate through the entire module graph, not just HTML references.** Browsers cache ES module imports per their final URL; without `?v=` on every `from "./X.js"`, every fix to a non-entry-point module is invisible to existing users. Verify by curl-fetching the served import and confirming the token is present in the URL, not just in the HTML. — from dead end on 2026-05-22
- **A code change is shipped only when you can observe it running in the actual browser**, not when curl confirms the bytes are on the server. The byte-on-server vs byte-in-browser-module-map gap is invisible to the developer and total to the user. — from dead end on 2026-05-22
- **Audio→visual mappings are spectral, not melodic.** Two tracks in different keys with the same instrumentation and drum vocab will produce visually identical fields, because the feature extractor reads `centroid` / `bass` / `mid` / `treble`, not pitch. To make presets look different on the cymatics field, vary BPM and timbre, not just notes. — from preset-differentiation pass on 2026-05-22
- **A cache-bust rewriter must handle both naked and already-busted URLs.** Regex `^./X.js$` works on the first run; `^./X.js?v=OLD$` is invisible to the same regex. Test the second run, not just the first. — from dead end on 2026-05-22

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
2026-05-22 — Long iteration session: 13 cache-bust bumps a9090546 → 7ecf85a4. Step-property bug found and fixed (THE recurring "buttons don't work"). Cache-bust JS-imports gap closed via new `fingerprint-js-imports.py`. Compact dashboard + landing defaults + teal+trails + reseed-on-swap + now-playing label + ⌁ dropdown + cymatics-control channel + embedded iframe + 2 new presets + preset differentiation. User flagged "turning in circle" at end. Two failures unresolved: links broken, visuals don't reflect tune. Will diagnose-from-scratch on resume.
2026-05-21 — Gate 1 static audit: all 5 JS modules pass `node --check`; one comment fixed in main.js; no functional defects found.
2026-05-21 — Initial decisions on rendering strategy and worker transfer recorded ahead of implementation.
2026-05-21 — Studio integration wired: `v1/studio.html`, `v1/src/live.js`, LIVE/`↗` icons in iconbar, preset selector + 4 presets in studio. All 8 JS modules pass `node --check`; cache-bust rotated to `facc7321` with 7 imports fingerprinted across 3 JS files.
2026-05-21 — Studio v2 swap: `v1/studio.html` replaced wholesale with the arrangement-timeline base from `cymatics-studio2.html`. Re-added preset selector (4 presets, gm-trance default), `↗ field` back-link with `?chan=` forwarding, and membrane-cheat comment. Cymatics-side files (`live.js`, `main.js`, `ui.js`, `index.html`) only touched by the cache-bust rewrite — confirmed via `git diff`. Cache-bust rotated to `a9090546`.
