import { nextNumber } from "../lib/numbering.js";
import { decodePhoto } from "../lib/photo.js";
import { isLoggedIn } from "../lib/session.js";
import { store } from "../lib/store.js";
import { validateEntry } from "../lib/validate.js";

export default async function handler(req, res) {
  if (req.method === "GET") {
    res.setHeader("Cache-Control", "no-store");
    const entries = await store.list();
    // Ratings stay stored but are only sent to the logged-in owner.
    res.status(200).json(isLoggedIn(req) ? entries : entries.map(({ rating, ...rest }) => rest));
    return;
  }

  if (req.method !== "POST" && req.method !== "DELETE") {
    res.setHeader("Allow", "GET, POST, DELETE");
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
  await store.remove(id);
  await store.deletePhoto(existing.photo);
  res.status(200).json({ ok: true });
}
