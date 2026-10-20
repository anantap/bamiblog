import { api, h } from "./dom.js";
import { brands, facts } from "./facts.js";
import { svg, treemap } from "./charts.js";
import { byCountry } from "./map-data.js";
import { tell } from "./story.js";
import { everyPack } from "./every-pack.js";
import world from "./world.json";

const names = new Intl.DisplayNames(["en"], { type: "region" });
const page = document.querySelector(".map-page");
const mapEl = document.getElementById("map");
const summary = document.getElementById("summary");


// The intro (see the page): once its images are ready, red fades in over the blank page with the title in white
// in the middle, the title glides up into place, and the red fades away over the real title.
const intro = document.querySelector(".intro");
if (document.documentElement.classList.contains("intro-on")) {
  const done = () => document.documentElement.classList.remove("intro-on");
  intro.addEventListener("animationend", (event) => event.target === intro && done());
  Promise.all([...intro.querySelectorAll("img")].map((img) => img.decode())).then(() => intro.classList.add("play"), done);
}

let entries = [];

// The map is drawn three times side by side and kept on the middle copy, so it loops: whatever is picked can sit in
// the middle of the screen, and scrolling never reaches an end.
const copy = () => mapEl.scrollWidth / 3;

function recentre() {
  const w = copy();
  const jump = mapEl.scrollLeft < w / 2 ? w : mapEl.scrollLeft > w * 1.5 ? -w : 0;
  if (!jump) return;
  mapEl.scrollLeft += jump;
  if (at !== null) at += jump; // the drift carries on from the same spot
}

// Start with these countries in the middle of the screen.
function focusOn(codes) {
  const columns = codes.flatMap((code) => world.cells[code] ?? [world.small[code]]).filter((i) => i !== undefined).map((i) => i % world.cols);
  if (!columns.length) columns.push(world.cols / 2);
  const w = copy();
  mapEl.scrollLeft = w + ((Math.min(...columns) + Math.max(...columns) + 1) / 2 / world.cols) * w - mapEl.clientWidth / 2;
}

// The map drifts from right to left like a ticker, round and round. It only waits while someone
// holds, drags or scrolls it, and drifts on as soon as the scroll has glided to a stop; with less motion asked for,
// it stays put.
const DRIFT = 20; // pixels a second
const still = matchMedia("(prefers-reduced-motion: reduce)");
let held = false, restUntil = 0, at = null, before = 0;

function rest(ms) {
  restUntil = performance.now() + ms;
}

function drift(now) {
  const seconds = before ? Math.min(0.1, (now - before) / 1000) : 0;
  before = now;
  if (!still.matches && !held && now > restUntil && mapEl.scrollWidth > mapEl.clientWidth) {
    if (at === null || Math.abs(at - mapEl.scrollLeft) > 2) at = mapEl.scrollLeft; // moved by hand
    at += DRIFT * seconds;
    mapEl.scrollLeft = at;
  }
  requestAnimationFrame(drift);
}
requestAnimationFrame(drift);

for (const type of ["pointerdown", "touchstart"]) mapEl.addEventListener(type, () => (held = true), { passive: true });
for (const type of ["pointerup", "pointercancel", "touchend"]) addEventListener(type, () => (held = false), { passive: true });

// A scroll the drift didn't make (a swipe gliding on, a trackpad, a wheel) gets a moment to finish first.
mapEl.addEventListener("scroll", () => {
  recentre();
  if (at !== null && Math.abs(mapEl.scrollLeft - at) > 2) rest(200);
}, { passive: true });

// Mice can drag the map sideways too.
mapEl.addEventListener("pointerdown", (event) => {
  if (event.pointerType !== "mouse") return;
  const start = event.clientX, from = mapEl.scrollLeft;
  const move = (e) => (mapEl.scrollLeft = from - (e.clientX - start));
  const up = () => removeEventListener("pointermove", move);
  addEventListener("pointermove", move);
  addEventListener("pointerup", up, { once: true });
});

const GAP = world.cellW * 0.14; // white space between blocks

