// Loads the six sock photos and builds their knit models in a worker, one at a time.
import { type ModelData, type SockModel, buildModel, imagePixels, loadImage } from './model';
import { SOCKS } from './socks';
import { tune } from './tuning';

const images = new Map<number, Promise<HTMLImageElement>>();
const models = new Map<string, Promise<SockModel>>();
let worker: Worker | null = null;
let seq = 0;
const pending = new Map<number, (m: ModelData) => void>();

export function sockImage(id: number) {
  let p = images.get(id);
  if (!p) {
    p = loadImage(SOCKS.find((s) => s.id === id)!.src);
    images.set(id, p);
  }
  return p;
}

function getWorker() {
  if (worker) return worker;
  try {
    worker = new Worker(new URL('./model.worker.ts', import.meta.url), { type: 'module' });
    worker.onmessage = (e: MessageEvent<{ id: number; model: ModelData }>) => {
      pending.get(e.data.id)?.(e.data.model);
      pending.delete(e.data.id);
    };
  } catch {
    worker = null;
  }
  return worker;
}

export function sockModel(id: number): Promise<SockModel> {
  const key = `${id}:${tune.rowH}`;
  let p = models.get(key);
  if (p) return p;
  const def = SOCKS.find((s) => s.id === id)!;
  p = sockImage(id).then((img) => {
    const w = getWorker();
    if (!w) return buildModel(img, def.hole, tune.rowH);
    const px = imagePixels(img);
    const rid = ++seq;
    return new Promise<SockModel>((res) => {
      pending.set(rid, (m) => res({ ...m, img }));
      w.postMessage({ id: rid, px, w: img.naturalWidth, h: img.naturalHeight, hole: def.hole, rowH: tune.rowH }, [px.buffer]);
    });
  });
  models.set(key, p);
  return p;
}
