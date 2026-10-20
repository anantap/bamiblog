import { describe, expect, it } from "vitest";
import { facts } from "../src/facts.js";

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
