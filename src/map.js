import { api, h } from "./dom.js";
import { flag, padNumber, title } from "./format.js";
import { brands, facts, hours } from "./facts.js";
import { clock, sociogram, stream, streamKey, svg, treemap } from "./charts.js";
import { byCountry } from "./map-data.js";
import world from "./world.json";

const names = new Intl.DisplayNames(["en"], { type: "region" });
const page = document.querySelector(".map-page");
const mapEl = document.getElementById("map");
const summary = document.getElementById("summary");

const countriesEl = document.getElementById("countries");
const groupsEl = document.getElementById("groups");

let entries = [];
let selected = null;
let focus = "now"; // pan to the noodles on the first draw; smoothly after picking a country

// The map is drawn three times side by side and kept on the middle copy, so it loops: whatever is picked can sit in
// the middle of the screen, and scrolling never reaches an end.
const copy = () => mapEl.scrollWidth / 3;
let panning = false;

function recentre() {
  if (panning) return;
  const w = copy();
  if (mapEl.scrollLeft < w / 2) mapEl.scrollLeft += w;
  else if (mapEl.scrollLeft > w * 1.5) mapEl.scrollLeft -= w;
}

// Bring these countries to the middle of the screen, the short way round.
function focusOn(codes, behavior) {
  const columns = codes.flatMap((code) => world.cells[code] ?? [world.small[code]]).filter((i) => i !== undefined).map((i) => i % world.cols);
  if (!columns.length) columns.push(world.cols / 2);
  const w = copy();
  const middle = w + ((Math.min(...columns) + Math.max(...columns) + 1) / 2 / world.cols) * w - mapEl.clientWidth / 2;
  const left = [middle - w, middle, middle + w].reduce((a, b) => (Math.abs(b - mapEl.scrollLeft) < Math.abs(a - mapEl.scrollLeft) ? b : a));
  if (behavior !== "smooth") {
    mapEl.scrollLeft = middle;
    return;
  }
  panning = true;
  mapEl.scrollTo({ left, behavior });
  setTimeout(() => {
    panning = false;
    recentre();
  }, 700);
}

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
  el.classList.toggle("selected", code === selected);
  return el;
}

const label = (code) => `${flag(code)} ${names.of(code)}`;

function render() {
  const groups = byCountry(entries);
  const order = [...groups.keys()].sort((a, b) => groups.get(b).length - groups.get(a).length || names.of(a).localeCompare(names.of(b)));
  const width = world.cols * world.cellW;
  const height = world.rows * world.cellH - GAP;
  const map = svg("svg", { viewBox: `0 0 ${(3 * width).toFixed(2)} ${height.toFixed(2)}`, role: "img", "aria-label": "World map" });
  const earth = svg("g", { id: "earth" });
  for (const code of Object.keys(world.cells)) earth.append(country(code, groups));
  // Countries too small for a block only get one when they have noodles, drawn last so it sits on top.
  for (const code of Object.keys(world.small)) if (groups.has(code)) earth.append(country(code, groups));
  map.append(earth, svg("use", { href: "#earth", x: width.toFixed(2) }), svg("use", { href: "#earth", x: (2 * width).toFixed(2) }));
  const left = mapEl.scrollLeft;
  mapEl.replaceChildren(map);
  mapEl.scrollLeft = left;
  if (focus) {
    focusOn(selected ? [selected] : order, focus === "smooth" ? "smooth" : "instant");
    focus = null;
  }

  const counted = [...groups.values()].reduce((n, list) => n + list.length, 0);
  summary.textContent = counted
    ? `${counted} ${counted === 1 ? "noodle" : "noodles"} from ${groups.size} ${groups.size === 1 ? "country" : "countries"}`
    : "No noodles yet.";

  // Picking a country lights it up and pans the map to it; the map itself isn't clickable.
  countriesEl.replaceChildren(
    ...order.map((code) =>
      h("button", { type: "button", "data-country": code, "aria-pressed": String(code === selected) }, `${label(code)} ${groups.get(code).length}`)
    )
  );

  groupsEl.replaceChildren(
    ...order.map((code) =>
      h(
        "section",
        { class: "map-group" },
        h("h2", { class: "map-country" }, `${label(code)} · ${groups.get(code).length}`),
        h(
          "div",
          { class: "map-list" },
          ...groups.get(code).map((entry) =>
            h(
              "figure",
              { class: "map-tile" },
              h("figcaption", {}, padNumber(entry.number)),
              h("img", { src: entry.photo, alt: title(entry), loading: "lazy", decoding: "async" })
            )
          )
        )
      )
    )
  );
}

countriesEl.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-country]");
  if (!button) return;
  selected = selected === button.dataset.country ? null : button.dataset.country;
  focus = "smooth";
  render();
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

// The charts below the map are drawn to fill their boxes, so they're drawn again when the page changes width,
// and after their captions and legends, which take some of the room. Each section shows once there are noodles.
function renderCharts() {
  const show = (id, on) => (document.getElementById(id).hidden = !on);
  const counts = hours(entries);
  const most = Math.max(...counts);
  show("clock", most > 0);
  if (most) {
    document.getElementById("clock-caption").textContent = `most noodles around ${String(counts.indexOf(most)).padStart(2, "0")}:00.`;
    clock(document.getElementById("clock-chart"), entries);
  }
  show("estate-panel", entries.length > 0);
  if (entries.length) treemap(document.getElementById("estate"), entries);
  show("stream-panel", entries.length > 0);
  document.getElementById("stream-legend").replaceChildren(...streamKey(entries).map(({ label, tone }) => h("li", {}, h("i", { class: `tone-${tone}` }), label)));
  if (entries.length) stream(document.getElementById("stream"), entries);
  show("makers-panel", entries.length > 0);
  if (entries.length) sociogram(document.getElementById("makers"), entries);
}

