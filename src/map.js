import { api, h } from "./dom.js";
import { flag, padNumber, title } from "./format.js";
import { facts } from "./facts.js";
import { byCountry } from "./map-data.js";
import world from "./world.json";

const SVG = "http://www.w3.org/2000/svg";
const names = new Intl.DisplayNames(["en"], { type: "region" });
const page = document.querySelector(".map-page");
const modes = document.getElementById("modes");
const mapEl = document.getElementById("map");
const summary = document.getElementById("summary");
const countryEl = document.getElementById("country");

const countriesEl = document.getElementById("countries");
const groupsEl = document.getElementById("groups");

let entries = [];
let mode = location.hash === "#eaten" ? "eaten" : "made";
let selected = null;
let focus = "now"; // pan to the noodles on the first draw and after switching modes; smoothly after picking a country

// On a phone the map is wider than the screen and scrolls sideways; bring these countries to the middle.
function focusOn(codes, behavior) {
  const columns = codes.flatMap((code) => world.cells[code] ?? [world.small[code]]).filter((i) => i !== undefined).map((i) => i % world.cols);
  if (!columns.length || mapEl.scrollWidth <= mapEl.clientWidth) return;
  const middle = (Math.min(...columns) + Math.max(...columns) + 1) / 2 / world.cols;
  mapEl.scrollTo({ left: middle * mapEl.scrollWidth - mapEl.clientWidth / 2, behavior });
}

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
  const groups = byCountry(entries, mode);
  const order = [...groups.keys()].sort((a, b) => groups.get(b).length - groups.get(a).length || names.of(a).localeCompare(names.of(b)));
  const width = world.cols * world.cellW - GAP;
  const height = world.rows * world.cellH - GAP;
  const map = svg("svg", { viewBox: `0 0 ${width.toFixed(2)} ${height.toFixed(2)}`, role: "img", "aria-label": "World map" });
  for (const code of Object.keys(world.cells)) map.append(country(code, groups));
  // Countries too small for a block only get one when they have noodles, drawn last so it sits on top.
  for (const code of Object.keys(world.small)) if (groups.has(code)) map.append(country(code, groups));
  mapEl.replaceChildren(map);
  if (focus) {
    focusOn(selected ? [selected] : order, focus === "smooth" ? "smooth" : "instant");
    focus = null;
  }

  const counted = [...groups.values()].reduce((n, list) => n + list.length, 0);
  const verb = mode === "eaten" ? "eaten in" : "from";
  summary.textContent = counted
    ? `${counted} ${counted === 1 ? "noodle" : "noodles"} ${verb} ${groups.size} ${groups.size === 1 ? "country" : "countries"}`
    : mode === "eaten" ? "No locations yet." : "No noodles yet.";

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

  for (const button of modes.querySelectorAll("button")) {
    if (button.dataset.mode === mode) button.setAttribute("aria-current", "page");
    else button.removeAttribute("aria-current");
  }
}

countriesEl.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-country]");
  if (!button) return;
  selected = selected === button.dataset.country ? null : button.dataset.country;
  focus = "smooth";
  render();
});

modes.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-mode]");
  if (!button) return;
  mode = button.dataset.mode;
  selected = null;
  focus = "now";
  history.replaceState(null, "", mode === "eaten" ? "#eaten" : location.pathname);
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

api("/api/entries")
  .then((list) => {
    entries = list;
    renderFacts();
    render();
  })
  .catch((err) => (summary.textContent = `Couldn't load the noodles: ${err.message}`))
  .finally(() => page.setAttribute("aria-busy", "false"));
