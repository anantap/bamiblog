// Bakes softened lettering into plain paths: browsers draw the --soft filter at screen resolution, which leaves
// stair-stepped edges, so instead the rounding is traced once here, finely, into smooth outlines.
//
//     node tools/lettering/trace.mjs public/lettering/bamiversary.svg
//
// Each letter is drawn on its own, blurred but not yet sharpened, at SCALE pixels per logo unit. The edge the
// filter would make is where that blur crosses LEVEL, and marching squares follows that line between pixels.
// Needs Playwright with Chromium (found in the project or the global node_modules).
import { createRequire } from "node:module";
import { execSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";

const SCALE = 8;
const LEVEL = 11.5 / 24; // the soft filter's alpha curve (24a - 11) crosses one half here
const TOLERANCE = 0.06; // in logo units: how far the simplified outline may stray from the traced one

const require = createRequire(import.meta.url);
function playwright() {
  try {
    return require("playwright");
  } catch {
    return createRequire(`${execSync("npm root -g").toString().trim()}/`)("playwright");
  }
}

// Every closed line where the field crosses LEVEL, in pixel coordinates.
function contours(field, w, h) {
  const at = (x, y) => (x < 0 || y < 0 || x >= w || y >= h ? 0 : field[y * w + x]);
  const point = (x0, y0, x1, y1) => {
    const a = at(x0, y0), b = at(x1, y1), t = (LEVEL - a) / (b - a);
    return [x0 + (x1 - x0) * t, y0 + (y1 - y0) * t];
  };
  // Cell edges, named so neighbouring cells agree: top/bottom are horizontal "h", left/right vertical "v".
  const edges = { t: (x, y) => `h${x},${y}`, b: (x, y) => `h${x},${y + 1}`, l: (x, y) => `v${x},${y}`, r: (x, y) => `v${x + 1},${y}` };
  const where = {
    t: (x, y) => point(x, y, x + 1, y),
    b: (x, y) => point(x, y + 1, x + 1, y + 1),
    l: (x, y) => point(x, y, x, y + 1),
    r: (x, y) => point(x + 1, y, x + 1, y + 1),
  };
  // Inside on the left of travel, so outer edges and holes wind opposite ways.
  const CASES = { 1: [["l", "b"]], 2: [["b", "r"]], 3: [["l", "r"]], 4: [["r", "t"]], 6: [["b", "t"]], 7: [["l", "t"]], 8: [["t", "l"]], 9: [["t", "b"]], 11: [["t", "r"]], 12: [["r", "l"]], 13: [["r", "b"]], 14: [["b", "l"]] };
  const next = new Map(), pos = new Map();
  for (let y = -1; y < h; y++) {
    for (let x = -1; x < w; x++) {
      const tl = at(x, y) > LEVEL, tr = at(x + 1, y) > LEVEL, br = at(x + 1, y + 1) > LEVEL, bl = at(x, y + 1) > LEVEL;
      const code = (tl ? 8 : 0) | (tr ? 4 : 0) | (br ? 2 : 0) | (bl ? 1 : 0);
      let pairs = CASES[code];
      if (code === 5 || code === 10) {
        const joined = (at(x, y) + at(x + 1, y) + at(x + 1, y + 1) + at(x, y + 1)) / 4 > LEVEL;
        pairs = code === 5 ? (joined ? [["l", "t"], ["r", "b"]] : [["l", "b"], ["r", "t"]]) : joined ? [["b", "l"], ["t", "r"]] : [["t", "l"], ["b", "r"]];
      }
      for (const [from, to] of pairs ?? []) {
        const a = edges[from](x, y), b = edges[to](x, y);
        next.set(a, b);
        pos.set(a, where[from](x, y));
        pos.set(b, where[to](x, y));
      }
    }
  }
  const lines = [];
  for (const start of next.keys()) {
    if (!next.has(start)) continue;
    const line = [];
    for (let id = start; next.has(id); ) {
      line.push(pos.get(id));
      const to = next.get(id);
      next.delete(id);
      id = to;
    }
    lines.push(line);
  }
  return lines;
}

// Ramer–Douglas–Peucker on a closed line.
function simplify(points, tolerance) {
  const keep = new Uint8Array(points.length);
  const run = (a, b) => {
    const [ax, ay] = points[a], [bx, by] = points[b], len = Math.hypot(bx - ax, by - ay) || 1;
    let far = -1, worst = tolerance;
    for (let i = a + 1; i < b; i++) {
      const d = Math.abs((bx - ax) * (ay - points[i][1]) - (ax - points[i][0]) * (by - ay)) / len;
      if (d > worst) (worst = d), (far = i);
    }
    if (far < 0) return;
    keep[far] = 1;
    run(a, far);
    run(far, b);
  };
  const half = points.length >> 1;
  keep[0] = keep[half] = 1;
  run(0, half);
  run(half, points.length - 1);
  keep[points.length - 1] = 1;
  return points.filter((_, i) => keep[i]);
}

// A closed line as one smooth curve: each point steers a curve that runs between the midpoints around it.
function curve(points) {
  const n = points.length, f = (v) => v.toFixed(2).replace(/\.?0+$/, "");
  const mid = (i) => points[i % n].map((v, k) => (v + points[(i + 1) % n][k]) / 2);
  let d = `M${mid(n - 1).map(f).join(" ")}`;
  for (let i = 0; i < n; i++) d += `Q${points[i].map(f).join(" ")} ${mid(i).map(f).join(" ")}`;
  return `${d}Z`;
}

const [file, out = file] = process.argv.slice(2);
const svg = readFileSync(file, "utf8");
const [vx, vy, vw, vh] = svg.match(/viewBox="([^"]+)"/)[1].split(" ").map(Number);
const fill = svg.match(/<g fill="([^"]+)"/)[1];
const W = Math.ceil(vw * SCALE), H = Math.ceil(vh * SCALE);
const blurOnly = svg.replace(/<feColorMatrix[^>]*\/>/, "");

