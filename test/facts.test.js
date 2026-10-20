import { describe, expect, it } from "vitest";
import { brands, facts } from "../src/facts.js";

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
