import { describe, expect, it } from "vitest";
import { isSpecial, nextNumber } from "../lib/numbering.js";

describe("nextNumber", () => {
  it("starts at 1", () => {
    expect(nextNumber([])).toBe(1);
  });

  it("continues after the highest number", () => {
    expect(nextNumber([{ number: 2 }, { number: 7 }, { number: 3 }])).toBe(8);
  });
});

describe("isSpecial", () => {
  it("is every hundredth noodle", () => {
    expect([99, 100, 101, 200, 0].map(isSpecial)).toEqual([false, true, false, true, false]);
  });
});
