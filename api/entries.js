import { nextNumber } from "../lib/numbering.js";
import { decodePhoto } from "../lib/photo.js";
import { isLoggedIn } from "../lib/session.js";
import { store } from "../lib/store.js";
import { validateEntry } from "../lib/validate.js";

export default async function handler(req, res) {
  if (req.method === "GET") {
    res.setHeader("Cache-Control", "no-store");
    const entries = await store.list();
    // Ratings and reviews stay stored but are only sent to the logged-in owner (reviews go out in the weekly email).
    res.status(200).json(isLoggedIn(req) ? entries : entries.map(({ rating, review, ...rest }) => rest));
    return;
  }

  if (req.method !== "POST" && req.method !== "PATCH" && req.method !== "DELETE") {
    res.setHeader("Allow", "GET, POST, PATCH, DELETE");
    res.status(405).json({ error: "method not allowed" });
    return;
  }

  if (!isLoggedIn(req)) {
    res.status(401).json({ error: "not logged in" });
    return;
  }

  if (req.method === "POST") {
    const { entry, error } = validateEntry(req.body);
    if (error) {
      res.status(400).json({ error });
      return;
    }
    const photo = decodePhoto(req.body?.photo);
    if (photo.error) {
      res.status(400).json({ error: photo.error });
      return;
    }
    const id = crypto.randomUUID();
    const number = nextNumber(await store.list());
    const photoUrl = await store.uploadPhoto(`${String(number).padStart(3, "0")}.${photo.ext}`, photo.bytes, photo.contentType);
    const saved = { id, number, photo: photoUrl, ...entry, createdAt: Date.now() };
    await store.save(saved);
    res.status(201).json(saved);
    return;
  }

  const id = req.query?.id;
  const existing = id && (await store.get(id));
  if (!existing) {
    res.status(404).json({ error: "not found" });
    return;
  }

  // Edit: any fields left out keep their current value. The number, id and createdAt never change, so an
  // edited noodle keeps its place in the grid and isn't emailed again. A new photo replaces the old one.
  if (req.method === "PATCH") {
    const { entry, error } = validateEntry({ ...existing, ...req.body });
    if (error) {
      res.status(400).json({ error });
      return;
    }
    let photoUrl = existing.photo;
    if (req.body?.photo) {
      const photo = decodePhoto(req.body.photo);
      if (photo.error) {
        res.status(400).json({ error: photo.error });
        return;
      }
      photoUrl = await store.uploadPhoto(`${String(existing.number).padStart(3, "0")}.${photo.ext}`, photo.bytes, photo.contentType);
    }
    const updated = { ...existing, ...entry, photo: photoUrl };
    await store.save(updated);
    if (photoUrl !== existing.photo) await store.deletePhoto(existing.photo).catch(() => {});
    res.status(200).json(updated);
    return;
  }

  await store.remove(id);
  await store.deletePhoto(existing.photo);
  res.status(200).json({ ok: true });
}
