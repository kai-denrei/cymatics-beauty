# cymatics

An interactive cymatics tool, built honestly in three stages.

| Stage | What it is | Status |
|---|---|---|
| **v1** | A vanilla HTML5 + Canvas2D toy. Square-membrane superposition. Fast and pretty, *and labelled in code as the physics cheat.* | In progress |
| **v2** | The real one — a `scikit-fem` biharmonic eigensolve on a Kirchhoff–Love plate with free-edge BC. Emits a mode bank that v1 can load. | Planned |
| **v3** | Audio-reactive — uploaded tracks first, optional local YouTube ingest behind a CLI flag. | In progress (generative studio path live — see [`v1/studio.html`](./v1/studio.html)) |

The full build spec lives in [`CYMATICS_BUILD.md`](./CYMATICS_BUILD.md).
The "one distinction that governs everything" — plate vs membrane vs Faraday
vs inverse-Chladni — is in §0 of that file and is **not** flattened in code.

## Running v1

No build step, no npm, no bundler. Just a static server.

```bash
cd v1
python3 -m http.server 8000
# then open http://localhost:8000
```

You can also open `v1/index.html` directly in a browser, but the Web Worker
will refuse to load from `file://` in most browsers, so the http server is
the supported path.

## What v1 shows

A square plate. Pick `(m, n)` integers (with `m ≠ n` enforced). Particles
flow down the gradient of `|f(x, y)|` where:

```
f(x, y) = cos(nπx/L)·cos(mπy/L) − cos(mπx/L)·cos(nπy/L)
```

Particles settle on the zero set `f = 0`. The on-screen badge reads
**`MODE: membrane approx (m, n)`** — that label is part of the UI chrome,
not a toggle, because v1 is *not* the real plate physics. v2 fixes that.

## Cache busting

Every reload should give you the freshest module. The 3-shape favicon and
the corner widget reflect the build token live — if the shapes don't change
across a forced-refresh / dev-edit, the browser served you a stale module.

See `tools/cache-busting/` (installed by the `cache-busting` skill) for the
mechanism.

## Repo layout

See spec §3 in [`CYMATICS_BUILD.md`](./CYMATICS_BUILD.md).
