import { describe, expect, it } from "vitest";
import { byCountry } from "../src/map-data.js";
import world from "../src/world.json";
import { COUNTRIES } from "../lib/countries.js";

const e = (number, country, date = "2026-10-01") => ({ id: String(number), number, country, date });

describe("map data", () => {
  it("groups noodles by where they're from, newest first", () => {
    const entries = [e(1, "ID"), e(2, "ID", "2026-10-05"), e(3, "JP"), e(4, "")];
    const groups = byCountry(entries);
    expect([...groups.keys()].sort()).toEqual(["ID", "JP"]);
    expect(groups.get("ID").map((x) => x.number)).toEqual([2, 1]);
  });

  it("can draw every country in the add form", () => {
    expect(COUNTRIES.filter((c) => !world.cells[c] && world.small[c] === undefined)).toEqual([]);
  });
});
