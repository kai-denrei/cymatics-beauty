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
  let active = false;
  let lastM = null, lastN = null;
  const listeners = new Set();

  ch.onmessage = (e) => {
    if (!active) return;
    const d = e.data;
    if (!d || d.type !== 'cymatics') return;

    let { M, N, J, S } = d;
    if (M === N) N = N < 12 ? N + 1 : N - 1;   // defensive — never equal

    const now = performance.now();
    const recentManual = now < (state.liveOverrideUntil ?? 0);

    // v2: when the FEM mode bank exists, look (M,N) up as bank indices here.
    if (!recentManual && (M !== lastM || N !== lastN)) {
      state.sliders.m.setValue(M, { silent: true });
      state.sliders.n.setValue(N, { silent: true });
      state.applyMode(M, N);
      lastM = M; lastN = N;
    }

    // J / S always apply, even during a manual M/N override window.
    if (typeof J === 'number') {
      state.temperature = J;
      state.sliders.temp.setValue(J, { silent: true });
    }
    if (typeof S === 'number') {
      state.speed = S;
      state.sliders.speed.setValue(S, { silent: true });
    }

    if (d.reseed) state.reseedRequested = true;
  };

  function setActive(on) {
    if (on === active) return;
    active = on;
    state.live = on;
    for (const fn of listeners) fn(on);
  }
  function onChange(fn) { listeners.add(fn); return () => listeners.delete(fn); }

  return { setActive, onChange, get active() { return active; }, channel: CHAN };
}
