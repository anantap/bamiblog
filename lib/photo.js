const TYPES = { "image/webp": "webp", "image/jpeg": "jpg", "image/png": "png" };
export const MAX_PHOTO_BYTES = 3 * 1024 * 1024;

// Decodes a "data:image/...;base64,..." string. Returns { bytes, contentType, ext } or { error }.
export function decodePhoto(dataUrl) {
  const match = typeof dataUrl === "string" && dataUrl.match(/^data:(image\/[a-z]+);base64,(.+)$/);
  if (!match || !TYPES[match[1]]) return { error: "photo must be a webp, jpeg or png" };
  const bytes = Buffer.from(match[2], "base64");
  if (bytes.length === 0) return { error: "photo is empty" };
  if (bytes.length > MAX_PHOTO_BYTES) return { error: "photo is too large" };
  return { bytes, contentType: match[1], ext: TYPES[match[1]] };
}
