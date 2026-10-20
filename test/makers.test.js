import { describe, expect, it } from "vitest";
import { makers } from "../src/makers.js";

describe("makers", () => {
  it("finds the companies behind eaten brands, with their other brands, and leaves the rest alone", () => {
    const { companies, loners } = makers(["indomie", "Nongshim", "Prima Taste"]);
    expect(companies.map((c) => c.company)).toEqual(["Indofood", "Nongshim"]);
    expect(companies[0].brands.slice(0, 2)).toEqual([{ brand: "indomie", eaten: true }, { brand: "Sarimi", eaten: false }]);
    expect(companies[1]).toEqual({ company: "Nongshim", eaten: true, brands: [{ brand: "Shin Ramyun", eaten: false }] });
    expect(loners).toEqual(["Prima Taste"]);
  });
});
