import { describe, expect, it } from "vitest";
import { digestEmail, newSince } from "../lib/digest.js";

const DAY = 24 * 60 * 60 * 1000;
const now = Date.UTC(2026, 9, 12, 6); // Monday 12 Oct 2026, 06:00 UTC

const noodle = (number, createdAt, extra = {}) => ({
  id: String(number),
  number,
  createdAt,
  brand: "Indomie",
  flavour: "Mi Goreng",
  country: "ID",
  rating: 5,
  date: "2026-10-06",
  photo: `https://blob.example/${number}.jpg`,
  ...extra,
});

describe("newSince", () => {
  const entries = [noodle(3, now - 2 * DAY), noodle(1, now - 10 * DAY), noodle(2, now - 6 * DAY), noodle(4, now + 1000)];

  it("takes what was added after the last email, oldest first", () => {
    expect(newSince(entries, now - 8 * DAY, now).map((e) => e.number)).toEqual([2, 3]);
  });

  it("falls back to the past week before the first email", () => {
    expect(newSince(entries, null, now).map((e) => e.number)).toEqual([2, 3]);
  });

  it("does not repeat noodles from the last email", () => {
    expect(newSince(entries, now - 6 * DAY, now).map((e) => e.number)).toEqual([3]);
  });
});

describe("digestEmail", () => {
  it("is called weekly ingest", () => {
    expect(digestEmail([noodle(1, 0)]).subject).toBe("weekly ingest");
    expect(digestEmail([noodle(1, 0), noodle(2, 0)]).subject).toBe("weekly ingest");
  });

  it("lists number, name, date, location, photo and review, but no rating", () => {
    const { body } = digestEmail([noodle(7, 0, { place: "The Hague, NL", review: "Sweet and sticky." })]);
    expect(body).toContain("## 007 · 🇮🇩 Indomie — Mi Goreng");
    expect(body).toContain("06.10.26 · The Hague, NL");
    expect(body).toContain("![🇮🇩 Indomie — Mi Goreng](https://blob.example/7.jpg)");
    expect(body).toContain("Sweet and sticky.");
    expect(body).toContain("[bami.blog](https://bami.blog)");
    expect(body).not.toMatch(/★|rating|\b5\/5\b/i);
  });

  it("opens with the logo, served from the site", () => {
    expect(digestEmail([noodle(1, 0)], "https://example.test").body).toMatch(/^<img src="https:\/\/example\.test\/logo-email\.png" alt="bami\.blog"/);
  });

  it("adds the one-off Monday mood video to the 19 October email only, before the footer", () => {
    const mood = "[![Monday mood](https://bami.blog/email/monday-mood.jpg)](https://www.threads.com/share/_iJJygnnr/)\n\nMonday mood (via [Pieter](https://pieter-de-jong.nl/))";
    const on19 = digestEmail([noodle(1, 0)], "https://bami.blog", Date.UTC(2026, 9, 19, 6)).body;
    expect(on19).toContain(`---\n\n${mood}\n\n---\n\nAll the noods`);
    expect(on19).not.toContain("Bastiaan");
  });

  it("adds Bastiaan's painting to the 26 October email only, after Pieter's has gone", () => {
    const painting = "![Monday mood](https://bami.blog/email/monday-mood-2.jpg)\n\nMonday mood (via [Bastiaan](https://www.instagram.com/bastiaansizoo/))";
    const on = (day) => digestEmail([noodle(1, 0)], "https://bami.blog", Date.UTC(2026, 9, day, 6)).body;
    expect(on(26)).toContain(`---\n\n${painting}\n\n---\n\nAll the noods`);
    expect(on(26)).not.toContain("Pieter");
    expect(on(20)).toContain("Bastiaan");
    expect(on(27)).not.toContain("Monday mood");
  });

  it("leaves out an empty review and location", () => {
    const { body } = digestEmail([noodle(8, 0)], "https://bami.blog", Date.UTC(2026, 10, 2, 6));
    expect(body).toBe('<img src="https://bami.blog/logo-email.png" alt="bami.blog" width="200" height="96" />\n\n## 008 · 🇮🇩 Indomie — Mi Goreng\n\n06.10.26\n\n![🇮🇩 Indomie — Mi Goreng](https://blob.example/8.jpg)\n\n---\n\nAll the noods: [bami.blog](https://bami.blog)');
  });
});
