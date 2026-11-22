import { createPainter, phases } from './construction-backdrop.js';

let canvas, paint;
let pending, running = false, lastPreload;
const images = new Map();
const empty = new OffscreenCanvas(1, 1);

function load(file) {
  if (!images.has(file)) {
    const src = new URL('./assets/woodland/' + file + '.webp', import.meta.url);
    const image = fetch(src).then(response => {
      if (!response.ok) throw Error('Missing construction layer');
      return response.blob();
    }).then(blob => createImageBitmap(blob, { premultiplyAlpha: 'premultiply' })).catch(error => {
      images.delete(file);
      throw error;
    });
    images.set(file, image);
  }
  return images.get(file);
}

function preload(index, suffix) {
  if (!phases[index]) return;
  load(phases[index].name + suffix).catch(() => {});
  if (index === 2) load('wall-lift').catch(() => {});
  if (index === 4) load('rig').catch(() => {});
}

async function render() {
  running = true;
  try {
    while (pending) {
      const { sample, width, suffix, direction } = pending;
      pending = null;
      const { current, next, fraction } = sample;
      const last = fraction > 0 ? next : current;
      const ahead = direction > 0 ? last + 1 : current - 1;
      const key = current + ':' + ahead + suffix;
      if (key !== lastPreload) {
        lastPreload = key;
        preload(current, suffix);
        preload(ahead, suffix);
      }
      if (sample.time <= .87) continue;
      const photos = await Promise.all([
        load(phases[current].name + suffix), load(phases[last].name + suffix),
        current === 4 || last === 4 ? load('rig') : empty,
        current === 2 || last === 2 ? load('wall-lift') : empty
      ]);
      // A fast swipe can cross several phases while a photo is decoding.
      if (pending) continue;
      if (canvas.width !== width) {
        canvas.width = width;
        canvas.height = Math.round(width * 941 / 1672);
      }
      paint(sample, photos);
      self.postMessage('painted');
    }
  } catch {
    self.postMessage('fallback');
  } finally {
    running = false;
  }
}

self.onmessage = ({ data }) => {
  if (data.canvas) {
    canvas = data.canvas;
    try { paint = createPainter(canvas); } catch { /* Use the main-thread fallback. */ }
    if (!paint) { self.postMessage('fallback'); return; }
    canvas.addEventListener('webglcontextlost', () => self.postMessage('fallback'));
  } else if (paint) {
    pending = data;
    if (!running) {
      running = true;
      // Coalesce scroll messages that arrived while the GPU was busy.
      if (self.requestAnimationFrame) self.requestAnimationFrame(render);
      else setTimeout(render, 0);
    }
  }
};
