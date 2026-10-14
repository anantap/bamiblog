import { Redis } from "@upstash/redis";
import { del, put } from "@vercel/blob";

const ENTRIES_KEY = "bami:entries";
const DIGEST_KEY = "bami:digest-sent"; // when the last weekly email went out (ms)
const EXTRAS_KEY = "bami:extras"; // footer items for the weekly email, one per email

const redisUrl = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const redisToken = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
const hasCloud = Boolean(redisUrl && redisToken && process.env.BLOB_READ_WRITE_TOKEN);

if (!hasCloud && process.env.VERCEL) {
  throw new Error(
    "Missing storage credentials: connect an Upstash Redis store and a Blob store to this project (Storage tab)."
  );
}

function cloudStore() {
  const redis = new Redis({ url: redisUrl, token: redisToken });
  return {
    async list() {
      const all = await redis.hgetall(ENTRIES_KEY);
      return all ? Object.entries(all).map(([id, value]) => ({ id, ...value })) : [];
    },
    async get(id) {
      const value = await redis.hget(ENTRIES_KEY, id);
      return value ? { id, ...value } : null;
    },
    async uploadPhoto(name, bytes, contentType) {
      const blob = await put(`photos/${name}`, bytes, { access: "public", contentType, addRandomSuffix: true });
      return blob.url;
    },
    async deletePhoto(url) {
      await del(url);
    },
    async save({ id, ...entry }) {
      await redis.hset(ENTRIES_KEY, { [id]: entry });
    },
    async remove(id) {
      await redis.hdel(ENTRIES_KEY, id);
    },
    async lastDigest() {
      const value = await redis.get(DIGEST_KEY);
      return value == null ? null : Number(value);
    },
    async setLastDigest(time) {
      await redis.set(DIGEST_KEY, time);
    },
    async listExtras() {
      const all = await redis.hgetall(EXTRAS_KEY);
      return all ? Object.entries(all).map(([id, value]) => ({ id, ...value })) : [];
    },
    async saveExtra({ id, ...extra }) {
      await redis.hset(EXTRAS_KEY, { [id]: extra });
    },
    async removeExtra(id) {
      await redis.hdel(EXTRAS_KEY, id);
    },
  };
}

// Local development without credentials: everything lives in memory until the dev server restarts.
function memoryStore() {
  const entries = new Map();
  let lastDigest = null;
  const extras = new Map();
  return {
    async list() {
      return [...entries.values()];
    },
    async get(id) {
      return entries.get(id) ?? null;
    },
    async uploadPhoto(_name, bytes, contentType) {
      return `data:${contentType};base64,${Buffer.from(bytes).toString("base64")}`;
    },
    async deletePhoto() {},
    async save(entry) {
      entries.set(entry.id, entry);
    },
    async remove(id) {
      entries.delete(id);
    },
    async lastDigest() {
      return lastDigest;
    },
    async setLastDigest(time) {
      lastDigest = time;
    },
    async listExtras() {
      return [...extras.values()];
    },
    async saveExtra(extra) {
      extras.set(extra.id, extra);
    },
    async removeExtra(id) {
      extras.delete(id);
    },
  };
}

export const store = hasCloud ? cloudStore() : memoryStore();
