import { describe, expect, it } from "vitest";
import { nextNumber } from "../lib/numbering.js";

describe("nextNumber", () => {
  it("starts at 1", () => {
    expect(nextNumber([])).toBe(1);
  });

  it("continues after the highest number", () => {
    expect(nextNumber([{ number: 2 }, { number: 7 }, { number: 3 }])).toBe(8);
  });
});
