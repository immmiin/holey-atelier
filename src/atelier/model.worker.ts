// Builds sock knit models off the main thread.
import { computeModel, modelBuffers } from './model';

interface Req {
  id: number;
  px: Uint8ClampedArray;
  w: number;
  h: number;
  hole: { x: number; y: number };
  rowH: number;
}

self.onmessage = (e: MessageEvent<Req>) => {
  const { id, px, w, h, hole, rowH } = e.data;
  const model = computeModel(px, w, h, hole, rowH);
  (self as unknown as Worker).postMessage({ id, model }, modelBuffers(model));
};
