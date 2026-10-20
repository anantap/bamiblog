import { describe, expect, it } from "vitest";
import { facts, hours } from "../src/facts.js";

describe("facts", () => {
  it("counts packs, guesses meters of noodles and liters of soup", () => {
    const entries = [
      { brand: "Nissin", flavour: "Cup Noodle" },
      { brand: "Mama", flavour: "Tom Yum" },
      { brand: "Indomie", flavour: "Mi Goreng" },
      { brand: "Nissin", flavour: "Yakisoba" },
    ];
    expect(facts(entries)).toEqual({ packs: 4, meters: 200, liters: 1 });
  });

  it("is zero without noodles", () => {
    expect(facts([])).toEqual({ packs: 0, meters: 0, liters: 0 });
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
