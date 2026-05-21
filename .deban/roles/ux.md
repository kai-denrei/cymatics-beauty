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
| 2026-05-22 | Compact dashboard restructure: title row (cymatics + Hz), audio scope full-width below, 2-col slider grid (M+N, J+S, P wide), centered icon row, footer with title + about; **mn-warn row deleted** and replaced with silent M≠N skip in `commitMode`. Per-slider shape: `[label+<] [bar] [>]` with the label letter (M/N/J/S/P) stacked above a `<` inside one button. | Match the user's screenshot mock. The warning row was breaking the single-page-fit on iPhone and adding visual noise; silent skip-or-stay is invisible UX. | [[dev]] |
| 2026-05-22 | Text-style glyphs (no color emoji on iOS): pause/play `⏸︎` / `⏵︎` with `U+FE0E` variation selector; audio toggle = single `♪` whose state is conveyed by `aria-pressed` colour (no glyph swap) | User reported iOS rendered the pause/play as color emoji. VS-15 forces text presentation. `♪` is already monochrome on every platform. | [[dev]] |
| 2026-05-22 | Particle color changed white→teal `rgb(95,179,163)` + multiplicative fade (~0.78/frame) for trails | Match the studio preview canvas so the main view looks like a magnified version. The whole UI now reads as one teal palette family (Hz + scope + P slider + field). | [[dev]] |
| 2026-05-22 | Now-playing label: small mono uppercase teal text, 9px, between iconbar and scope; dims when broadcast goes stale (>500ms) | User asked for a "very small (minimal pixel) font showing which tune is being played." Lives between the buttons and the scope per the spec. Updates regardless of LIVE state (observational only — payload not applied while LIVE off). | [[dev]] |
| 2026-05-22 | Tooltips via `title=` on all six iconbar buttons (⏸︎ ∞ ↻ ↺ ⌁ ↗) | User asked for hover descriptors. `title=` is the simplest accessible mechanism; ARIA labels remain primary for touch/screen-reader users. | [[dev]] |
| 2026-05-22 | ⌁ replaced with a click-to-open dropdown of presets (was a toggle). Dropdown items: `off`, plus the six presets. Closes on outside click / Esc / selection. | User asked "use this button to conjure a drop down menu allowing to pick any of the presets, which then becomes the main tune." Implemented via a `.live-menu` popover anchored under the button with `aria-haspopup` / `aria-expanded` for keyboard users. | [[dev]], [[arch]] |
| 2026-05-22 | ⌁ studio-detected hint: pulses teal when broadcasts are arriving on the `cymatics` channel but LIVE is still off. Suppressed when LIVE is on (button shows aria-pressed amber instead). | Discoverability — without this, a user with studio playing in another tab has no on-screen cue that picking ⌁ would do anything. | [[dev]] |

## Dead Ends
| Date | What was tried | Why it failed / was rejected |
|---|---|---|
| 2026-05-22 | Initial preset labels were just the key name ("G-minor trance"); presets were musically too similar | User reported "G Minor and A Minor are the same. Chaconne and Greensleeves are the same." Re-tuned presets along (BPM, hat density, kick density, voicing) axes; labels now include BPM for advertisement. |
| 2026-05-22 | Tried color-emoji `🔇` / `🔊` for the audio toggle on iOS | iOS renders color emoji; clashes with the editorial mono palette. Replaced with monochrome `♪` whose state is in `aria-pressed` colour. |

## Lessons
- **iOS picks color emoji for some U+23F8 / U+23F5 glyphs by default.** Append `U+FE0E` (variation selector-15) to force text presentation when you need monochrome icons. — from 2026-05-22
- **A button-state UI can convey on/off via `aria-pressed` color alone — no glyph swap needed.** Simpler than maintaining two glyph constants. — from 2026-05-22
- **A "now playing" label is observational chrome, not control surface.** It can update from a channel that the rest of the UI ignores — spec §5's "ignore the channel entirely" still holds because we only read the label, not the payload. — from 2026-05-22

## Open Questions
- [ ] Does the 3-shape favicon collide with the editorial dark aesthetic, or does its function (state indicator) override aesthetics? — owner: gerald — since: 2026-05-21

## Assumptions
- [A user looking at the page in 2 minutes can distinguish "fresh load" from "stale cached" via the 3-shape widget without explanation] — status: untested — since: 2026-05-21

## Dependencies
Blocked by: [[dev]] (controls panel must exist before UX polish)
Feeds into:

## Session Log
2026-05-22 — Compact dashboard + landing defaults + tooltips + ⌁ dropdown + now-playing label + teal+trails. Six presets re-differentiated. Two UX-side issues open on resume: the cross-tab links don't behave as the user expected (specifics unknown), and the cymatics field doesn't react to preset choice on either page.
2026-05-21 — Aesthetic palette and physics-honesty label policy committed; cache-bust widget framed as a UX feature, not a build tool.