// One country as a single path of noodle-brick blocks.
function country(code, groups) {
  const w = (world.cellW - GAP).toFixed(2), hgt = (world.cellH - GAP).toFixed(2);
  const d = (world.cells[code] ?? [world.small[code]])
    .map((i) => `M${((i % world.cols) * world.cellW).toFixed(2)} ${(Math.floor(i / world.cols) * world.cellH).toFixed(2)}h${w}v${hgt}h-${w}z`)
    .join("");
  const el = svg("path", { d });
  el.classList.toggle("has", groups.has(code));
  return el;
}

// Over each noodle country, a label with how many packs came from it: on its block nearest the middle of its blocks,
// the busiest country's first, and nudged down (or up) off any label already there. Labels are drawn the same size on
// screen whatever the map's size, so they're drawn again when that changes.
const LABEL = { h: 20, pad: 6, char: 7.2, font: 12 }; // in screen pixels; DM Mono at 12px is 7.2px a character

function count() {
  const map = mapEl.querySelector("svg");
  if (!map) return;
  map.querySelectorAll(".counts").forEach((g) => g.remove());
  const width = world.cols * world.cellW;
  const unit = (3 * width) / map.getBoundingClientRect().width || 1; // map units in a screen pixel
  const tall = LABEL.h * unit;
  const placed = [];
  const labels = svg("g", { class: "counts" });
  for (const [code, list] of [...byCountry(entries)].sort((a, b) => b[1].length - a[1].length)) {
    const blocks = (world.cells[code] ?? [world.small[code]]).filter((i) => i !== undefined)
      .map((i) => [((i % world.cols) + 0.5) * world.cellW, (Math.floor(i / world.cols) + 0.5) * world.cellH]);
    if (!blocks.length) continue;
    const mx = blocks.reduce((n, [x]) => n + x, 0) / blocks.length, my = blocks.reduce((n, [, y]) => n + y, 0) / blocks.length;
    const [x, y0] = blocks.reduce((best, b) => (Math.hypot(b[0] - mx, b[1] - my) < Math.hypot(best[0] - mx, best[1] - my) ? b : best));
    const text = list.length.toLocaleString("en");
    const w = (text.length * LABEL.char + 2 * LABEL.pad) * unit;
    const clear = (y) => placed.every((r) => Math.abs(r.x - x) >= (r.w + w) / 2 + unit || Math.abs(r.y - y) >= tall + unit);
    const y = [0, 1, -1, 2, -2, 3, -3].map((k) => y0 + k * (tall + unit)).find(clear) ?? y0;
    placed.push({ x, y, w });
    const label = svg("g");
    label.append(svg("title", {}, `${names.of(code)}: ${list.length} ${list.length === 1 ? "pack" : "packs"}`));
    label.append(svg("rect", { x: x - w / 2, y: y - tall / 2, width: w, height: tall }));
    label.append(svg("text", { x, y: y + LABEL.font * 0.35 * unit, style: `font-size: ${LABEL.font * unit}px` }, text));
    labels.append(label);
  }
  // On every copy of the map.
  [0, 1, 2].forEach((n) => {
    const copy = labels.cloneNode(true);
    copy.setAttribute("transform", `translate(${(n * width).toFixed(2)} 0)`);
    map.append(copy);
  });
}

function render() {
  const groups = byCountry(entries);
  const width = world.cols * world.cellW;
  const height = world.rows * world.cellH - GAP;
  const map = svg("svg", { viewBox: `0 0 ${(3 * width).toFixed(2)} ${height.toFixed(2)}`, role: "img", "aria-label": "World map" });
  const earth = svg("g", { id: "earth" });
  for (const code of Object.keys(world.cells)) earth.append(country(code, groups));
  // Countries too small for a block only get one when they have noodles, drawn last so it sits on top.
  for (const code of Object.keys(world.small)) if (groups.has(code)) earth.append(country(code, groups));
  // Three real copies, side by side.
  const copies = [1, 2].map((n) => Object.assign(earth.cloneNode(true), { id: "" }));
  copies.forEach((c, n) => c.setAttribute("transform", `translate(${((n + 1) * width).toFixed(2)} 0)`));
  map.append(earth, ...copies);
  mapEl.replaceChildren(map);
  focusOn([...groups.keys()]);

  const counted = [...groups.values()].reduce((n, list) => n + list.length, 0);
  summary.textContent = counted ? "" : "No noodles yet."; // with noodles, the story's sentence above says it
}

