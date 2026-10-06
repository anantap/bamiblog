import { describe, expect, it } from "vitest";
import { FILL, initialBox, moveBox, resizeBox, squareAround } from "../src/crop-math.js";

// Boxes are in photo pixels.
const photo = { width: 3000, height: 2000 };

describe("initialBox", () => {
  it("starts centred at 60% of the photo", () => {
    expect(initialBox(photo)).toEqual({ x: 600, y: 400, w: 1800, h: 1200 });
  });
});

describe("moveBox", () => {
  it("moves the box", () => {
    expect(moveBox({ x: 100, y: 100, w: 500, h: 300 }, 50, -20, photo)).toEqual({ x: 150, y: 80, w: 500, h: 300 });
  });

  it("keeps the box inside the photo", () => {
    expect(moveBox({ x: 100, y: 100, w: 500, h: 300 }, -999, 9999, photo)).toEqual({ x: 0, y: 1700, w: 500, h: 300 });
  });
});

describe("resizeBox", () => {
  const box = { x: 1000, y: 500, w: 1000, h: 800 };

  it("drags the bottom-right corner", () => {
    expect(resizeBox(box, "se", 200, -100, photo)).toEqual({ x: 1000, y: 500, w: 1200, h: 700 });
  });

  it("drags the top-left corner, keeping the opposite corner fixed", () => {
    expect(resizeBox(box, "nw", -100, 100, photo)).toEqual({ x: 900, y: 600, w: 1100, h: 700 });
  });

  it("stops at the photo's edges", () => {
    expect(resizeBox(box, "ne", 9999, -9999, photo)).toEqual({ x: 1000, y: 0, w: 2000, h: 1300 });
  });

  it("never gets smaller than 5% of the photo's short side", () => {
    const r = resizeBox(box, "se", -9999, -9999, photo);
    expect(r.w).toBe(100);
    expect(r.h).toBe(100);
  });
});

describe("squareAround", () => {
  it("centres the box in a square where its long side fills 84%", () => {
    const s = squareAround({ x: 1000, y: 600, w: 840, h: 420 });
    expect(FILL).toBe(0.84);
    expect(s.size).toBeCloseTo(1000);
    expect(s.sx).toBeCloseTo(920);
    expect(s.sy).toBeCloseTo(310);
  });

  it("uses the taller side for portrait boxes", () => {
    expect(squareAround({ x: 0, y: 0, w: 210, h: 420 }).size).toBeCloseTo(500);
  });
});
