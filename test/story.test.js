import { describe, expect, it } from "vitest";
import { storyLines } from "../src/story.js";

const pack = (number, date, brand, flavour, country) => ({ number, date, brand, flavour, country });

describe("storyLines", () => {
  it("tells the year from the first pack to the latest", () => {
    const lines = storyLines([
      pack(3, "2026-03-01", "Nongshim", "Shin Ramyun", "KR"),
      pack(1, "2025-10-07", "Indomie", "Mi Goreng", "ID"),
      pack(2, "2025-11-02", "Indomie", "Soto Mie", "ID"),
      pack(4, "2026-10-03", "Indomie", "Mi Goreng", "ID"),
    ]);
    expect(lines.start).toBe("it started on 07.10.25, with one pack of Indomie Mi Goreng.");
    expect(lines.map).toBe("then they came from 2 countries, most of them from Indonesia.");
    expect(lines.brands).toBe("2 brands, 3 flavours. some only once, some again and again.");
    expect(lines.estate).toBe("Indomie alone took up 75% of the year.");
    expect(lines.strip).toBe("and here they all are, 4 packs in a row.");
    expect(lines.end).toBe("3 packs later, on 03.10.26: Indomie Mi Goreng.");
  });

  it("says when no country has more than half", () => {
    const lines = storyLines([pack(1, "2025-10-07", "Mama", "Tom Yum", "TH"), pack(2, "2025-10-08", "Nissin", "", "JP"), pack(3, "2025-10-09", "Nissin", "", "JP"), pack(4, "2025-10-10", "Shin", "", "KR")]);
    expect(lines.map).toBe("then they came from 3 countries, the most from Japan.");
  });

  it("has no ending with only one pack, and nothing at all without noodles", () => {
    const lines = storyLines([pack(1, "2025-10-07", "Indomie", "", "ID")]);
    expect(lines.map).toBe("all of them came from Indonesia.");
    expect(lines.brands).toBe("1 brand, 1 flavour. never the same brand twice.");
    expect(lines.estate).toBe("Indomie took up the whole year.");
    expect(lines.end).toBe("");
    expect(storyLines([])).toBeNull();
  });
});
