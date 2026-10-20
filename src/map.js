import { api, h } from "./dom.js";
import { flag, padNumber, title } from "./format.js";
import { facts, hours } from "./facts.js";
import { byCountry } from "./map-data.js";
import world from "./world.json";

const SVG = "http://www.w3.org/2000/svg";
const names = new Intl.DisplayNames(["en"], { type: "region" });
const page = document.querySelector(".map-page");
const mapEl = document.getElementById("map");
const summary = document.getElementById("summary");
const countryEl = document.getElementById("country");

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

function svg(tag, attrs = {}) {
  const el = document.createElementNS(SVG, tag);
  for (const [key, value] of Object.entries(attrs)) el.setAttribute(key, value);
  return el;
}

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
  const { packs, meters, liters } = facts(entries);
  const number = (n) => n.toLocaleString("en");
  document.getElementById("facts").replaceChildren(
    ...[
      ["time", "1 year."],
      ["packs", `${number(packs)} ${packs === 1 ? "pack" : "packs"} of noodles.`],
      ["length", `${number(meters)} meters of noodles.`],
      ["soup", `${number(liters)} liters of soup.`],
    ].map(([label, value]) => h("div", {}, h("dt", {}, label), h("dd", {}, value)))
  );
}

// The day in 24 columns of bricks, one brick per noodle in the hour it was logged (or a few noodles per brick, once
// an hour gets busy). The busiest hour is the logo red.
const CLOCK_ROWS = 12;

function renderClock() {
  const counts = hours(entries);
  const most = Math.max(...counts);
  document.getElementById("clock").hidden = most === 0;
  if (!most) return;
  const per = Math.ceil(most / CLOCK_ROWS);
  const rows = Math.ceil(most / per);
  const w = 10, hgt = w / 1.4, gap = w * 0.14;
  const chart = svg("svg", { viewBox: `0 0 ${24 * w - gap} ${rows * hgt - gap + 12}`, role: "img", "aria-label": `Noodles per hour of the day: ${counts.map((n, i) => `${i}:00 ${n}`).join(", ")}` });
  counts.forEach((count, hour) => {
    const filled = Math.ceil(count / per);
    for (let row = 0; row < rows; row++) {
      const attrs = { x: hour * w, y: (rows - 1 - row) * hgt, width: w - gap, height: hgt - gap };
      const cls = row >= filled ? "" : count === most ? "most" : "has";
      chart.append(svg("rect", cls ? { ...attrs, class: cls } : attrs));
    }
    if (hour % 6 === 0) chart.append(Object.assign(svg("text", { x: hour * w, y: rows * hgt - gap + 10 }), { textContent: String(hour).padStart(2, "0") }));
  });
  document.getElementById("clock-chart").replaceChildren(chart);
  const peak = counts.indexOf(most);
  document.getElementById("clock-caption").textContent = `most noodles around ${String(peak).padStart(2, "0")}:00.`;
}

api("/api/entries")
  .then((list) => {
    entries = list;
    renderFacts();
    renderClock();
    render();
  })
  .catch((err) => (summary.textContent = `Couldn't load the noodles: ${err.message}`))
  .finally(() => page.setAttribute("aria-busy", "false"));
