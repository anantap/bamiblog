// Crop state for a photo inside a square frame. Positions are in "view units":
// the frame is 1×1, (x, y) is where the photo's top-left corner sits, and
// `scale` converts photo pixels to view units. The photo always covers the frame.

const MAX_ZOOM = 5;

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function fit(crop) {
  const w = crop.width * crop.scale;
  const h = crop.height * crop.scale;
  return { ...crop, x: clamp(crop.x, 1 - w, 0), y: clamp(crop.y, 1 - h, 0) };
}

export function initialCrop({ width, height }) {
  const scale = 1 / Math.min(width, height);
  return { width, height, zoom: 1, scale, x: (1 - width * scale) / 2, y: (1 - height * scale) / 2 };
}

export function pan(crop, dx, dy) {
  return fit({ ...crop, x: crop.x + dx, y: crop.y + dy });
}

// Zooms to `zoom` (1× = photo just fills the frame) keeping view point (px, py) fixed.
export function zoomAt(crop, zoom, px, py) {
  const z = clamp(zoom, 1, MAX_ZOOM);
  const scale = z / Math.min(crop.width, crop.height);
  const imageX = (px - crop.x) / crop.scale;
  const imageY = (py - crop.y) / crop.scale;
  return fit({ ...crop, zoom: z, scale, x: px - imageX * scale, y: py - imageY * scale });
}

// The square of the original photo (in photo pixels) that is visible in the frame.
export function sourceRect(crop) {
  return {
    sx: Math.round(-crop.x / crop.scale) + 0, // + 0 turns -0 into 0
    sy: Math.round(-crop.y / crop.scale) + 0,
    size: Math.round(1 / crop.scale),
  };
}
