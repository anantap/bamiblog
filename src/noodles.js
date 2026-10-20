// Noodles as drawn lines, shared by the family tree (src/map.js) and the thread down the page (src/story.js).
import { svg } from "./charts.js";

// A noodle along a shape (from flow or aside in src/map.js, or the thread in src/story.js): an even wiggle runs
// along it, settling at both ends, and quite often it lies in a loop. Every noodle has its own wiggle (tighter or
// lazier, flatter or bouncier) and its own loop.

export function cubic(p0, p1, p2, p3) {
  const steps = Math.max(12, Math.ceil(Math.hypot(p3[0] - p0[0], p3[1] - p0[1]) / 3));
  return Array.from({ length: steps }, (_, i) => {
    const t = (i + 1) / steps, u = 1 - t;
    return [0, 1].map((k) => u * u * u * p0[k] + 3 * u * u * t * p1[k] + 3 * u * t * t * p2[k] + t * t * t * p3[k]);
  });
}

export function noodle(base, seed) {
  const along = [0];
  for (let i = 1; i < base.length; i++) along.push(along[i - 1] + Math.hypot(base[i][0] - base[i - 1][0], base[i][1] - base[i - 1][1]));
  const length = along[along.length - 1] || 1;
  const wave = 22 + loose(seed * 2.7) * 18, amp = 1.6 + loose(seed * 4.3) * 2.2;
  // Nearly half the noodles, if they're long enough, lie in a loop somewhere along the way.
  const curl = length > 70 && loose(seed * 3.3) < 0.45 ? length * (0.3 + loose(seed * 5.1) * 0.4) : -1;
  const wiggled = [];
  base.forEach(([x, y], i) => {
    const [ax, ay] = base[Math.max(0, i - 1)], [bx, by] = base[Math.min(base.length - 1, i + 1)];
    const len = Math.hypot(bx - ax, by - ay) || 1;
    const [dx, dy, nx, ny] = [(bx - ax) / len, (by - ay) / len, -(by - ay) / len, (bx - ax) / len];
    const wiggle = amp * Math.sin((Math.PI * along[i]) / length) * Math.sin((2 * Math.PI * along[i]) / wave + seed * 1.7);
    const point = [x + nx * wiggle, y + ny * wiggle];
    wiggled.push(point);
    if (curl >= 0 && along[i] >= curl && (i === 0 || along[i - 1] < curl)) {
      // A full turn, touching the noodle here, to one side of it.
      const r = 4 + loose(seed * 7.7) * 7, side = loose(seed * 9.9) < 0.5 ? 1 : -1;
      for (let k = 1; k <= 24; k++) {
        const a = (2 * Math.PI * k) / 24;
        const ahead = r * 1.25 * Math.sin(a), out = side * r * 0.9 * (1 - Math.cos(a)); // a little oval, like a noodle
        wiggled.push([point[0] + dx * ahead + nx * out, point[1] + dy * ahead + ny * out]);
      }
    }
  });
  return svg("path", { d: `M${wiggled.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join("L")}` });
}

// The same "random" offset every time for the same number, between 0 and 1, so the tree looks hand-drawn but
// doesn't change between visits.
export const loose = (n) => {
  const x = Math.sin(n * 12.9898 + 4.1414) * 43758.5453;
  return x - Math.floor(x);
};
