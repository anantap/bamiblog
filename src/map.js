import { api, h } from "./dom.js";
import { flag, formatDate } from "./format.js";
import { brands, facts } from "./facts.js";
import { svg, treemap } from "./charts.js";
import { strip } from "./strip.js";
import { byCountry } from "./map-data.js";
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
  if (mapEl.scrollLeft < w / 2) mapEl.scrollLeft += w;
  else if (mapEl.scrollLeft > w * 1.5) mapEl.scrollLeft -= w;
}

// Start with these countries in the middle of the screen.
function focusOn(codes) {
  const columns = codes.flatMap((code) => world.cells[code] ?? [world.small[code]]).filter((i) => i !== undefined).map((i) => i % world.cols);
  if (!columns.length) columns.push(world.cols / 2);
  const w = copy();
  mapEl.scrollLeft = w + ((Math.min(...columns) + Math.max(...columns) + 1) / 2 / world.cols) * w - mapEl.clientWidth / 2;
}

// The map drifts from right to left like a ticker, round and round. It stops while someone holds, drags or
// scrolls it, and for a moment after; with less motion asked for, it stays put.
const DRIFT = 20; // pixels a second
const still = matchMedia("(prefers-reduced-motion: reduce)");
let held = false, hovered = false, restUntil = 0, at = null, before = 0;

function rest(ms) {
  restUntil = performance.now() + ms;
}

function drift(now) {
  const seconds = before ? Math.min(0.1, (now - before) / 1000) : 0;
  before = now;
  if (!still.matches && !held && !hovered && now > restUntil && mapEl.scrollWidth > mapEl.clientWidth) {
    if (at === null || Math.abs(at - mapEl.scrollLeft) > 2) at = mapEl.scrollLeft; // moved by hand, or looped
    at += DRIFT * seconds;
    mapEl.scrollLeft = at;
    if (wide.matches) hideCard(); // a card beside a country goes once the map moves on (under it, it stays)
  }
  requestAnimationFrame(drift);
}
requestAnimationFrame(drift);

for (const type of ["pointerdown", "touchstart"]) mapEl.addEventListener(type, () => (held = true), { passive: true });
for (const type of ["pointerup", "pointercancel", "touchend"]) addEventListener(type, () => held && ((held = false), rest(2500)), { passive: true });
mapEl.addEventListener("wheel", () => rest(2500), { passive: true });

mapEl.addEventListener("scroll", recentre, { passive: true });

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
  if (groups.has(code)) el.dataset.code = code;
  return el;
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
  // Three real copies (not <use>), so pointing at any of them finds the country underneath.
  const copies = [1, 2].map((n) => Object.assign(earth.cloneNode(true), { id: "" }));
  copies.forEach((c, n) => c.setAttribute("transform", `translate(${((n + 1) * width).toFixed(2)} 0)`));
  map.append(earth, ...copies);
  mapEl.replaceChildren(map);
  focusOn([...groups.keys()]);

  const counted = [...groups.values()].reduce((n, list) => n + list.length, 0);
  summary.textContent = counted
    ? `${counted} ${counted === 1 ? "noodle" : "noodles"} from ${groups.size} ${groups.size === 1 ? "country" : "countries"}`
    : "No noodles yet.";
}

// Pointing at a noodle country (tapping, on a phone) shows its bami facts in a card next to it and lights it up.
const card = document.getElementById("country-card");

function cardFor(code) {
  const mine = entries.filter((e) => e.country === code);
  const { packs, flavours, meters, liters } = facts(mine);
  const top = brands(mine);
  const favourite = top.flatMap((b) => b.flavours.map((f) => ({ ...f, brand: b.brand }))).sort((a, b) => b.count - a.count)[0];
  const first = [...mine].sort((a, b) => a.date.localeCompare(b.date))[0];
  const share = Math.round((packs / entries.length) * 100);
  const plural = (n, word) => `${n.toLocaleString("en")} ${n === 1 ? word : `${word}s`}`;
  return [
    h("p", { class: "card-name" }, `${flag(code)} ${names.of(code)}`),
    h("p", {}, `${plural(packs, "pack")}, ${share}% of all.`),
    h("p", {}, `${top.slice(0, 3).map((b) => b.brand).join(", ")}${top.length > 3 ? ` and ${top.length - 3} more` : ""}.`),
    h("p", {}, `${plural(flavours, "flavour")}, mostly ${favourite.flavour || "no flavour"}.`),
    h("p", {}, `${meters.toLocaleString("en")} meters of noodles, ${liters.toLocaleString("en")} liters of soup.`),
    h("p", {}, `first one on ${formatDate(first.date)}.`),
  ];
}

