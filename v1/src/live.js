// v1/src/live.js
// Audio-reactive driver bridge. Listens on a BroadcastChannel for the
// studio's {type:'cymatics', M,N,J,S,beat,reseed,rms,bass,mid,treble,centroid}
// frame messages and routes them into the existing field state. One-way only.
//
// Membrane-cheat caveat (CYMATICS_BUILD.md §0): the stream's M,N,J,S are
// derived from spectral features against the v1 membrane approximation, not
// real plate eigenfrequencies. v2's mode-bank will reinterpret (M,N) as
// bank indices — see // v2: marker below.

export function setupLive(state, audio, opts = {}) {
  const CHAN = opts.channel
    ?? new URL(location.href).searchParams.get('chan')
    ?? 'cymatics';
  const OVERRIDE_MS = opts.overrideMs ?? 1800;

  const ch = new BroadcastChannel(CHAN);
  // Outbound-only control channel for discrete commands (preset selection).
  // Distinct channel name so the 60Hz audio-feature stream and the rare
  // control messages don't collide on a single dispatcher. STUDIO_INTEGRATION.md
  // §0 ("one-way only") relaxed for this discrete command lane only.
  const controlCh = new BroadcastChannel(CHAN + '-control');
  let active = false;
  let lastM = null, lastN = null;
  let lastBroadcastAt = 0;            // when we last saw any 'cymatics' msg
  let lastTrackLabel = '';            // optional preset-label string from studio
  const listeners = new Set();
  const trackListeners = new Set();

  ch.onmessage = (e) => {
    const d = e.data;
    if (!d || d.type !== 'cymatics') return;

    // Always update the broadcast-fresh timestamp so the ⌁ button can light
    // up as a discoverability hint while LIVE is off. The actual field
    // mutation below is gated on `active`.
    lastBroadcastAt = performance.now();

    // Optional `track` field carries the current preset's human label. It
    // fires listeners regardless of LIVE state — the now-playing display
    // is useful even before the user opts into LIVE mode.
    if (typeof d.track === 'string' && d.track !== lastTrackLabel) {
      lastTrackLabel = d.track;
      for (const fn of trackListeners) fn(d.track);
    }

    if (!active) return;

    let { M, N, J, S } = d;
    if (M === N) N = N < 12 ? N + 1 : N - 1;   // defensive — never equal

    const now = performance.now();
    const recentManual = now < (state.liveOverrideUntil ?? 0);

    // v2: when the FEM mode bank exists, look (M,N) up as bank indices here.
    if (!recentManual && (M !== lastM || N !== lastN)) {
      state.sliders.m.setValue(M, { silent: true });
      state.sliders.n.setValue(N, { silent: true });
      state.applyMode(M, N);
      // Reseed on every M/N change — same rationale as main.js#triggerSwap
      // (dev.md 2026-05-22 "Reseed-on-swap"). Without this, particles cling
      // to the previous field's nodal lines and the visible transition is
      // muted to drift. The studio's d.reseed flag only fires every 4 beats,
      // which is too sparse to make per-beat M/N changes legible. The new
      // (M, N) field arrives ~10ms after applyMode posts to the worker;
      // scattering the cloud *now* means the new field pulls a uniform
      // sprinkle into shape rather than nudging an already-settled cluster.
      state.reseedRequested = true;
      lastM = M; lastN = N;
    }

    // Temperature driven by bass band, not the studio's J envelope. J was
    // a smoothed proxy that decayed via lerp; d.bass is the raw band energy
    // and pulses harder per kick — gives the cloud audible jitter instead
    // of the prior ~tiny J*0.0035 contribution. Multiplier 4 maps typical
    // bass (0.05–0.4) into a wide visible band, clamped at 1.
    if (typeof d.bass === 'number') {
      const T = Math.min(1, d.bass * 4);
      state.temperature = T;
      state.sliders.temp.setValue(T, { silent: true });
    }
    if (typeof S === 'number') {
      state.speed = S;
      state.sliders.speed.setValue(S, { silent: true });
    }

    // Reseed on every detected kick, not only on the studio's d.reseed flag
    // (which fires every 4th beat — too sparse to make the visual feel
    // locked to the audio). Pairs with bass-driven temperature so each
    // kick produces both a scatter and a jitter spike.
    if (d.reseed || d.beat) state.reseedRequested = true;
  };

  function setActive(on) {
    if (on === active) return;
    active = on;
    state.live = on;
    for (const fn of listeners) fn(on);
  }
  function onChange(fn) { listeners.add(fn); return () => listeners.delete(fn); }
  function onTrack(fn)  { trackListeners.add(fn); return () => trackListeners.delete(fn); }

  function isBroadcastFresh(windowMs = 500) {
    return (performance.now() - lastBroadcastAt) < windowMs;
  }

  function sendControl(msg) { controlCh.postMessage(msg); }

  return {
    setActive, onChange, onTrack, sendControl,
    get active() { return active; },
    get track() { return lastTrackLabel; },
    channel: CHAN,
    isBroadcastFresh,
  };
}

// Preset list mirrored from v1/studio.html PRESETS. Kept here so the
// cymatics tab can populate its dropdown without needing the studio open.
// If you add/remove a preset in studio.html, mirror it here.
export const PRESET_OPTIONS = [
  { key: 'gm-trance',    label: 'G-minor trance · 138'      },
  { key: 'am-trance',    label: 'A-minor halftime · 110'    },
  { key: 'ambient-72',   label: 'Ambient · 72'              },
  { key: 'dnb-170',      label: 'DnB · 170'                 },
  { key: 'chaconne',     label: 'Chaconne (solemn) · 124'   },
  { key: 'greensleeves', label: 'Greensleeves (folk) · 100' },
];
