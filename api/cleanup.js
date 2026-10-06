// Temporary: removes the retired entry counter. Deleted again right after use.
import { Redis } from "@upstash/redis";
import { isLoggedIn } from "../lib/session.js";

export default async function handler(req, res) {
  if (req.method !== "POST" || !isLoggedIn(req)) {
    res.status(404).json({ error: "not found" });
    return;
  }
  const redis = new Redis({ url: process.env.KV_REST_API_URL, token: process.env.KV_REST_API_TOKEN });
  const before = await redis.get("bami:counter");
  const removed = await redis.del("bami:counter");
  res.status(200).json({ before, removed });
}