// On wider screens the card goes beside the country, never over it (on phones it sits under the map instead): to its right if it fits on screen, else its left, else above
// or below it (whichever has more room), centred on it and kept on screen.
function place(country) {
  if (!wide.matches) return;
  const map = mapEl.getBoundingClientRect();
  const land = country.getBoundingClientRect();
  const w = card.offsetWidth, h = card.offsetHeight, gap = 12;
  const left = Math.max(map.left, 0) + 8, right = Math.min(map.right, innerWidth) - 8;
  const fit = (lo, size, hi) => Math.min(Math.max(lo, size), hi);
  let x, y;
  if (land.right + gap + w <= right) x = land.right + gap;
  else if (land.left - gap - w >= left) x = land.left - gap - w;
  if (x !== undefined) {
    y = fit(map.top + 8, land.top + land.height / 2 - h / 2, map.bottom - h - 8);
  } else {
    x = fit(left, land.left + land.width / 2 - w / 2, right - w);
    y = land.top - map.top >= map.bottom - land.bottom ? land.top - gap - h : land.bottom + gap;
  }
  card.style.transform = `translate(${x - map.left}px, ${y - map.top}px)`;
}

let carded = null;
function showCard(country) {
  const code = country.dataset.code;
  if (code !== carded) {
    carded = code;
    card.replaceChildren(...cardFor(code));
    mapEl.querySelectorAll("[data-code]").forEach((p) => p.classList.toggle("selected", p.dataset.code === code));
  }
  card.hidden = false;
  place(country);
}

function hideCard() {
  if (!carded) return;
  carded = null;
  card.hidden = true;
  mapEl.querySelectorAll("[data-code].selected").forEach((p) => p.classList.remove("selected"));
}

mapEl.addEventListener("pointermove", (event) => {
  if (event.pointerType !== "mouse") return;
  const country = event.target.closest?.("[data-code]");
  country ? showCard(country) : hideCard();
});
mapEl.addEventListener("pointerenter", (event) => event.pointerType === "mouse" && (hovered = true));
mapEl.addEventListener("pointerleave", (event) => event.pointerType === "mouse" && ((hovered = false), hideCard()));
mapEl.addEventListener("click", (event) => {
  const country = event.target.closest?.("[data-code]");
  if (!country) return hideCard();
  showCard(country);
  rest(6000);
});

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
}).observe(document.body);

// Every brand with its flavours as a loose, hand-drawn-looking family tree on noodles: "bami" (in the logo's
// lettering) at the top, a noodle from it down and across to each brand side by side (at slightly different
// heights), and each brand's flavours hanging below it, stepping in and out. When it's wider than the screen it scrolls sideways, starting in the middle.
const wide = matchMedia("(min-width: 768px)");
const PILL = { h: 22, pad: 10, char: 7.2 }; // DM Mono at 12px is 7.2px a character
const ROW = 32; // flavours hang this far apart
const INDENT = 22; // flavours sit this far in from their brand, with their noodle in between
const COLUMN_GAP = 28;

function pill(x, y, text, cls) {
  const w = text.length * PILL.char + 2 * PILL.pad;
  const g = svg("g", { class: cls });
  g.append(
    svg("rect", { x, y: y - PILL.h / 2, width: w, height: PILL.h, rx: PILL.h / 2 }),
    Object.assign(svg("text", { x: x + w / 2, y: y + 4 }), { textContent: text })
  );
  return { g, w };
}

// "bami" in the logo's own shapes (tools/lettering).
const BAMI = { w: 72, h: 57 }; // public/lettering/bami.svg is 167.6 × 132

// A noodle through these points (straight runs with rounded corners), with an even wiggle along the whole length
// (one wave every WAVE pixels) that settles at both ends, and now and then a loop. Each one is a little different.
const WAVE = 30, AMP = 2.4, CORNER = 18;

