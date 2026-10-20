// Builds src/world.json: country outlines for the /map page, projected once so the browser just draws paths.
//
//     node tools/map/build.mjs
//
// Shapes come from Natural Earth (public domain) via world-atlas at the 1:110m scale. Countries too small to
// show at that scale (Singapore, Hong Kong, …) get a dot at their 1:50m centroid instead. Keys are ISO 3166-1
// alpha-2 codes, matching the noodles' `country` and the code at the end of `place`.
import { readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { geoEqualEarth, geoPath } from "d3-geo";
import countries from "i18n-iso-countries";
import { feature } from "topojson-client";

const require = createRequire(import.meta.url);
const load = (scale) => JSON.parse(readFileSync(require.resolve(`world-atlas/countries-${scale}.json`), "utf8"));
const WIDTH = 1000;

const alpha2 = (f) => countries.numericToAlpha2(f.id) ?? { Kosovo: "XK", "N. Cyprus": "CY", Somaliland: "SO" }[f.properties.name];
const features = (topo) => feature(topo, topo.objects.countries).features.filter((f) => alpha2(f) && alpha2(f) !== "AQ");

const coarse = features(load("110m"));
const fine = features(load("50m"));

const projection = geoEqualEarth().fitWidth(WIDTH, { type: "FeatureCollection", features: coarse });
const path = geoPath(projection);
const [[, top], [, bottom]] = path.bounds({ type: "FeatureCollection", features: coarse });
projection.translate([projection.translate()[0], projection.translate()[1] - top]);
const round = (d) => d.replace(/\d+\.\d+/g, (n) => Number(n).toFixed(1));

const shapes = {};
for (const f of coarse) {
  const code = alpha2(f);
  shapes[code] = (shapes[code] ?? "") + round(path(f));
}
const dots = {};
for (const f of fine) {
  const code = alpha2(f);
  if (shapes[code]) continue;
  const [x, y] = path.centroid(f);
  if (Number.isFinite(x)) dots[code] = [Math.round(x * 10) / 10, Math.round(y * 10) / 10];
}

const out = { width: WIDTH, height: Math.ceil(bottom - top), shapes, dots };
writeFileSync(new URL("../../src/world.json", import.meta.url), JSON.stringify(out));
console.log(`src/world.json: ${Object.keys(shapes).length} shapes, ${Object.keys(dots).length} dots, ${out.width}×${out.height}, ${JSON.stringify(out).length} bytes`);