const browser = await playwright().chromium.launch();
const page = await browser.newPage();
const fields = await page.evaluate(
  async ([svg, W, H]) => {
    const doc = new DOMParser().parseFromString(svg, "image/svg+xml");
    const count = doc.querySelectorAll(".letter").length, out = [];
    for (let keep = 0; keep < count; keep++) {
      const d = new DOMParser().parseFromString(svg, "image/svg+xml");
      d.querySelectorAll(".letter").forEach((g, i) => i !== keep && g.remove());
      d.documentElement.setAttribute("width", W);
      d.documentElement.setAttribute("height", H);
      const img = new Image();
      img.src = URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(d)], { type: "image/svg+xml" }));
      await img.decode();
      const c = new OffscreenCanvas(W, H), x = c.getContext("2d");
      x.drawImage(img, 0, 0, W, H);
      const data = x.getImageData(0, 0, W, H).data;
      let alpha = "";
      for (let i = 3; i < data.length; i += 4) alpha += String.fromCharCode(data[i]);
      out.push(btoa(alpha)); // a string crosses back to Node far faster than an array
    }
    return out;
  },
  [blurOnly, W, H],
);
await browser.close();

const paths = fields.map((alpha) => {
  const field = Float32Array.from(Buffer.from(alpha, "base64"), (a) => a / 255);
  return contours(field, W, H)
    .filter((line) => line.length > 8)
    .map((line) => curve(simplify(line, TOLERANCE * SCALE).map(([x, y]) => [vx + x / SCALE, vy + y / SCALE])))
    .join("");
});
const label = svg.match(/aria-label="([^"]*)"/)[1];
writeFileSync(
  out,
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${[vx, vy, vw, vh].join(" ")}" role="img" aria-label="${label}">` +
    `<g fill="${fill}" fill-rule="evenodd">${paths.map((d) => `<path d="${d}"/>`).join("")}</g></svg>\n`,
);
console.log(`${out}: ${paths.length} letters traced`);