function noodle(points, seed) {
  const base = [points[0]];
  const run = ([x1, y1], [x2, y2]) => {
    const n = Math.max(1, Math.ceil(Math.hypot(x2 - x1, y2 - y1) / 3));
    for (let i = 1; i <= n; i++) base.push([x1 + ((x2 - x1) * i) / n, y1 + ((y2 - y1) * i) / n]);
  };
  for (let i = 1; i < points.length; i++) {
    const [px, py] = base[base.length - 1], [x, y] = points[i], next = points[i + 1];
    if (!next) {
      run([px, py], [x, y]);
      continue;
    }
    const d1 = Math.hypot(x - px, y - py) || 1, d2 = Math.hypot(next[0] - x, next[1] - y) || 1;
    const r = Math.min(CORNER, d1 / 2, d2 / 2);
    const a = [x - ((x - px) / d1) * r, y - ((y - py) / d1) * r], c = [x + ((next[0] - x) / d2) * r, y + ((next[1] - y) / d2) * r];
    run([px, py], a);
    for (let k = 1; k <= 8; k++) {
      const t = k / 8, u = 1 - t;
      base.push([u * u * a[0] + 2 * u * t * x + t * t * c[0], u * u * a[1] + 2 * u * t * y + t * t * c[1]]);
    }
  }
  const along = [0];
  for (let i = 1; i < base.length; i++) along.push(along[i - 1] + Math.hypot(base[i][0] - base[i - 1][0], base[i][1] - base[i - 1][1]));
  const length = along[along.length - 1] || 1;
  // About one noodle in three, if it's long enough, lies in a loop somewhere along the way.
  const curl = length > 90 && loose(seed * 3.3) < 0.35 ? length * (0.35 + loose(seed * 5.1) * 0.3) : -1;
  const wiggled = [];
  base.forEach(([x, y], i) => {
    const [ax, ay] = base[Math.max(0, i - 1)], [bx, by] = base[Math.min(base.length - 1, i + 1)];
    const len = Math.hypot(bx - ax, by - ay) || 1;
    const [dx, dy, nx, ny] = [(bx - ax) / len, (by - ay) / len, -(by - ay) / len, (bx - ax) / len];
    const wiggle = AMP * Math.sin((Math.PI * along[i]) / length) * Math.sin((2 * Math.PI * along[i]) / WAVE + seed * 1.7);
    const point = [x + nx * wiggle, y + ny * wiggle];
    wiggled.push(point);
    if (curl >= 0 && along[i] >= curl && (i === 0 || along[i - 1] < curl)) {
      // A full turn, touching the noodle here, to one side of it.
      const r = 6 + loose(seed * 7.7) * 4, side = loose(seed * 9.9) < 0.5 ? 1 : -1;
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

  // Lay it out loosely first: brands at slightly different heights, flavours stepping in and out below them.
  const width = (text) => text.length * PILL.char + 2 * PILL.pad;
  const STEPS = [0, 22, 8, 30, 14];
  const bus = BAMI.h + 12; // where the brands' noodles start running across
  const plan = all.map(({ brand, flavours }, i) => {
    const across = bus + loose(i * 7 + 2) * 14;
    const brandX = loose(i * 7 + 3) * 10;
    const brandY = across + 26 + loose(i * 7 + 1) * 34;
    let y = brandY;
    const leaves = flavours.map(({ flavour }, j) => {
      y += ROW * (0.85 + loose(i * 31 + j * 5) * 0.45);
      return { text: flavour || "no flavour", x: brandX + INDENT + STEPS[j % STEPS.length] + loose(i * 31 + j * 5 + 1) * 6, y };
    });
    const w = Math.max(brandX + width(brand), ...leaves.map((l) => l.x + width(l.text)));
    return { brand, across, brandX, brandY, leaves, w };
  });
  const total = plan.reduce((n, p) => n + p.w, 0) + COLUMN_GAP * (plan.length - 1);
  const lines = svg("g", { class: "branches" });
  const pills = svg("g");
  let left = -total / 2, seed = 0, bottom = 0;
  plan.forEach(({ brand, across, brandX, brandY, leaves, w }, i) => {
    const label = pill(left + brandX, brandY, brand, "brand");
    const middle = left + brandX + label.w / 2;
    const start = (i - (plan.length - 1) / 2) * 3; // the noodles leave "bami" side by side, like a bundle
    lines.append(noodle([[start, BAMI.h - 4], [start, across], [middle, across], [middle, brandY - PILL.h / 2]], seed++));
    pills.append(label.g);
    const lane = left + brandX + 10; // the flavours' noodles come down here, left of every flavour
    for (const leaf of leaves) {
      const p = pill(left + leaf.x, leaf.y, leaf.text, "flavour");
      lines.append(noodle([[lane, brandY + PILL.h / 2], [lane, leaf.y], [left + leaf.x, leaf.y]], seed++));
      pills.append(p.g);
    }
    bottom = Math.max(bottom, brandY, ...leaves.map((l) => l.y));
    left += w + COLUMN_GAP;
  });
  pills.append(svg("image", { href: "/lettering/bami.svg", x: -BAMI.w / 2, y: 0, width: BAMI.w, height: BAMI.h }));
  const reach = Math.max(total, BAMI.w) / 2 + 4, height = bottom + PILL.h / 2 + 4;
  const map = svg("svg", {
    viewBox: `${-reach} -2 ${2 * reach} ${height + 2}`,
    width: 2 * reach,
    role: "img",
    "aria-label": all.map((b) => `${b.brand}: ${b.flavours.map((f) => f.flavour || "no flavour").join(", ")}`).join("; "),
  });
  map.style.setProperty("--natural", `${2 * reach}px`);
  map.append(lines, pills);
  holder.replaceChildren(map);
  holder.scrollLeft = (holder.scrollWidth - holder.clientWidth) / 2; // start in the middle, under "bami"
}

api("/api/entries")
  .then((list) => {
    entries = list;
    renderFacts();
    renderBrands();
    render();
    lastWidth = innerWidth;
    renderCharts();
    strip(document.getElementById("strip"), entries);
  })
  .catch((err) => (summary.textContent = `Couldn't load the noodles: ${err.message}`))
  .finally(() => page.setAttribute("aria-busy", "false"));
