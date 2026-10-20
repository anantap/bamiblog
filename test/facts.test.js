import { describe, expect, it } from "vitest";
import { brands, facts, hours, weekly } from "../src/facts.js";

describe("facts", () => {
  it("counts packs, guesses meters of noodles and liters of soup", () => {
    const entries = [
      { brand: "Nissin", flavour: "Cup Noodle" },
      { brand: "Mama", flavour: "Tom Yum" },
      { brand: "Indomie", flavour: "Mi Goreng" },
      { brand: "Nissin", flavour: "Yakisoba" },
    ];
    expect(facts(entries)).toEqual({ packs: 4, flavours: 4, meters: 200, liters: 1 });
  });

  it("is zero without noodles", () => {
    expect(facts([])).toEqual({ packs: 0, flavours: 0, meters: 0, liters: 0 });
  });
});

describe("hours", () => {
  it("counts noodles per hour of the day in Dutch time", () => {
    const at = (iso) => ({ createdAt: Date.parse(iso) });
    // 18:30 UTC in October is 20:30 in Amsterdam (summer time); in January 19:30 (winter time).
    const counts = hours([at("2026-10-10T18:30:00Z"), at("2026-10-11T18:59:00Z"), at("2026-01-10T18:30:00Z"), {}]);
    expect(counts[20]).toBe(2);
    expect(counts[19]).toBe(1);
    expect(counts.reduce((a, b) => a + b)).toBe(3);
  });
});

describe("brands", () => {
  it("groups flavours under brands, busiest first, matching names loosely", () => {
    const entries = [
      { brand: "Indomie", flavour: "Mi Goreng" },
      { brand: "indomie ", flavour: "mi  goreng" },
      { brand: "Indomie", flavour: "Soto" },
      { brand: "Mama", flavour: "Tom Yum" },
      { brand: "Indomie", flavour: "" },
    ];
    expect(brands(entries)).toEqual([
      { brand: "Indomie", count: 4, flavours: [{ flavour: "Mi Goreng", count: 2 }, { flavour: "", count: 1 }, { flavour: "Soto", count: 1 }] },
      { brand: "Mama", count: 1, flavours: [{ flavour: "Tom Yum", count: 1 }] },
    ]);
    expect(facts(entries).flavours).toBe(4);
  });
});

describe("weekly", () => {
  it("counts noodles per week per country, the rest together", () => {
    const e = (date, country) => ({ date, country });
    const { weeks, series } = weekly([e("2026-01-01", "ID"), e("2026-01-03", "ID"), e("2026-01-09", "JP"), e("2026-01-20", "KR"), e("2026-01-21", "")], 2);
    expect(weeks).toBe(3);
    expect(series).toEqual([
      { country: "ID", counts: [2, 0, 0] },
      { country: "JP", counts: [0, 1, 0] },
      { country: "", counts: [0, 0, 2] },
    ]);
  });
});
