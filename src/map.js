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

// Every brand with its flavours as a tree hanging down from "bami" (in the logo's lettering) at the top: brands
// below it, each brand's flavours below that, every one on its own wiggly noodle. It grows downwards, so it reads
// the same on phones and wide screens. A brand's clear favourite flavour (no ties) is the logo red.
const wide = matchMedia("(min-width: 768px)");
const PILL = { h: 22, pad: 10, char: 7.2 }; // DM Mono at 12px is 7.2px a character
const ROW = 32; // every pill gets a row of its own
const INDENT = 34; // each level hangs this far right of the one above

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

// A noodle from (x1, y1) down and round into (x2, y2): the curve of a branch, with an even wiggle along it (one
// wave every WAVE pixels) that settles at both ends. Each one wiggles a little differently.
const WAVE = 30, AMP = 2.6;

function noodle(x1, y1, x2, y2, seed) {
  // Down first, then across: a cubic with both middle handles at the corner, sampled finely.
  const base = [];
  for (let i = 0; i <= 80; i++) {
    const t = i / 80, u = 1 - t;
    const x = u * u * u * x1 + 3 * u * u * t * x1 + 3 * u * t * t * x1 + t * t * t * x2;
    const y = u * u * u * y1 + 3 * u * u * t * y2 + 3 * u * t * t * y2 + t * t * t * y2;
    base.push([x, y]);
  }
  const along = [0];
  for (let i = 1; i < base.length; i++) along.push(along[i - 1] + Math.hypot(base[i][0] - base[i - 1][0], base[i][1] - base[i - 1][1]));
  const length = along[along.length - 1] || 1;
  const points = base.map(([x, y], i) => {
    const [ax, ay] = base[Math.max(0, i - 1)], [bx, by] = base[Math.min(base.length - 1, i + 1)];
    const len = Math.hypot(bx - ax, by - ay) || 1;
    const settle = Math.sin((Math.PI * along[i]) / length);
    const wiggle = AMP * settle * Math.sin((2 * Math.PI * along[i]) / WAVE + seed * 1.7);
    return [x + (-(by - ay) / len) * wiggle, y + ((bx - ax) / len) * wiggle];
  });
  return svg("path", { d: `M${points.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join("L")}` });
}

function renderBrands() {
  const all = brands(entries);
  const holder = document.getElementById("brands");
  document.getElementById("brands-panel").hidden = !all.length;
  if (!all.length) return;

  const lines = svg("g", { class: "branches" });
  const pills = svg("g");
  const rootX = BAMI.w / 2, brandX = rootX + INDENT, flavourX = brandX + INDENT;
  let y = BAMI.h + ROW / 2 + 6, right = BAMI.w, seed = 0;
  for (const { brand, flavours } of all) {
    lines.append(noodle(rootX, BAMI.h - 4, brandX, y, seed++));
    const label = pill(brandX, y, brand, "brand");
    pills.append(label.g);
    right = Math.max(right, brandX + label.w);
    const brandY = y;
    flavours.forEach(({ flavour, count: packs }, j) => {
      y += ROW;
      const favourite = j === 0 && packs > (flavours[1]?.count ?? packs);
      lines.append(noodle(brandX + 12, brandY + PILL.h / 2, flavourX, y, seed++));
      const leaf = pill(flavourX, y, flavour || "no flavour", favourite ? "flavour favourite" : "flavour");
      pills.append(leaf.g);
      right = Math.max(right, flavourX + leaf.w);
    });
    y += ROW + 8; // a little extra room before the next brand
  }
  pills.append(svg("image", { href: "/lettering/bami.svg", x: 0, y: 0, width: BAMI.w, height: BAMI.h }));
  const height = y - ROW / 2;
  const map = svg("svg", {
    viewBox: `-2 -2 ${right + 4} ${height + 4}`,
    width: right + 4,
    role: "img",
    "aria-label": all.map((b) => `${b.brand}: ${b.flavours.map((f) => `${f.flavour || "no flavour"} ${f.count}`).join(", ")}`).join("; "),
  });
  map.style.setProperty("--natural", `${right + 4}px`);
  map.append(lines, pills);
  holder.replaceChildren(map);
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
