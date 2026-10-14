import { decodePhoto } from "../lib/photo.js";
import { isLoggedIn } from "../lib/session.js";
import { store } from "../lib/store.js";
import { validateExtra } from "../lib/validate.js";

// Footer items for the weekly email (the "mail" tab on /add). Owner only. Each Monday email takes the oldest
// unsent one; see lib/digest.js.
export default async function handler(req, res) {
  if (!["GET", "POST", "DELETE"].includes(req.method)) {
    res.setHeader("Allow", "GET, POST, DELETE");
    res.status(405).json({ error: "method not allowed" });
    return;
  }
  if (!isLoggedIn(req)) {
    res.status(401).json({ error: "not logged in" });
    return;
  }
  res.setHeader("Cache-Control", "no-store");

  if (req.method === "GET") {
    const waiting = (await store.listExtras()).filter((e) => !e.sentAt).sort((a, b) => a.createdAt - b.createdAt);
    res.status(200).json(waiting);
    return;
  }

  if (req.method === "POST") {
    const { extra, error } = validateExtra(req.body);
    if (error) {
      res.status(400).json({ error });
      return;
    }
    const photo = decodePhoto(req.body?.image);
    if (photo.error) {
      res.status(400).json({ error: photo.error.replace("photo", "image") });
      return;
    }
    const id = crypto.randomUUID();
    const image = await store.uploadPhoto(`extras/${id}.${photo.ext}`, photo.bytes, photo.contentType);
    const saved = { id, ...extra, image, createdAt: Date.now() };
    await store.saveExtra(saved);
    res.status(201).json(saved);
    return;
  }

  const existing = (await store.listExtras()).find((e) => e.id === req.query?.id);
  if (!existing) {
    res.status(404).json({ error: "not found" });
    return;
  }
  await store.removeExtra(existing.id);
  await store.deletePhoto(existing.image).catch(() => {});
  res.status(200).json({ ok: true });
}
