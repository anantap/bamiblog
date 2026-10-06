import { describe, expect, it } from "vitest";
import { caption, flag, formatDate, groupEntries, padNumber } from "../src/format.js";

const e = (number, date, place = "") => ({ id: String(number), number, date, place });

describe("groupEntries", () => {
  it("sorts newest first and groups consecutive entries sharing date and place", () => {
    const groups = groupEntries([
      e(1, "2026-10-01", "Thuis"),
      e(3, "2026-10-02", "Thuis"),
      e(2, "2026-10-01", "Thuis"),
      e(4, "2026-10-02", "Kantoor"),
    ]);
    expect(groups.map((g) => [g.date, g.place, g.entries.map((x) => x.number)])).toEqual([
      ["2026-10-02", "Kantoor", [4]],
      ["2026-10-02", "Thuis", [3]],
      ["2026-10-01", "Thuis", [2, 1]],
    ]);
  });

  it("returns nothing for no entries", () => {
    expect(groupEntries([])).toEqual([]);
  });
});

describe("formatting", () => {
  it("formats dates like nice.rocks", () => {
    expect(formatDate("2026-10-06")).toBe("06/10/2026");
  });

  it("pads numbers to three digits", () => {
    expect(padNumber(7)).toBe("007");
    expect(padNumber(1234)).toBe("1234");
  });

  it("turns country codes into flags", () => {
    expect(flag("ID")).toBe("🇮🇩");
    expect(flag("")).toBe("");
  });

  it("builds the caption", () => {
    expect(caption({ brand: "Indomie", flavour: "Mi Goreng", country: "ID", rating: 4 })).toBe(
      "🇮🇩 INDOMIE — MI GORENG · ★4"
    );
    expect(caption({ brand: "Nissin", flavour: "", country: "", rating: 2 })).toBe("NISSIN · ★2");
  });
});