// The fact sheet under the lettering: 1 year, then the totals.
function renderFacts() {
  const { packs, flavours, meters, liters } = facts(entries);
  const number = (n) => n.toLocaleString("en");
  document.getElementById("facts").replaceChildren(
    ...[
      ["time", "1 year."],
      ["packs", `${number(packs)} ${packs === 1 ? "pack" : "packs"} of noodles.`],
      ["flavours", `${number(flavours)} different ${flavours === 1 ? "flavour" : "flavours"}.`],
      ["length", `${number(meters)} meters of noodles.`],
      ["soup", `${number(liters)} liters of soup.`],
    ].map(([label, value]) => h("div", {}, h("dt", {}, label), h("dd", {}, value)))
  );
}

// The treemap is drawn to fill its box, so it's drawn again when the page changes width.
function renderCharts() {
  document.getElementById("estate-panel").hidden = !entries.length;
  if (entries.length) treemap(document.getElementById("estate"), entries);
}

let lastWidth = 0;
new ResizeObserver(() => {
  if (!entries.length || innerWidth === lastWidth) return;
  lastWidth = innerWidth;
  renderCharts();
  count();
}).observe(document.body);

// Every brand with its flavours as a loose, hand-drawn-looking family tree on noodles: "bami" (in the logo's
// lettering) at the top, a noodle from it to each brand (side by side on wide screens, one below the other on
// phones), and each brand's flavours hanging below it, stepping in and out.
const wide = matchMedia("(min-width: 768px)");
const PILL = { h: 22, pad: 10, char: 7.2 }; // DM Mono at 12px is 7.2px a character
const ROW = 32; // flavours hang this far apart
const COLUMN_GAP = 28;

const LINE = 14; // extra height for each extra line in a pill
const MAX_CHARS = 22; // a flavour longer than this goes onto more lines

// A pill's lines (long flavours wrap at MAX_CHARS, between words), and its width and height.
function measure(text, wraps) {
  const lines = [];
  for (const word of wraps ? text.split(" ") : [text]) {
    const last = lines.length - 1;
    if (last >= 0 && `${lines[last]} ${word}`.length <= MAX_CHARS) lines[last] += ` ${word}`;
    else lines.push(word);
  }
  return { lines, w: Math.max(...lines.map((l) => l.length)) * PILL.char + 2 * PILL.pad, h: PILL.h + (lines.length - 1) * LINE };
}

// A pill with its left end at x, its middle at y.
function pill(x, y, text, cls) {
  const { lines, w, h } = measure(text, cls === "flavour");
  const g = svg("g", { class: cls });
  const label = svg("text", { x: x + w / 2, y: y + 4 - ((lines.length - 1) * LINE) / 2 });
  lines.forEach((line, i) => label.append(svg("tspan", { x: x + w / 2, dy: i ? LINE : 0 }, line)));
  g.append(svg("rect", { x, y: y - h / 2, width: w, height: h }), label);
  return { g, w, h };
}

// "bami" in the logo's own shapes (tools/lettering).
const BAMI = { w: 72, h: 57 }; // public/lettering/bami.svg is 167.6 × 132

// A noodle along a shape (from flow or aside below): an even wiggle runs along it, settling at both ends, and quite
// often it lies in a loop. Every noodle has its own wiggle (tighter or lazier, flatter or bouncier) and its own loop.

function cubic(p0, p1, p2, p3) {
  const steps = Math.max(12, Math.ceil(Math.hypot(p3[0] - p0[0], p3[1] - p0[1]) / 3));
  return Array.from({ length: steps }, (_, i) => {
    const t = (i + 1) / steps, u = 1 - t;
    return [0, 1].map((k) => u * u * u * p0[k] + 3 * u * u * t * p1[k] + 3 * u * t * t * p2[k] + t * t * t * p3[k]);
  });
}

