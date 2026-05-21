// Web Worker. Owns the field and gradient buffers; transfers them to main on
// every (m, n) change. Per spec: transfer, do not structured-clone copy.

import { computeField } from "./field.js?v=bde1b86f";

self.onmessage = (e) => {
  const { type, m, n } = e.data;
  if (type !== "compute") return;

  const { f, gx, gy, grid } = computeField(m, n);

  // Transfer the underlying ArrayBuffers — they will be detached on this side.
  self.postMessage(
    { type: "field", m, n, grid, f, gx, gy },
    [f.buffer, gx.buffer, gy.buffer]
  );
};
