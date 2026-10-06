import { describe, expect, it } from "vitest";
import { initialCrop, pan, sourceRect, zoomAt } from "../src/crop-math.js";

// All positions are in "view units": the square crop frame is 1×1.
const landscape = { width: 3000, height: 2000 };
const portrait = { width: 2000, height: 3000 };

describe("initialCrop", () => {
  it("fills the frame and centres a landscape photo", () => {
    const c = initialCrop(landscape);
    expect(c.scale).toBeCloseTo(1 / 2000);
    expect(c.x).toBeCloseTo(-0.25); // 1.5 wide, centred
    expect(c.y).toBeCloseTo(0);
  });

  it("fills the frame and centres a portrait photo", () => {
    const c = initialCrop(portrait);
    expect(c.x).toBeCloseTo(0);
    expect(c.y).toBeCloseTo(-0.25);
  });
});

describe("pan", () => {
  it("moves the photo", () => {
    const c = pan(initialCrop(landscape), 0.1, 0);
    expect(c.x).toBeCloseTo(-0.15);
  });

  it("never reveals an edge of the frame", () => {
    const c = pan(initialCrop(landscape), 5, 5);
    expect(c.x).toBeCloseTo(0);
    expect(c.y).toBeCloseTo(0);
    const d = pan(initialCrop(landscape), -5, -5);
    expect(d.x).toBeCloseTo(-0.5);
    expect(d.y).toBeCloseTo(0);
  });
});

describe("zoomAt", () => {
  it("keeps the point under the finger in place", () => {
    const before = initialCrop(landscape);
    const after = zoomAt(before, 2, 0.5, 0.5);
    const imageX = (0.5 - before.x) / before.scale;
    expect(after.x + imageX * after.scale).toBeCloseTo(0.5);
    expect(after.zoom).toBe(2);
  });

  it("clamps zoom between 1× and 5×", () => {
    expect(zoomAt(initialCrop(landscape), 0.2, 0.5, 0.5).zoom).toBe(1);
    expect(zoomAt(initialCrop(landscape), 50, 0.5, 0.5).zoom).toBe(5);
  });
});

describe("sourceRect", () => {
  it("returns the square of the original photo inside the frame", () => {
    expect(sourceRect(initialCrop(landscape))).toEqual({ sx: 500, sy: 0, size: 2000 });
  });

  it("shrinks when zoomed in", () => {
    const r = sourceRect(zoomAt(initialCrop(landscape), 2, 0.5, 0.5));
    expect(r.size).toBe(1000);
    expect(r.sx).toBe(1000);
    expect(r.sy).toBe(500);
  });
});
