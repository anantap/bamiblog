// Crop maths. A box is { x, y, w, h } in photo pixels, drawn tightly around the pack or cup.
// The square tile is then derived from the box, so every noodle is framed the same way.

// Share of the tile that the box's long side fills.
export const FILL = 0.84;

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export function initialBox({ width, height }) {
  const w = width * 0.6;
  const h = height * 0.6;
  return { x: (width - w) / 2, y: (height - h) / 2, w, h };
}

export function moveBox(box, dx, dy, photo) {
  return {
    ...box,
    x: clamp(box.x + dx, 0, photo.width - box.w),
    y: clamp(box.y + dy, 0, photo.height - box.h),
  };
}

// Drags one corner ("nw", "ne", "sw" or "se"); the opposite corner stays put.
export function resizeBox(box, corner, dx, dy, photo) {
  const min = Math.min(photo.width, photo.height) * 0.05;
  let { x, y } = box;
  let right = box.x + box.w;
  let bottom = box.y + box.h;
  if (corner.includes("w")) x = clamp(x + dx, 0, right - min);
  else right = clamp(right + dx, x + min, photo.width);
  if (corner.includes("n")) y = clamp(y + dy, 0, bottom - min);
  else bottom = clamp(bottom + dy, y + min, photo.height);
  return { x, y, w: right - x, h: bottom - y };
}

// The square (in photo pixels) centred on the box, with the box's long side filling FILL of it.
// It may reach past the photo's edges; the cropper fills that with the background colour.
export function squareAround(box) {
  const size = Math.max(box.w, box.h) / FILL;
  return { sx: box.x + box.w / 2 - size / 2, sy: box.y + box.h / 2 - size / 2, size };
}