// The shape of a noodle from a to b in one smooth curve: down out of its parent, and into b from above, or with
// `across` from the left.
function flow([x1, y1], [x2, y2], across = false) {
  const drop = y2 - y1;
  const c2 = across ? [x2 - Math.max(16, (x2 - x1) * 0.6), y2] : [x2, y2 - drop * 0.55];
  return [[x1, y1], ...cubic([x1, y1], [x1, y1 + drop * (across ? 0.75 : 0.55)], c2, [x2, y2])];
}

// The shape of a noodle from a, out to the side and down a lane at x = lane, then into b from that side (b is the
// end of a pill facing the lane): for brands hanging one below the other, so it passes the ones above without
// crossing them.
function aside([x1, y1], lane, [x2, y2]) {
  const out = y1 + 60, into = y2 - 24, side = lane < x2 ? -1 : 1;
  if (into < out) return flow([x1, y1], [x2, y2], true);
  return [[x1, y1], ...cubic([x1, y1], [x1, y1 + 40], [lane, y1 + 20], [lane, out]), ...cubic([lane, out], [lane, out], [lane, into], [lane, into]), ...cubic([lane, into], [lane, y2 - 6], [x2 + side * 12, y2], [x2, y2])];
}

function noodle(base, seed) {
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
const loose = (n) => {
  const x = Math.sin(n * 12.9898 + 4.1414) * 43758.5453;
  return x - Math.floor(x);
};

function renderBrands() {
  const all = brands(entries);
  const holder = document.getElementById("brands");
  document.getElementById("brands-panel").hidden = !all.length;
  if (!all.length) return;

  // Lay it out loosely first: brands at slightly different heights, flavours wandering in and out below them. Their
  // noodles fan out along the bottom of the brand, the top flavour's from the right and the lowest's from the left,
  // and every flavour sits to the right of its own noodle, so no noodle runs through a pill.
  const width = (text, wraps = false) => measure(text, wraps).w;
  const extra = (text) => measure(text, true).h - PILL.h; // a flavour on more lines needs more room
  const STEPS = [0, 22, 8, 30, 14];
  const plan = all.map(({ brand, flavours }, i) => {
    const brandX = loose(i * 7 + 3) * 10;
    const brandY = BAMI.h + 64 + loose(i * 7 + 1) * 40;
    const span = Math.max(0, width(brand) - 24); // the bottom of the brand, less its round ends
    let y = brandY, before = 0;
    const leaves = flavours.map(({ flavour }, j) => {
      const text = flavour || "no flavour";
      y += ROW * (0.9 + loose(i * 31 + j * 5) * 0.5) + (before + extra(text)) / 2;
      before = extra(text);
      const from = brandX + 12 + (flavours.length > 1 ? span * (1 - j / (flavours.length - 1)) : span / 2);
      return { text, from, x: from + 18 + STEPS[j % STEPS.length] * 0.7 + loose(i * 31 + j * 5 + 1) * 16, y, below: extra(text) / 2 };
    });
    const w = Math.max(brandX + width(brand), ...leaves.map((l) => l.x + width(l.text, true)));
    return { brand, brandX, brandY, leaves, w };
  });
  const lines = svg("g", { class: "branches" });
  const pills = svg("g");
  let seed = 0, bottom = 0, minX, maxX, middle;
  // The brands' noodles leave "bami" side by side, like a bundle.
  const bundle = (k, n) => (k - (n - 1) / 2) * 3;
  // Draws a brand and its flavours; with `mirror` (= the width to mirror in) it's flipped left to right, flavours
  // fanning out to the left and their noodles coming into their right ends.
  const draw = (left, top, { brand, brandX, brandY, leaves }, from, mirror = 0) => {
    const flip = (points) => (mirror ? points.map(([x, y]) => [mirror - x, y]) : points);
    const at = (x, text, wraps) => (mirror ? mirror - x - width(text, wraps) : x);
    const label = pill(at(left + brandX, brand), top + brandY, brand, "brand");
    lines.append(noodle(flip(from(label)), seed++));
    pills.append(label.g);
    for (const leaf of leaves) {
      const p = pill(at(left + leaf.x, leaf.text, true), top + leaf.y, leaf.text, "flavour");
      lines.append(noodle(flip(flow([left + leaf.from, top + brandY + PILL.h / 2 - 1], [left + leaf.x, top + leaf.y], true)), seed++));
      pills.append(p.g);
    }
    bottom = Math.max(bottom, top + brandY, ...leaves.map((l) => top + l.y + l.below));
  };
  if (wide.matches) {
    // Side by side under "bami", like a family tree.
    const total = plan.reduce((n, p) => n + p.w, 0) + COLUMN_GAP * (plan.length - 1);
    let left = -total / 2;
    plan.forEach((p, i) => {
      draw(left, 0, p, (label) => flow([bundle(i, plan.length), BAMI.h + 6], [left + p.brandX + label.w / 2, p.brandY - PILL.h / 2]));
      left += p.w + COLUMN_GAP;
    });
    [minX, maxX, middle] = [-Math.max(total, BAMI.w) / 2, Math.max(total, BAMI.w) / 2, 0];
  } else {
    // On phones the tree is turned sideways: brands one below the other, every other one at the left (its
    // flavours fanning out to the right) or the right (fanning out to the left), and "bami" still in the middle at
    // the top. A brand's noodle swings out to a lane down its own edge and comes into the brand's outer end, so it
    // passes the brands above without crossing them.
    const lane = 6, left = 16;
    const w = Math.max(BAMI.w + 2 * left, ...plan.map((p) => 2 * left + p.w));
    middle = w / 2;
    let top = BAMI.h + 64; // below where the noodles swing out to the lanes
    plan.forEach((p, i) => {
      const lift = p.brandY - (BAMI.h + 64); // its own little offset, from the wide layout
      const y = top + lift * 0.4;
      const right = i % 2 === 1;
      // Worked out as if on the left; drawn flipped for the right.
      const start = right ? w - (middle + bundle(i, plan.length)) : middle + bundle(i, plan.length);
      draw(left, y - p.brandY + PILL.h, p, () => aside([start, BAMI.h + 6], lane + (i % 3) * 3, [left + p.brandX, y + PILL.h]), right ? w : 0);
      top = Math.max(y + PILL.h, ...p.leaves.map((l) => y - p.brandY + PILL.h + l.y + l.below)) + ROW;
    });
    [minX, maxX] = [0, w];
  }
  pills.append(svg("image", { href: "/lettering/bami.svg", x: middle - BAMI.w / 2, y: 0, width: BAMI.w, height: BAMI.h }));
  const reach = maxX - minX + 8, height = bottom + PILL.h / 2 + 4;
  const map = svg("svg", {
    viewBox: `${minX - 4} -2 ${reach} ${height + 2}`,
    width: reach,
    role: "img",
    "aria-label": all.map((b) => `${b.brand}: ${b.flavours.map((f) => f.flavour || "no flavour").join(", ")}`).join("; "),
  });
  map.style.setProperty("--natural", `${reach}px`);
  map.append(lines, pills);
  holder.replaceChildren(map);
  holder.scrollLeft = (holder.scrollWidth - holder.clientWidth) / 2; // start in the middle, under "bami"
}

wide.addEventListener("change", () => entries.length && renderBrands());

api("/api/entries")
  .then((list) => {
    entries = list;
    tell(entries); // first, so the parts are drawn to fit around their sentences
    renderFacts();
    renderBrands();
    render();
    lastWidth = innerWidth;
    renderCharts();
    count();
    everyPack(document.getElementById("every"), entries);
  })
  .catch((err) => (summary.textContent = `Couldn't load the noodles: ${err.message}`))
  .finally(() => page.setAttribute("aria-busy", "false"));
