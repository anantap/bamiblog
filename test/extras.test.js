import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { extraMarkdown, pickExtra } from "../lib/digest.js";
import { validateExtra } from "../lib/validate.js";

const JPEG = "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/wAALCAABAAEBAREA/8QAFAABAAAAAAAAAAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAD8AKp//2Q==";
const NOV2 = Date.UTC(2026, 10, 2, 6);
const OCT26 = Date.UTC(2026, 9, 26, 6);

describe("validateExtra", () => {
  it("cleans a full item", () => {
    expect(validateExtra({ caption: " Monday mood ", link: "https://www.threads.com/x", credit: "Pieter", creditUrl: "https://pieter-de-jong.nl" })).toEqual({
      extra: { caption: "Monday mood", link: "https://www.threads.com/x", credit: "Pieter", creditUrl: "https://pieter-de-jong.nl/" },
    });
  });

  it.each([
    ["no caption", { caption: " " }],
    ["a link that isn't a web address", { caption: "x", link: "javascript:alert(1)" }],
    ["a credit link without a name", { caption: "x", creditUrl: "https://a.nl" }],
    ["a long caption", { caption: "x".repeat(121) }],
  ])("rejects %s", (_, input) => {
    expect(validateExtra(input).error).toBeTruthy();
  });
});

describe("pickExtra", () => {
  const extras = [
    { id: "b", createdAt: 2 },
    { id: "a", createdAt: 1, sentAt: 5 },
    { id: "c", createdAt: 3 },
  ];

  it("takes the oldest item that hasn't been sent", () => {
    expect(pickExtra(extras, NOV2).id).toBe("b");
  });

  it("waits during weeks with a hard-coded Monday mood", () => {
    expect(pickExtra(extras, OCT26)).toBeNull();
  });

  it("is empty when nothing is waiting", () => {
    expect(pickExtra([{ id: "a", createdAt: 1, sentAt: 2 }], NOV2)).toBeNull();
  });
});

describe("extraMarkdown", () => {
  it("links the image and credits with a link", () => {
    expect(extraMarkdown({ image: "https://x/i.jpg", link: "https://v", caption: "Monday mood", credit: "Pieter", creditUrl: "https://p" })).toBe(
      "[![Monday mood](https://x/i.jpg)](https://v)\n\nMonday mood (via [Pieter](https://p))"
    );
  });

  it("leaves out what isn't there", () => {
    expect(extraMarkdown({ image: "https://x/i.jpg", link: "", caption: "Hi", credit: "", creditUrl: "" })).toBe("![Hi](https://x/i.jpg)\n\nHi");
    expect(extraMarkdown({ image: "https://x/i.jpg", link: "", caption: "Hi", credit: "Bas", creditUrl: "" })).toBe("![Hi](https://x/i.jpg)\n\nHi (via Bas)");
  });
});

describe("/api/extras and the weekly send", () => {
  let extras, digest, store, cookie;

  function call(handler, { method = "GET", query = {}, body, headers } = {}) {
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
      handler({ method, query, body, headers: headers ?? { cookie } }, res);
    });
  }

  beforeAll(async () => {
    process.env.ADMIN_PASSWORD = "test-password";
    process.env.CRON_SECRET = "cron";
    process.env.BUTTONDOWN_API_KEY = "key";
    const { sessionToken } = await import("../lib/session.js");
    cookie = `bami_session=${sessionToken("test-password")}`;
    ({ default: extras } = await import("../api/extras.js"));
    ({ default: digest } = await import("../api/digest.js"));
    ({ store } = await import("../lib/store.js"));
  });

  afterEach(() => vi.useRealTimers());

  it("needs a login", async () => {
    expect((await call(extras, { headers: {} })).status).toBe(401);
  });

  it("adds, lists and deletes items", async () => {
    const added = await call(extras, { method: "POST", body: { caption: "Monday mood", credit: "Bas", image: JPEG } });
    expect(added.status).toBe(201);
    expect(added.data).toMatchObject({ caption: "Monday mood", credit: "Bas" });
    expect((await call(extras)).data.map((e) => e.id)).toContain(added.data.id);
    expect((await call(extras, { method: "DELETE", query: { id: added.data.id } })).status).toBe(200);
    expect((await call(extras)).data.map((e) => e.id)).not.toContain(added.data.id);
  });

  it("rejects an item without an image", async () => {
    expect((await call(extras, { method: "POST", body: { caption: "x" } })).status).toBe(400);
  });

  it("puts the oldest item in the Monday email and marks it sent", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(NOV2 - 60_000);
    await store.save({ id: "n1", number: 1, createdAt: Date.now(), brand: "Indomie", rating: 4, date: "2026-11-01", photo: JPEG });
    const first = (await call(extras, { method: "POST", body: { caption: "First", image: JPEG } })).data;
    vi.setSystemTime(NOV2 - 30_000);
    const second = (await call(extras, { method: "POST", body: { caption: "Second", image: JPEG } })).data;
    vi.setSystemTime(NOV2);

    const sent = [];
    const fetchStub = vi.spyOn(globalThis, "fetch").mockImplementation(async (_url, opts) => {
      sent.push(JSON.parse(opts.body));
      return new Response("{}", { status: 201 });
    });
    const result = await call(digest, { headers: { authorization: "Bearer cron" } });
    fetchStub.mockRestore();

    expect(result.data).toMatchObject({ mode: "send", sent: true });
    expect(sent[0].body).toContain("First");
    expect(sent[0].body).not.toContain("Second");
    const waiting = (await call(extras)).data.map((e) => e.id);
    expect(waiting).not.toContain(first.id);
    expect(waiting).toContain(second.id);
  });
});
