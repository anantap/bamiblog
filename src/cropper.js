import { initialCrop, pan, sourceRect, zoomAt } from "./crop-math.js";

const OUTPUT_SIZE = 1200;

// Square crop frame on a <canvas>: drag to move, pinch or scroll to zoom.
export function createCropper(canvas, { onZoom } = {}) {
  let bitmap = null;
  let crop = null;
  let pinch = null;
  const pointers = new Map();

  function draw() {
    const size = Math.round(canvas.clientWidth * (window.devicePixelRatio || 1));
    if (canvas.width !== size) canvas.width = canvas.height = size;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, size, size);
    if (!crop) return;
    ctx.drawImage(bitmap, crop.x * size, crop.y * size, crop.width * crop.scale * size, crop.height * crop.scale * size);
  }

  function update(next) {
    crop = next;
    draw();
    onZoom?.(crop.zoom);
  }

  // Pointer position in view units (the frame is 1×1).
  function point(event) {
    const rect = canvas.getBoundingClientRect();
    return { x: (event.clientX - rect.left) / rect.width, y: (event.clientY - rect.top) / rect.height };
  }

  canvas.addEventListener("pointerdown", (event) => {
    if (!crop) return;
    canvas.setPointerCapture(event.pointerId);
    pointers.set(event.pointerId, point(event));
    pinch = null;
  });

  canvas.addEventListener("pointermove", (event) => {
    if (!crop || !pointers.has(event.pointerId)) return;
    const previous = pointers.get(event.pointerId);
    const current = point(event);
    pointers.set(event.pointerId, current);

    if (pointers.size === 1) {
      update(pan(crop, current.x - previous.x, current.y - previous.y));
      return;
    }

    const [a, b] = pointers.values();
    const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    const distance = Math.hypot(a.x - b.x, a.y - b.y);
    if (pinch) {
      const moved = pan(crop, mid.x - pinch.mid.x, mid.y - pinch.mid.y);
      update(zoomAt(moved, crop.zoom * (distance / pinch.distance), mid.x, mid.y));
    }
    pinch = { mid, distance };
  });

  const release = (event) => {
    pointers.delete(event.pointerId);
    pinch = null;
  };
  canvas.addEventListener("pointerup", release);
  canvas.addEventListener("pointercancel", release);

  canvas.addEventListener(
    "wheel",
    (event) => {
      if (!crop) return;
      event.preventDefault();
      const p = point(event);
      update(zoomAt(crop, crop.zoom * Math.exp(-event.deltaY * 0.002), p.x, p.y));
    },
    { passive: false }
  );

  window.addEventListener("resize", draw);

  return {
    async load(file) {
      bitmap?.close();
      bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
      update(initialCrop(bitmap));
    },

    setZoom(zoom) {
      if (crop) update(zoomAt(crop, zoom, 0.5, 0.5));
    },

    get ready() {
      return crop !== null;
    },

    // The framed square as a data URL, at most 1200×1200. Prefers WebP, falls back to JPEG.
    toDataURL() {
      const { sx, sy, size } = sourceRect(crop);
      const out = Math.min(OUTPUT_SIZE, size);
      const canvasOut = document.createElement("canvas");
      canvasOut.width = canvasOut.height = out;
      canvasOut.getContext("2d").drawImage(bitmap, sx, sy, size, size, 0, 0, out, out);
      const webp = canvasOut.toDataURL("image/webp", 0.85);
      return webp.startsWith("data:image/webp") ? webp : canvasOut.toDataURL("image/jpeg", 0.88);
    },
  };
}
