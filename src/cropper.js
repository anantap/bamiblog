import { initialCrop, pan, sourceRect, zoomAt } from "./crop-math.js";

const OUTPUT_SIZE = 1200;

// Square crop frame on a <canvas> with a fixed guide on top.
// Phone: drag with one finger, pinch with two. Desktop: drag with the mouse,
// pinch on the trackpad or scroll to zoom, or use the + and − keys.
export function createCropper(canvas) {
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

  // Trackpad pinches arrive as wheel events with ctrlKey set and small deltas.
  canvas.addEventListener(
    "wheel",
    (event) => {
      if (!crop) return;
      event.preventDefault();
      const p = point(event);
      const speed = event.ctrlKey ? 0.01 : 0.002;
      update(zoomAt(crop, crop.zoom * Math.exp(-event.deltaY * speed), p.x, p.y));
    },
    { passive: false }
  );

  canvas.addEventListener("keydown", (event) => {
    if (!crop) return;
    const factor = { "+": 1.1, "=": 1.1, "-": 1 / 1.1, _: 1 / 1.1 }[event.key];
    const step = 0.02;
    const arrows = { ArrowLeft: [step, 0], ArrowRight: [-step, 0], ArrowUp: [0, step], ArrowDown: [0, -step] }[event.key];
    if (factor) update(zoomAt(crop, crop.zoom * factor, 0.5, 0.5));
    else if (arrows) update(pan(crop, ...arrows));
    else return;
    event.preventDefault();
  });

  window.addEventListener("resize", draw);

  return {
    async load(file) {
      bitmap?.close();
      bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
      update(initialCrop(bitmap));
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
