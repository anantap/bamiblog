import { initialBox, moveBox, resizeBox, squareAround } from "./crop-math.js";

const OUTPUT_SIZE = 1200;
const BACKGROUND = "#f4f3ef"; // fills the tile where the square reaches past the photo
const HANDLE = 22; // touch radius around each corner, in CSS pixels
const MAX_HEIGHT = 0.65; // of the viewport

// Shows the whole photo with a box you drag and resize to hug the pack.
// `preview` (optional) is a small canvas that shows the resulting square tile.
export function createCropper(canvas, { preview } = {}) {
  let bitmap = null;
  let box = null;
  let k = 1; // CSS pixels per photo pixel
  let drag = null;

  function layout() {
    if (!bitmap) return;
    const available = canvas.parentElement.clientWidth;
    k = Math.min(available / bitmap.width, (window.innerHeight * MAX_HEIGHT) / bitmap.height);
    canvas.style.width = `${bitmap.width * k}px`;
    canvas.style.height = `${bitmap.height * k}px`;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(bitmap.width * k * dpr);
    canvas.height = Math.round(bitmap.height * k * dpr);
    draw();
  }

  function draw() {
    const ctx = canvas.getContext("2d");
    const s = canvas.width / bitmap.width; // device pixels per photo pixel
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

    // Dim everything outside the box.
    ctx.fillStyle = "rgb(0 0 0 / 0.45)";
    ctx.beginPath();
    ctx.rect(0, 0, canvas.width, canvas.height);
    ctx.rect(box.x * s, box.y * s, box.w * s, box.h * s);
    ctx.fill("evenodd");

    const dpr = window.devicePixelRatio || 1;

    // The square tile that will be saved.
    const sq = squareAround(box);
    ctx.setLineDash([6 * dpr, 5 * dpr]);
    ctx.lineWidth = 1 * dpr;
    ctx.strokeStyle = "rgb(255 255 255 / 0.7)";
    ctx.strokeRect(sq.sx * s, sq.sy * s, sq.size * s, sq.size * s);
    ctx.setLineDash([]);

    // The box and its corner handles.
    ctx.lineWidth = 1.5 * dpr;
    ctx.strokeStyle = "#fff";
    ctx.strokeRect(box.x * s, box.y * s, box.w * s, box.h * s);
    ctx.fillStyle = "#fff";
    const r = 5 * dpr;
    for (const [cx, cy] of corners()) ctx.fillRect(cx * s - r, cy * s - r, r * 2, r * 2);

    if (preview) renderSquare(preview, preview.width);
  }

  function corners() {
    return [
      [box.x, box.y],
      [box.x + box.w, box.y],
      [box.x, box.y + box.h],
      [box.x + box.w, box.y + box.h],
    ];
  }

  function renderSquare(target, size) {
    const ctx = target.getContext("2d");
    const { sx, sy, size: side } = squareAround(box);
    ctx.fillStyle = BACKGROUND;
    ctx.fillRect(0, 0, size, size);
    const scale = size / side;
    ctx.drawImage(bitmap, -sx * scale, -sy * scale, bitmap.width * scale, bitmap.height * scale);
  }

  // Pointer position in photo pixels.
  function point(event) {
    const rect = canvas.getBoundingClientRect();
    return { x: (event.clientX - rect.left) / k, y: (event.clientY - rect.top) / k };
  }

  function hit(p) {
    const reach = HANDLE / k;
    const names = ["nw", "ne", "sw", "se"];
    const index = corners().findIndex(([cx, cy]) => Math.hypot(p.x - cx, p.y - cy) <= reach);
    if (index !== -1) return names[index];
    const inside = p.x >= box.x && p.x <= box.x + box.w && p.y >= box.y && p.y <= box.y + box.h;
    return inside ? "move" : null;
  }

  canvas.addEventListener("pointerdown", (event) => {
    if (!bitmap) return;
    const p = point(event);
    const mode = hit(p);
    if (!mode) return;
    canvas.setPointerCapture(event.pointerId);
    drag = { mode, last: p };
  });

  canvas.addEventListener("pointermove", (event) => {
    if (!bitmap) return;
    const p = point(event);
    if (!drag) {
      const mode = hit(p);
      canvas.style.cursor = !mode ? "default" : mode === "move" ? "move" : mode === "nw" || mode === "se" ? "nwse-resize" : "nesw-resize";
      return;
    }
    const dx = p.x - drag.last.x;
    const dy = p.y - drag.last.y;
    drag.last = p;
    box = drag.mode === "move" ? moveBox(box, dx, dy, bitmap) : resizeBox(box, drag.mode, dx, dy, bitmap);
    draw();
  });

  const release = () => (drag = null);
  canvas.addEventListener("pointerup", release);
  canvas.addEventListener("pointercancel", release);
  window.addEventListener("resize", layout);

  return {
    async load(file) {
      bitmap?.close();
      bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
      box = initialBox(bitmap);
      layout();
    },

    get ready() {
      return bitmap !== null;
    },

    // The square tile as a data URL, at most 1200×1200. Prefers WebP, falls back to JPEG.
    toDataURL() {
      const size = Math.min(OUTPUT_SIZE, Math.round(squareAround(box).size));
      const out = document.createElement("canvas");
      out.width = out.height = size;
      renderSquare(out, size);
      const webp = out.toDataURL("image/webp", 0.85);
      return webp.startsWith("data:image/webp") ? webp : out.toDataURL("image/jpeg", 0.88);
    },
  };
}
