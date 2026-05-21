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
| 2026-05-21 | Studio deploys at `v1/studio.html`, **not** at the spec's `v3/studio.html` | Existing GH Pages workflow (`.github/workflows/pages.yml`) only uploads `v1/`. Moving the studio to `v3/` would force either a workflow change (touches a locked file per the integration brief) or a same-origin breakage between the studio tab and the field tab — `BroadcastChannel` requires same-origin, and Pages serves `v1/` at the site root. Decision: keep them co-deployed under `v1/` for now; restructuring deferred until the v3/ Path-A upload pipeline lands. | [[arch]], [[dev]] |
| 2026-05-22 | Added `v1/scripts/fingerprint-js-imports.py` to fingerprint ES-module imports inside `.js` files. Wired into `v1/scripts/bust.sh` as step 1b after the HTML pass. | The upstream `cache-busting` skill's `fingerprint-urls.py` only walks `.html`/`.htm`/`.css`. Module imports (`import…from "./X.js"`, `import("./X.js")`, `new URL("./X.js", import.meta.url)`) carried no `?v=` and were pinned by the browser's module map. Three "fix the buttons" rounds shipped to Pages with the user's browser still executing the cached old code. New script handles all three import forms; idempotent across re-busts (regex extended to consume an existing query suffix). | [[dev]], [[arch]] |
| 2026-05-22 | `bust.sh` cwd quirk: JS-imports pass only fingerprints when invoked from inside the target dir, because the script resolves the JS helper via `dirname "${BASH_SOURCE[0]}"` AFTER `cd "$TARGET"`. Worked around by always running `cd v1 && bash scripts/bust.sh`; not patched. | Cosmetic latent bug; documented in this row and the previous session-log entry. Fix would be to capture `BASH_SOURCE[0]` before the `cd`. Deferred. |

## Dead Ends
| Date | What was tried | Why it failed / was rejected |
|---|---|---|
| 2026-05-22 | Trusting the HTML cache-bust runner to also handle JS imports | It didn't — only `.html`/`.htm`/`.css`. Required a parallel JS-import pass. See decision row above. |
| 2026-05-22 | First regex for the JS-imports fingerprinter: `\.{1,2}/[^"\']+?\.js` (no optional query suffix) | Worked the first time (naked `./X.js`); silent no-op on every subsequent bust (URL was `./X.js?v=OLD`, regex couldn't match). Fix: optional `(?:\?[^"\']*)?` on the URL group. Test the SECOND run, not just the first. |

## Lessons
- **A cache-bust pipeline must be idempotent across multiple runs.** Regex `^./X.js` works on the first run; `^./X.js?v=OLD` is invisible to the same regex. Always test the second run. — from 2026-05-22
- **Cache invalidation must propagate through the entire module graph, not just HTML.** Verify by curl-fetching the served import and confirming the token is in the URL, not just in the HTML. — from 2026-05-22

## Open Questions
- [ ] If the cache-busting on-save watcher requires Node, is it acceptable as a *dev* dependency (yes) vs runtime (no)? — owner: gerald — since: 2026-05-21

## Assumptions
- [`python3 -m http.server` on macOS 15+ serves ES modules with correct `application/javascript` MIME by default] — status: untested — since: 2026-05-21

## Dependencies
Blocked by:
Feeds into: [[dev]]

## Session Log
2026-05-22 — JS-imports fingerprinter added + regex fix for second-run idempotency. 13 cache-bust bumps across this session a9090546 → 7ecf85a4. Deploys all succeeded.
2026-05-21 — Cache-bust bumper exercised cleanly during gate 1 audit: token fcbdc7df → f5dcb003, favicon cell 60 → 53, 4 URLs rewritten in 1 file via `bash v1/scripts/bust.sh --target v1 --quiet`. All same-origin assets serve 200 from python3 -m http.server on :8765.
2026-05-21 — Local dev story and cache-busting installation order recorded at scaffold time.
2026-05-21 — Studio integration: `v1/studio.html` added; cache-bust to `facc7321` (6 HTML URLs + 7 JS imports across 3 files); served pages /, /studio.html, /src/live.js, /src/main.js all return 200 on :8765. Note: `bust.sh` only fingerprints JS imports when invoked with cwd inside the target dir (uses relative `dirname "${BASH_SOURCE[0]}"` after `cd "$TARGET"`); call as `cd v1 && bash scripts/bust.sh` not `bash v1/scripts/bust.sh --target v1`. Latent bug; not fixed this session.
