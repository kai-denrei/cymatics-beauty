// ─────────────────────────────────────────────────────────────────────────────
// FIELD — the v1 cheat.
//
// This file computes the field on which v1 particles settle:
//
//     f(x, y) = cos(nπx/L)·cos(mπy/L) − cos(mπx/L)·cos(nπy/L)
//
// That formula solves the 2D Helmholtz / membrane equation on a square with
// Dirichlet edges — i.e. a *drumhead*, not a plate. Real Chladni plates are
// governed by the biharmonic Kirchhoff–Love operator (4th order, free edges),
// which is the substance of v2.
//
// v1 looks right and is physically wrong. The on-screen MODE badge says so,
// and so does this comment. Do not "improve" v2 by reaching back here.
// ─────────────────────────────────────────────────────────────────────────────

export const GRID = 256;

export function computeField(m, n, grid = GRID) {
  const f  = new Float32Array(grid * grid);
  const gx = new Float32Array(grid * grid);
  const gy = new Float32Array(grid * grid);

  const PI = Math.PI;

  for (let j = 0; j < grid; j++) {
    const v = j / (grid - 1);
    const cmYv = Math.cos(m * PI * v);
    const cnYv = Math.cos(n * PI * v);
    for (let i = 0; i < grid; i++) {
      const u = i / (grid - 1);
      const cnXu = Math.cos(n * PI * u);
      const cmXu = Math.cos(m * PI * u);
      f[j * grid + i] = cnXu * cmYv - cmXu * cnYv;
    }
  }

  // Central differences of |f|. Down-gradient of |f| points to nearest node.
  for (let j = 0; j < grid; j++) {
    for (let i = 0; i < grid; i++) {
      const ip = Math.min(i + 1, grid - 1);
      const im = Math.max(i - 1, 0);
      const jp = Math.min(j + 1, grid - 1);
      const jm = Math.max(j - 1, 0);
      const aL = Math.abs(f[j * grid + im]);
      const aR = Math.abs(f[j * grid + ip]);
      const aD = Math.abs(f[jm * grid + i]);
      const aU = Math.abs(f[jp * grid + i]);
      gx[j * grid + i] = (aR - aL) * 0.5 * (grid - 1);
      gy[j * grid + i] = (aU - aD) * 0.5 * (grid - 1);
    }
  }

  return { f, gx, gy, grid };
}