let lastWidth = 0;
new ResizeObserver(() => {
  if (!entries.length || innerWidth === lastWidth) return;
  lastWidth = innerWidth;
  renderCharts();
}).observe(document.body);

// Every brand with its flavours as a mind map: "bami" in the logo's lettering in the middle, brands branching off
// it, flavours off them.
// On wide screens the brands split over both sides; on phones they all go right, so the text stays readable.
// A brand's clear favourite flavour (no ties) is the logo red.
const wide = matchMedia("(min-width: 768px)");
const PILL = { h: 22, pad: 10, char: 7.2 }; // DM Mono at 12px is 7.2px a character
const ROW = 28; // flavours stack this far apart
const SPLIT = 12; // extra space between brands
const REACH = 44; // horizontal length of a branch

function pill(x, y, text, cls, side) {
  const w = text.length * PILL.char + 2 * PILL.pad;
  const left = side > 0 ? x : x - w; // pills grow outwards from where their branch arrives
  const g = svg("g", { class: cls });
  g.append(
    svg("rect", { x: left, y: y - PILL.h / 2, width: w, height: PILL.h, rx: PILL.h / 2 }),
    Object.assign(svg("text", { x: left + w / 2, y: y + 4 }), { textContent: text })
  );
  return { g, w };
}

// "bami" in the logo's own shapes (tools/lettering), on a white block so the branches stop at its edge.
const BAMI = { w: 72, h: 57, pad: 8 }; // public/lettering/bami.svg is 167.6 × 132

function bami(y) {
  const g = svg("g", { class: "theme" });
  g.append(
    svg("rect", { x: -BAMI.w / 2 - BAMI.pad, y: y - BAMI.h / 2 - BAMI.pad, width: BAMI.w + 2 * BAMI.pad, height: BAMI.h + 2 * BAMI.pad }),
    svg("image", { href: "/lettering/bami.svg", x: -BAMI.w / 2, y: y - BAMI.h / 2, width: BAMI.w, height: BAMI.h })
  );
  return g;
}

const branch = (x1, y1, x2, y2) => svg("path", { d: `M${x1} ${y1}C${(x1 + x2) / 2} ${y1} ${(x1 + x2) / 2} ${y2} ${x2} ${y2}` });

function renderBrands() {
  const all = brands(entries);
  const holder = document.getElementById("brands");
  document.getElementById("brands-panel").hidden = !all.length;
  if (!all.length) return;
  const rows = (b) => b.flavours.length * ROW + SPLIT;

  // Share the brands over the sides so both are about as tall.
  const sides = wide.matches ? [[], []] : [[]];
  const height = (list) => list.reduce((n, b) => n + rows(b), 0);
  for (const b of all) sides.reduce((a, c) => (height(c) < height(a) ? c : a)).push(b);
  const tallest = Math.max(...sides.map(height));

  const lines = svg("g", { class: "branches" });
  const pills = svg("g");
  const half = BAMI.w / 2 + BAMI.pad;
  let minX = -half, maxX = half;
  sides.forEach((list, i) => {
    const dir = sides.length === 1 || i === 0 ? 1 : -1;
    const brandX = dir * (half + REACH);
    const brandW = Math.max(...list.map((b) => `${b.brand} ${b.count}`.length * PILL.char + 2 * PILL.pad), 0);
    const flavourX = brandX + dir * (brandW + REACH);
    let y = (tallest - height(list)) / 2;
    for (const { brand, count, flavours } of list) {
      const brandY = y + (flavours.length * ROW) / 2;
      lines.append(branch(dir * half, tallest / 2, brandX, brandY));
      const label = pill(brandX, brandY, `${brand} ${count}`, "brand", dir);
      pills.append(label.g);
      flavours.forEach(({ flavour, count: packs }, j) => {
        const fy = y + j * ROW + ROW / 2;
        const favourite = j === 0 && packs > (flavours[1]?.count ?? packs);
        lines.append(branch(brandX + dir * label.w, brandY, flavourX, fy));
        const leaf = pill(flavourX, fy, `${flavour || "no flavour"} ${packs}`, favourite ? "flavour favourite" : "flavour", dir);
        pills.append(leaf.g);
        minX = Math.min(minX, flavourX - (dir < 0 ? leaf.w : 0));
        maxX = Math.max(maxX, flavourX + (dir > 0 ? leaf.w : 0));
      });
      y += flavours.length * ROW + SPLIT;
    }
  });
  pills.append(bami(tallest / 2));
  const top = Math.min(-PILL.h, tallest / 2 - BAMI.h / 2 - BAMI.pad), total = Math.max(tallest + PILL.h, tallest / 2 + BAMI.h / 2 + BAMI.pad) - top;
  const map = svg("svg", {
    viewBox: `${minX - 2} ${top} ${maxX - minX + 4} ${total}`,
    width: maxX - minX + 4,
    role: "img",
    "aria-label": all.map((b) => `${b.brand}: ${b.flavours.map((f) => `${f.flavour || "no flavour"} ${f.count}`).join(", ")}`).join("; "),
  });
  map.append(lines, pills);
  holder.replaceChildren(map);
}

wide.addEventListener("change", () => entries.length && renderBrands());

api("/api/entries")
  .then((list) => {
    entries = list;
    renderFacts();
    renderBrands();
    render();
    lastWidth = innerWidth;
    renderCharts();
  })
  .catch((err) => (summary.textContent = `Couldn't load the noodles: ${err.message}`))
  .finally(() => page.setAttribute("aria-busy", "false"));
