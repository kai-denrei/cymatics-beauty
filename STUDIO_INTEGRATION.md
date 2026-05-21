# studio → cymatics integration

> **Task brief for the CLI agent.** Wire `cymatics-studio.html` (a generative
> trance studio) into `cymatics-beauty` as the **v3 audio-reactive driver**.
> Coupling is one-way: **audio → field**, over `BroadcastChannel('cymatics')`.
> The studio is the source of sound and features; the cymatics tab only listens
> and applies `(M, N, J, S)`. Nothing about the plate/membrane physics changes.

This is the *generative* face of the v3 row in `README.md` ("Audio-reactive —
uploaded tracks first"): instead of an uploaded track, the studio synthesises
the audio in-engine and emits the same feature stream a track ingest would.

---

## §0 — scope & non-goals

- **In scope:** a listener in the cymatics tab that maps the broadcast contract
  onto the existing field state; placement + cache-busting of `studio.html`;
  precedence rules against the existing controls; docs.
- **Out of scope:** changing the field equation, the integrator, the worker,
  the membrane/plate distinction, or particle counts. Do **not** import the
  studio's preview physics into v1 — that canvas is a throwaway dev mirror.
- **One-way only.** The cymatics tab never talks back. If you find yourself
  adding a return channel, stop — that's a different feature.

## §1 — invariants you must not break

1. **No build step.** Vanilla HTML5 + ES modules + Canvas2D. No npm, no bundler.
   Both tabs run off a plain static server.
2. **Honesty (`CYMATICS_BUILD.md` §0).** The studio's feature→mode mapping is a
   *cheat keyed to the membrane approx*, exactly like the v1 tone. Label it as
   such in code/comments; do not let the UI imply the audio is computing real
   plate eigenfrequencies. When v2's `scikit-fem` mode bank lands, the contract
   re-targets bank indices (see §7).
3. **`M ≠ N`.** The field vanishes when equal. The studio already enforces this,
   but the receiver must **not** assume it — clamp/bump on arrival too.
4. **Ranges are the boundary spec** (match the v1 glossary):
   `M,N ∈ 1..12 int` · `J ∈ 0..1` · `S ∈ 0.1..3`. If v1 stores jitter/settle on
   a different internal scale, **rescale at the listener**, not by mutating the
   contract.
5. **Same-origin.** `BroadcastChannel` is same-origin; `file://` gives a null
   origin and won't bridge tabs. Test over `python3 -m http.server`. The v1
   worker already refuses `file://`, so this is the supported path regardless.
6. **Cache-busting.** Route `studio.html` through the repo's build-token
   mechanism (the `cache-busting` skill / `tools/cache-busting/`) so forced
   refreshes serve fresh modules, consistent with the rest of the repo.

## §2 — the contract (verbatim)

The studio posts this object every animation frame (~60 Hz) on
`BroadcastChannel('cymatics')`:

```js
{
  type: 'cymatics',          // discriminator — ignore anything else
  t: 1234.5,                 // performance.now() at emit
  M: 7,  N: 3,               // mode indices, int 1..12, M !== N
  J: 0.42,                   // jitter, 0..1
  S: 1.18,                   // settle speed, 0.1..3
  beat: true,                // kick onset this frame
  reseed: false,             // true once per bar (every 4th beat)
  rms: 0.31,                 // loudness 0..1
  bass: 0.55, mid: 0.20, treble: 0.08,  // band energy 0..1
  centroid: 0.34             // spectral brightness 0..1
}
```

Receiver skeleton (replace the assignments with your real setters):

```js
const ch = new BroadcastChannel('cymatics');
ch.onmessage = (e) => {
  const d = e.data;
  if (d.type !== 'cymatics') return;
  let { M, N, J, S } = d;
  if (M === N) N = N < 12 ? N + 1 : N - 1;     // defensive: never equal
  applyMode(M, N);                              // your real setter / worker post
  applyJitter(J);                               // rescale here if v1 differs
  applySettle(S);
  if (d.reseed) reseed();                        // your existing ↺ action
  // raw d.rms/d.bass/d.mid/d.treble/d.centroid/d.beat available if wanted
};
```

If the integrator runs in the **Web Worker**, do not mutate main-thread state —
forward `{M,N,J,S,reseed}` to the worker via `postMessage` using its existing
message protocol.

## §3 — what arrives & how it's derived (so you can retune the receiver)

| field | derivation in the studio | intent |
|---|---|---|
| `M` | `round(2 + centroid·9.5)`, snapped **on kick onset** | brightness → spatial freq |
| `N` | `round(2 + clamp(bass·1.4)·9.5)`, snapped on onset, bumped if `==M` | low-end weight → spatial freq |
| `J` | `0.85` on kick, else lerps toward `0.14` floor | scatter-then-resettle *on the beat* |
| `S` | `0.3 + rms·4.2` clamped `0.1..3` | louder → tighter settle (drops snap) |
| `reseed` | `beat && beatCount % 4 === 0` | per-bar visual "splash" |

Mode indices are **snapped on onsets, held between** — deliberately, so the
field locks to rhythm instead of flickering per frame. If the field feels too
static or too jumpy, that ratio is the knob — adjust in the studio's
`mapToField`, not the receiver.

## §4 — tasks (ordered)

1. **Read first, report back.** Inspect `v1/` (and `v3/` if present) and
   identify, by real name:
   - the field-state holders for `M`, `N`, jitter, settle;
   - the reseed action behind the `↺` button;
   - whether the integrator is **main thread or worker**, and the worker's
     message schema;
   - the auto-cycle / continuous logic (`↻`, `∞`) and the manual `<` / `>`
     override clock;
   - the internal synth-tone toggle (`♪`).
   Output a short map of these before editing anything.
2. **Place the studio.** Copy `cymatics-studio.html` → `v3/studio.html`
   (or per `CYMATICS_BUILD.md` §3 layout). Apply cache-busting.
3. **Single source of truth for the channel name.** Define the channel string
   once per file as a constant (`const CHAN = 'cymatics'`). Honor a
   `?chan=NAME` query override in **both** files for collision-free parallel
   testing.
4. **Add the listener** to the cymatics tab per §2, wired to the real hooks /
   worker from task 1. Rescale `J`/`S` if internal ranges differ (§1.4).
5. **Precedence** — implement §5.
6. **Cross-link (optional, low cost).** A small "open studio ↗" affordance on
   the cymatics page and "open field ↗" on the studio, both same-origin links.
7. **Verify** against §6.
8. **Document** per §8.

## §5 — precedence against existing controls

Introduce an explicit input source. Recommended default: a `live` mode
(off by default; off = today's behaviour exactly).

- **`live` ON:** audio owns `M, N, J, S`. **Suppress `↻` and `∞`** auto-swaps —
  the beat-snap + per-bar `reseed` from the stream replaces them. `↺` still
  works (and the stream also issues it). `<` / `>` act as a **momentary manual
  override** that pauses audio-driven `M,N` for the existing ~1.8 s override
  window, then yields back — mirror the override clock already in v1, don't
  invent a second one.
- **`live` OFF:** ignore the channel entirely; v1 behaves as it does now.
- **Internal `♪` tone:** when `live` is ON the sound comes from the studio tab,
  so default the internal tone to **muted** to avoid a doubled, detuned drone.
  Leave it user-toggleable. (Flagged in §7 — confirm desired behaviour.)

Guard against a dead channel: if no message has arrived for ~500 ms while
`live` is ON, hold the last field rather than freezing or zeroing.

## §6 — acceptance criteria

- Both tabs served from the **same origin**; studio `▶ play` → cymatics field
  visibly tracks within one frame budget, no console errors.
- **Beat coupling visible:** each kick spikes jitter and the cloud scatters,
  then re-settles; a reseed lands roughly once per bar.
- **`M ≠ N` holds** for the entire session (instrument the receiver to assert).
- **`live` OFF** reproduces current v1 behaviour byte-for-byte (no regression in
  manual `M,N`, `↻`, `∞`, `<`/`>`, `↺`).
- Stopping the studio (or closing its tab) leaves the field on its last state,
  not blanked.
- Forced refresh serves fresh modules (cache-bust token changes).

## §7 — decision points (resolve by reading code; ask only if blocked)

1. **Worker vs main thread** for applying the stream — dictates task 4's wiring.
2. **Internal `♪` in `live` mode** — mute by default (recommended) or leave on?
3. **`reseed` cadence** — per-bar is the studio default; if v1's `∞` settle-swap
   already gives enough motion, you may drop the stream's reseed and keep only
   jitter. Pick one; don't run both reseed sources simultaneously.
4. **v2 forward-compat** — once the `scikit-fem` mode bank exists, `(M,N)` stop
   being raw integers and become **bank indices**. Plan the contract so the
   receiver maps `centroid`/`bass` onto bank-index space then; leave a `// v2:`
   marker at the mapping site. Do not build it now.

## §8 — docs to update

- `README.md`: mark the v3 row as *in progress*; note the generative-studio path
  alongside the planned upload/ingest path.
- `CYMATICS_BUILD.md`: add the contract (§2) and the membrane-cheat caveat (§1.2)
  to the v3 section.
- `.deban`: log the integration decision and — per the Dead Ends convention —
  record anything tried and rejected (e.g. continuous per-frame mode updates
  causing flicker → resolved via onset-snap; any worker-protocol dead ends).

---

### appendix — quick run

```sh
cp cymatics-studio.html v3/studio.html   # then cache-bust
cd v3 && python3 -m http.server 8000
# tab A: http://localhost:8000/studio.html   → play
# tab B: http://localhost:8000/index.html    → enable `live`
```

The studio's mapping lives entirely in `mapToField()` and the voice synths in
the `v*()` functions — both are the intended tuning surface. The receiver should
stay thin: validate, rescale, apply.
