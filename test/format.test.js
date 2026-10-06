import { describe, expect, it } from "vitest";
import { flag, formatDate, padNumber, sortEntries, stars, title } from "../src/format.js";

const e = (number, date) => ({ id: String(number), number, date });

describe("sortEntries", () => {
  it("sorts by date, newest first, then by number", () => {
    const sorted = sortEntries([e(1, "2026-10-01"), e(3, "2026-10-02"), e(2, "2026-10-01"), e(4, "2026-09-30")]);
    expect(sorted.map((x) => x.number)).toEqual([3, 2, 1, 4]);
  });

  it("does not mutate its input", () => {
    const input = [e(1, "2026-10-01"), e(2, "2026-10-02")];
    sortEntries(input);
    expect(input.map((x) => x.number)).toEqual([1, 2]);
  });
});

describe("formatting", () => {
  it("formats dates as DD.MM.YY", () => {
    expect(formatDate("2026-10-06")).toBe("06.10.26");
  });

  it("pads numbers to three digits", () => {
    expect(padNumber(7)).toBe("007");
    expect(padNumber(1234)).toBe("1234");
  });

  it("turns country codes into flags", () => {
    expect(flag("ID")).toBe("🇮🇩");
    expect(flag("")).toBe("");
  });

  it("splits a rating into filled and empty stars", () => {
    expect(stars(4)).toEqual({ on: "★★★★", off: "★" });
    expect(stars(5)).toEqual({ on: "★★★★★", off: "" });
  });

  it("builds a title from flag, brand and flavour", () => {
    expect(title({ brand: "Indomie", flavour: "Mi Goreng", country: "ID" })).toBe("🇮🇩 Indomie — Mi Goreng");
    expect(title({ brand: "Nissin", flavour: "", country: "" })).toBe("Nissin");
  });
});
