import { describe, expect, it } from "vitest";
import { validateEntry } from "../lib/validate.js";

const valid = {
  brand: "  Indomie ",
  flavour: "Mi Goreng",
  country: "ID",
  rating: 4,
  note: "added an egg",
  place: "Thuis",
  date: "2026-10-06",
};

describe("validateEntry", () => {
  it("accepts a full entry and trims strings", () => {
    const { entry, error } = validateEntry(valid);
    expect(error).toBeUndefined();
    expect(entry).toEqual({ ...valid, brand: "Indomie" });
  });

  it("accepts a minimal entry with empty optional fields", () => {
    const { entry } = validateEntry({ brand: "Nissin", rating: "3", date: "2026-01-31" });
    expect(entry).toEqual({
      brand: "Nissin",
      flavour: "",
      country: "",
      rating: 3,
      note: "",
      place: "",
      date: "2026-01-31",
    });
  });

  it.each([
    ["missing brand", { brand: "  " }],
    ["long brand", { brand: "x".repeat(61) }],
    ["long note", { note: "x".repeat(281) }],
    ["unknown country", { country: "XX" }],
    ["rating 0", { rating: 0 }],
    ["rating 6", { rating: 6 }],
    ["fractional rating", { rating: 3.5 }],
    ["bad date format", { date: "06/10/2026" }],
    ["impossible date", { date: "2026-02-30" }],
  ])("rejects %s", (_, override) => {
    expect(validateEntry({ ...valid, ...override }).error).toBeTruthy();
  });

  it("rejects non-object input", () => {
    expect(validateEntry(null).error).toBeTruthy();
  });
});
