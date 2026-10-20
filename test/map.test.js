import { describe, expect, it } from "vitest";
import { byCountry, placeCountry } from "../src/map-data.js";
import world from "../src/world.json";
import { COUNTRIES } from "../lib/countries.js";

const e = (number, country, place, date = "2026-10-01") => ({ id: String(number), number, country, place, date });

describe("map data", () => {
  it("reads the country code from a place", () => {
    expect(placeCountry("The Hague, NL")).toBe("NL");
    expect(placeCountry("Tokyo")).toBe("");
    expect(placeCountry(undefined)).toBe("");
  });

  it("groups noodles by where they're from or where they were eaten, newest first", () => {
    const entries = [e(1, "ID", "The Hague, NL"), e(2, "ID", "Tokyo, JP", "2026-10-05"), e(3, "JP", ""), e(4, "", "Delft, NL")];
    const made = byCountry(entries, "made");
    expect([...made.keys()].sort()).toEqual(["ID", "JP"]);
    expect(made.get("ID").map((x) => x.number)).toEqual([2, 1]);
    const eaten = byCountry(entries, "eaten");
    expect(Object.fromEntries([...eaten].map(([k, v]) => [k, v.map((x) => x.number)]))).toEqual({ NL: [4, 1], JP: [2] });
  });

  it("can draw every country in the add form", () => {
    expect(COUNTRIES.filter((c) => !world.shapes[c] && !world.dots[c])).toEqual([]);
  });
});
