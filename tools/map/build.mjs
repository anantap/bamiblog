// Builds src/world.json: the world map on /bamiversary/, made of noodle-brick blocks, worked out once here so the browser
// only draws rectangles.
//
//     node tools/map/build.mjs
//
// Shapes come from Natural Earth (public domain) via world-atlas at the 1:110m scale, in the Equal Earth
// projection. Each block of a grid goes to the country under its centre. Countries too small to get a block
// (Singapore, Hong Kong, …) get one at their centroid in `small`, which the page only draws when they have
// noodles. Keys are ISO 3166-1 alpha-2 codes, matching the noodles' `country` and the end of `place`.
import { readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { geoBounds, geoContains, geoEqualEarth, geoPath } from "d3-geo";
import countries from "i18n-iso-countries";
import { feature } from "topojson-client";

const COLS = 72; // blocks across: coarse, so each brick is big enough to tap
const BRICK = 1.4; // a block is this much wider than tall, like a noodle brick
const WIDTH = 1000;

const require = createRequire(import.meta.url);
const load = (scale) => JSON.parse(readFileSync(require.resolve(`world-atlas/countries-${scale}.json`), "utf8"));
const alpha2 = (f) => countries.numericToAlpha2(f.id) ?? { Kosovo: "XK", "N. Cyprus": "CY", Somaliland: "SO" }[f.properties.name];
const features = (topo) => feature(topo, topo.objects.countries).features.filter((f) => alpha2(f) && alpha2(f) !== "AQ");

const coarse = features(load("110m"));
const fine = features(load("50m"));
const projection = geoEqualEarth().fitWidth(WIDTH, { type: "FeatureCollection", features: coarse });
const [[, top], [, bottom]] = geoPath(projection).bounds({ type: "FeatureCollection", features: coarse });

const cellW = WIDTH / COLS;
const cellH = cellW / BRICK;
const rows = Math.ceil((bottom - top) / cellH);
const boxes = coarse.map((f) => ({ code: alpha2(f), f, box: geoBounds(f) }));
const inBox = ([lon, lat], [[w, s], [e, n]]) => lat >= s && lat <= n && (w <= e ? lon >= w && lon <= e : lon >= w || lon <= e);

const cells = {};
for (let row = 0; row < rows; row++) {
  for (let col = 0; col < COLS; col++) {
    const point = projection.invert([(col + 0.5) * cellW, top + (row + 0.5) * cellH]);
    if (!point || !Number.isFinite(point[0])) continue;
    const hit = boxes.find(({ f, box }) => inBox(point, box) && geoContains(f, point));
    if (hit) (cells[hit.code] ??= []).push(row * COLS + col);
  }
}

// Small neighbours (the Netherlands and Belgium, say) can land on the same block; the later one moves to the
// free block nearest its real centroid.
const small = {};
const taken = new Set();
for (const f of fine) {
  const code = alpha2(f);
  if (cells[code] || small[code] !== undefined) continue;
  const [x, y] = geoPath(projection).centroid(f);
  if (!Number.isFinite(x)) continue;
  const fx = x / cellW - 0.5;
  const fy = (y - top) / cellH - 0.5;
  const candidates = [];
  for (let dy = -2; dy <= 2; dy++) {
    for (let dx = -2; dx <= 2; dx++) {
      const col = Math.round(fx) + dx;
      const row = Math.round(fy) + dy;
      if (col < 0 || col >= COLS || row < 0 || row >= rows) continue;
      candidates.push({ i: row * COLS + col, d: (col - fx) ** 2 + ((row - fy) * cellH / cellW) ** 2 });
    }
  }
  const free = candidates.filter((c) => !taken.has(c.i)).sort((a, b) => a.d - b.d)[0];
  if (!free) continue;
  small[code] = free.i;
  taken.add(free.i);
}

const out = { cols: COLS, rows, cellW: +cellW.toFixed(3), cellH: +cellH.toFixed(3), cells, small };
writeFileSync(new URL("../../src/world.json", import.meta.url), JSON.stringify(out));
const blocks = Object.values(cells).reduce((n, list) => n + list.length, 0);
console.log(`src/world.json: ${COLS}×${rows} grid, ${blocks} blocks in ${Object.keys(cells).length} countries, ${Object.keys(small).length} small, ${JSON.stringify(out).length} bytes`);
