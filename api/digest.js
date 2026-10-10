import { createEmail } from "../lib/buttondown.js";
import { digestEmail, newSince } from "../lib/digest.js";
import { checkPassword, isLoggedIn } from "../lib/session.js";
import { store } from "../lib/store.js";

// Vercel's cron sends "Authorization: Bearer <CRON_SECRET>"; without the secret set, nothing can trigger a send.
function isCron(req) {
  const secret = process.env.CRON_SECRET;
  return Boolean(secret) && checkPassword(req.headers.authorization, `Bearer ${secret}`);
}

// The weekly email (vercel.json runs it Monday morning). Logged in, ?mode=preview shows what would go out
// and ?mode=draft saves it as a draft in Buttondown; neither sends anything.
export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    res.status(405).json({ error: "method not allowed" });
    return;
  }

  const cron = isCron(req);
  if (!cron && !isLoggedIn(req)) {
    res.status(401).json({ error: "not allowed" });
    return;
  }
  const mode = cron ? "send" : req.query?.mode === "draft" ? "draft" : "preview";

  res.setHeader("Cache-Control", "no-store");
  const now = Date.now();
  const since = await store.lastDigest();
  const entries = newSince(await store.list(), since, now);
  if (entries.length === 0) {
    res.status(200).json({ mode, count: 0, sent: false, since });
    return;
  }

  const email = digestEmail(entries, process.env.SITE_URL || "https://bami.blog");
  if (mode === "preview") {
    res.status(200).json({ mode, count: entries.length, since, ...email });
    return;
  }

  try {
    await createEmail({ ...email, status: mode === "send" ? "about_to_send" : "draft" });
  } catch (err) {
    res.status(502).json({ error: err.message });
    return;
  }
  // Only a real send moves the window on, so next week starts where this email ended.
  if (mode === "send") await store.setLastDigest(now);
  res.status(200).json({ mode, count: entries.length, sent: mode === "send" });
}
