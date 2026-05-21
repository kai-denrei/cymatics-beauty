// Particle integrator. Particles live in [0, 1]² (plate coords). Gradient
// of |f| is sampled via bilinear interpolation on the worker-supplied grid.

export class Particles {
  constructor(capacity) {
    this.capacity = capacity;
    this.count = 0;
    this.pos = new Float32Array(capacity * 2); // packed (x, y, x, y, …)
    this.vel = new Float32Array(capacity * 2);
  }

  resize(n) {
    n = Math.min(n, this.capacity);
    if (n > this.count) {
      for (let i = this.count; i < n; i++) {
        this.pos[i * 2]     = Math.random();
        this.pos[i * 2 + 1] = Math.random();
        this.vel[i * 2]     = 0;
        this.vel[i * 2 + 1] = 0;
      }
    }
    this.count = n;
  }

  reseed() {
    for (let i = 0; i < this.count; i++) {
      this.pos[i * 2]     = Math.random();
      this.pos[i * 2 + 1] = Math.random();
      this.vel[i * 2]     = 0;
      this.vel[i * 2 + 1] = 0;
    }
  }

  // Cheap mean |v| estimate sampled over a stride. Used by main.js to detect
  // when particles have settled (continuous-play trigger).
  meanSpeedSample(stride = 200) {
    const n = this.count;
    if (n === 0) return 0;
    const vel = this.vel;
    let sum = 0;
    let k = 0;
    for (let i = 0; i < n; i += stride) {
      const vx = vel[i * 2];
      const vy = vel[i * 2 + 1];
      sum += Math.sqrt(vx * vx + vy * vy);
      k++;
    }
    return k > 0 ? sum / k : 0;
  }

  step(field, dt, temperature, speed) {
    if (!field) return;
    const { gx, gy, grid } = field;
    const n = this.count;
    const pos = this.pos;
    const vel = this.vel;
    const g1 = grid - 1;

    const sp = speed * 0.6;
    const damp = 0.86;
    const T = temperature * 0.0035;

    for (let i = 0; i < n; i++) {
      const xi = i * 2;
      const yi = xi + 1;
      let px = pos[xi];
      let py = pos[yi];

      const fx = px * g1;
      const fy = py * g1;
      const ix = fx | 0;
      const iy = fy | 0;
      const ux = fx - ix;
      const uy = fy - iy;
      const ix1 = ix + 1 < grid ? ix + 1 : ix;
      const iy1 = iy + 1 < grid ? iy + 1 : iy;

      const i00 = iy  * grid + ix;
      const i10 = iy  * grid + ix1;
      const i01 = iy1 * grid + ix;
      const i11 = iy1 * grid + ix1;

      const gx00 = gx[i00], gx10 = gx[i10], gx01 = gx[i01], gx11 = gx[i11];
      const gy00 = gy[i00], gy10 = gy[i10], gy01 = gy[i01], gy11 = gy[i11];

      const gxA = gx00 * (1 - ux) + gx10 * ux;
      const gxB = gx01 * (1 - ux) + gx11 * ux;
      const gxi = gxA * (1 - uy) + gxB * uy;

      const gyA = gy00 * (1 - ux) + gy10 * ux;
      const gyB = gy01 * (1 - ux) + gy11 * ux;
      const gyi = gyA * (1 - uy) + gyB * uy;

      // Force points DOWN-gradient (toward nodes).
      let vxN = vel[xi] * damp - gxi * sp * dt;
      let vyN = vel[yi] * damp - gyi * sp * dt;

      // Jitter — Box–Muller-light; cheaper uniform [-1,1] is fine here.
      vxN += (Math.random() - 0.5) * T;
      vyN += (Math.random() - 0.5) * T;

      px += vxN * dt;
      py += vyN * dt;

      // Reflect at edges so the plate stays bounded.
      if (px < 0) { px = -px; vxN = -vxN; }
      else if (px > 1) { px = 2 - px; vxN = -vxN; }
      if (py < 0) { py = -py; vyN = -vyN; }
      else if (py > 1) { py = 2 - py; vyN = -vyN; }

      pos[xi] = px;
      pos[yi] = py;
      vel[xi] = vxN;
      vel[yi] = vyN;
    }
  }
}
