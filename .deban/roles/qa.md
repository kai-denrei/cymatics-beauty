---
role: qa
owner: gerald
status: active
last-updated: 2026-05-21
---

# QA / Validation

## ⚠ Resume diagnostic — 2026-05-22

Two failures the user reported at the close of the long iteration session. Run this BEFORE writing any code on resume.

### Step 1 — does the studio engine vary its output per preset?

Open `studio.html` standalone (no `?headless`) in a single tab. The right pane shows live M, N, J, S readouts.
- Pick `gm-trance`. Hit ▶. Observe M and N over ~10 beats.
- Pick `chaconne`. Observe M and N over ~10 beats.
- Pick `greensleeves`. Observe M and N over ~10 beats.

Expected: M and N change on each beat, and the *range* of values differs between presets (chaconne should sit lower-M / higher-N than greensleeves because it has no hats and a steady kick).

**If M and N are the same across presets** → the studio engine itself is broken. Possible causes: `mapToField` reading from `feature` values that are themselves static (analyser not connected to master, or master gain is 0). Inspect `analyser.getByteFrequencyData(freqBuf)` output directly with a `console.log` in `analyze()`.

### Step 2 — does the bridge propagate to the cymatics tab?

Open cymatics in a SECOND tab (use the studio's `↗ field` link or open the URL fresh). On the cymatics page, open dev console and run:

```js
const tap = new BroadcastChannel('cymatics');
tap.onmessage = e => console.log('msg:', e.data.M, e.data.N, e.data.J);
```

In the studio tab, hit ▶ and pick a preset.

Expected: console in the cymatics tab logs `msg: <int> <int> <float>` updating ~60×/s with the same M/N as the studio's right-pane readout.

**If no messages** → check the channel name. Studio's `chan` constant reads `?chan=NAME` query; default `'cymatics'`. Cymatics' `live.js` same. Mismatch only if one URL has `?chan=` and the other doesn't.

### Step 3 — does the receiver apply the messages?

If Step 2 logs messages but the cymatics field still doesn't move, the bug is in `v1/src/live.js#onmessage`. Click `⌁` on the cymatics tab and pick a preset to enable LIVE. Then watch the M and N braille bars.

Expected: braille bars on the M and N sliders flicker per beat (the apply path calls `sliders.m.setValue(M, {silent:true})`).

**If braille bars don't change** but `state.live === true`, the issue is between message receipt and slider update. Likely: `state.sliders` not wired (initialization race), or the `recentManual` guard is permanently true (someone wrote `state.liveOverrideUntil` to a future value and never cleared it).

### Step 4 — does the embedded iframe (on cymatics) actually broadcast?

The cymatics page has `<iframe id="studio-engine" src="studio.html?headless=1">`. When the user picks ⌁ → preset, the iframe is supposed to receive `{type:'preset', key}` on `cymatics-control` and start playing.

In the cymatics dev console:
```js
const tapC = new BroadcastChannel('cymatics-control');
tapC.onmessage = e => console.log('ctrl:', e.data);
const tap = new BroadcastChannel('cymatics');
tap.onmessage = e => console.log('audio:', e.data.M, e.data.N);
```

Click ⌁ → pick a preset.

Expected sequence: one `ctrl: {type:'preset', key:'...'}` immediately, then a stream of `audio:` messages within ~200ms.

**If the ctrl logs but no audio follows** → the iframe received the message but its AudioContext didn't unlock (autoplay policy) or its `loadPreset(key)` failed. Inspect the iframe via DevTools → Sources → cymatics-beauty/v1/studio.html and console-log from inside.

### Step 5 — links audit

The user said "links are broken." Possible interpretations:
- `↗` button URL doesn't include `?chan=` when present in parent URL. Verify in DevTools → Elements.
- Studio's `↗ field` href doesn't carry `?chan=` back. Same check.
- Embedded iframe's URL is wrong (missing chan, or `?headless=1` got stripped). Inspect `<iframe id="studio-engine">.src`.

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
2026-05-22 — Two failures unresolved at end of session: (1) main↔studio LINKS broken, (2) cymatics visuals don't reflect tune. Resume diagnostic procedure added above; will NOT iterate further on existing code paths before completing it. User flagged "turning in circle" — the diagnostic gate is the only acceptable next step.
2026-05-21 — Gate 1 audit run by PM subagent: spec items 1/3/4/5 PASS on static read; item 2 (60fps@100k) marked owner-verifies-visually with FPS readout wired in `index.html:63-65`. No functional defects beyond a misleading comment (fixed by dev).
2026-05-21 — Gate 1 framed as 5 explicit, observable checks; FPS goes on screen not in comments.
