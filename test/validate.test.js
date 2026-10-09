import { describe, expect, it } from "vitest";
import { cleanPlace, validateEntry } from "../lib/validate.js";

const valid = {
  brand: "  Indomie ",
  flavour: "Mi Goreng",
  country: "ID",
  rating: 4,
  note: "added an egg",
  place: "The Hague, NL",
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
    ["place without a country", { place: "The Hague" }],
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

describe("cleanPlace", () => {
  it.each([
    ["The Hague, NL", "The Hague, NL"],
    ["  the hague ,nl ", "the hague, NL"],
    ["Tokyo,JP", "Tokyo, JP"],
    ["Ho Chi Minh City, vn", "Ho Chi Minh City, VN"],
    ["", ""],
    [undefined, ""],
  ])("cleans %j to %j", (input, expected) => {
    expect(cleanPlace(input)).toEqual({ place: expected });
  });

  it.each([
    ["no country", "The Hague"],
    ["country spelled out", "The Hague, Netherlands"],
    ["three-letter code", "The Hague, NLD"],
    ["unknown code", "The Hague, XX"],
    ["no city", ", NL"],
    ["too long", `${"x".repeat(80)}, NL`],
  ])("rejects %s", (_, input) => {
    expect(cleanPlace(input).error).toBeTruthy();
  });
});
