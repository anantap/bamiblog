import { beforeAll, describe, expect, it } from "vitest";

const PNG = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";
const JPEG = "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/wAALCAABAAEBAREA/8QAFAABAAAAAAAAAAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAD8AKp//2Q==";

let handler;
let cookie;

// Calls the real handler with a minimal stand-in for Vercel's req/res.
function call({ method = "GET", query = {}, body, auth = true } = {}) {
  return new Promise((resolve) => {
    const res = {
      statusCode: 200,
      setHeader() {},
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(data) {
        resolve({ status: this.statusCode, data });
      },
    };
    handler({ method, query, body, headers: auth ? { cookie } : {} }, res);
  });
}

beforeAll(async () => {
  process.env.ADMIN_PASSWORD = "test-password";
  const { sessionToken } = await import("../lib/session.js");
  cookie = `bami_session=${sessionToken("test-password")}`;
  ({ default: handler } = await import("../api/entries.js"));
});

async function add(extra = {}) {
  const body = { brand: "Indomie", flavour: "Mi Goreng", country: "ID", rating: 4, date: "2026-10-09", photo: PNG, ...extra };
  return (await call({ method: "POST", body })).data;
}

describe("PATCH /api/entries", () => {
  it("edits fields but keeps the number, id, createdAt and photo", async () => {
    const saved = await add({ review: "tpyo" });
    const { status, data } = await call({
      method: "PATCH",
      query: { id: saved.id },
      body: { brand: "Indomie", flavour: "Soto", country: "ID", rating: 5, review: "typo fixed", note: "", place: "Delft, nl", date: "2026-10-08" },
    });
    expect(status).toBe(200);
    expect(data).toMatchObject({ id: saved.id, number: saved.number, createdAt: saved.createdAt, photo: saved.photo });
    expect(data).toMatchObject({ flavour: "Soto", rating: 5, review: "typo fixed", place: "Delft, NL", date: "2026-10-08" });
  });

  it("keeps fields that are left out, so a location-only change still works", async () => {
    const saved = await add({ review: "keep me" });
    const { data } = await call({ method: "PATCH", query: { id: saved.id }, body: { place: "Tokyo, JP" } });
    expect(data).toMatchObject({ place: "Tokyo, JP", review: "keep me", brand: "Indomie", rating: 4 });
  });

  it("replaces the photo when a new one is sent", async () => {
    const saved = await add();
    const { data } = await call({ method: "PATCH", query: { id: saved.id }, body: { photo: JPEG } });
    expect(data.photo).not.toBe(saved.photo);
    expect(data.photo.startsWith("data:image/jpeg")).toBe(true);
  });

  it("rejects what adding would reject", async () => {
    const saved = await add();
    expect((await call({ method: "PATCH", query: { id: saved.id }, body: { rating: 9 } })).status).toBe(400);
    expect((await call({ method: "PATCH", query: { id: saved.id }, body: { brand: " " } })).status).toBe(400);
    expect((await call({ method: "PATCH", query: { id: saved.id }, body: { photo: "data:text/plain;base64,aGk=" } })).status).toBe(400);
  });

  it("needs a login and an existing entry", async () => {
    const saved = await add();
    expect((await call({ method: "PATCH", query: { id: saved.id }, body: { brand: "X" }, auth: false })).status).toBe(401);
    expect((await call({ method: "PATCH", query: { id: "nope" }, body: { brand: "X" } })).status).toBe(404);
  });
});
