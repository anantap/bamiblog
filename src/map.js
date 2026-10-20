import { api, h } from "./dom.js";
import { flag, padNumber, title } from "./format.js";
import { byCountry } from "./map-data.js";
import world from "./world.json";

const SVG = "http://www.w3.org/2000/svg";
const names = new Intl.DisplayNames(["en"], { type: "region" });
const page = document.querySelector(".map-page");
const modes = document.getElementById("modes");
const mapEl = document.getElementById("map");
const summary = document.getElementById("summary");
const countryEl = document.getElementById("country");

let entries = [];
let mode = location.hash === "#eaten" ? "eaten" : "made";
let selected = null;

function svg(tag, attrs = {}) {
  const el = document.createElementNS(SVG, tag);
  for (const [key, value] of Object.entries(attrs)) el.setAttribute(key, value);
  return el;
}

// Countries with noodles are red, darker the more there are; the rest stays the warm grey of an empty photo.
function shade(count, max) {
  return String(0.35 + (0.65 * (count - 1)) / Math.max(1, max - 1));
}

function select(code) {
  selected = selected === code ? null : code;
  render();
}

const GAP = 1.4; // white space between blocks, in map units (a block is about 8 wide)

// One country as a group of noodle-brick blocks.
function country(code, groups, max) {
  const count = groups.get(code)?.length ?? 0;
  const el = svg("g");
  for (const i of world.cells[code] ?? [world.small[code]]) {
    const x = (i % world.cols) * world.cellW;
    const y = Math.floor(i / world.cols) * world.cellH;
    el.append(svg("rect", { x: x.toFixed(2), y: y.toFixed(2), width: (world.cellW - GAP).toFixed(2), height: (world.cellH - GAP).toFixed(2) }));
  }
  el.classList.toggle("has", count > 0);
  el.classList.toggle("selected", code === selected);
  el.append(Object.assign(svg("title"), { textContent: count ? `${names.of(code)} · ${count}` : names.of(code) }));
  if (count) {
    el.setAttribute("fill-opacity", shade(count, max));
    el.setAttribute("tabindex", "0");
    el.setAttribute("role", "button");
    el.setAttribute("aria-label", `${names.of(code)}, ${count} ${count === 1 ? "noodle" : "noodles"}`);
    el.addEventListener("click", () => select(code));
    el.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        select(code);
      }
    });
  }
  return el;
}

function render() {
  const groups = byCountry(entries, mode);
  const max = Math.max(1, ...[...groups.values()].map((list) => list.length));
  const width = world.cols * world.cellW - GAP;
  const height = world.rows * world.cellH - GAP;
  const map = svg("svg", { viewBox: `0 0 ${width.toFixed(2)} ${height.toFixed(2)}`, role: "img", "aria-label": "World map" });
  for (const code of Object.keys(world.cells)) map.append(country(code, groups, max));
  // Countries too small for a block only get one when they have noodles, drawn last so it sits on top.
  for (const code of Object.keys(world.small)) if (groups.has(code)) map.append(country(code, groups, max));
  mapEl.replaceChildren(map);

  const counted = [...groups.values()].reduce((n, list) => n + list.length, 0);
  const verb = mode === "eaten" ? "eaten in" : "from";
  summary.textContent = counted
    ? `${counted} ${counted === 1 ? "noodle" : "noodles"} ${verb} ${groups.size} ${groups.size === 1 ? "country" : "countries"}`
    : mode === "eaten" ? "No locations yet." : "No noodles yet.";

  const list = selected && groups.get(selected);
  countryEl.hidden = !list;
  if (list) {
    document.getElementById("country-name").textContent = `${flag(selected)} ${names.of(selected)} · ${list.length}`;
    document.getElementById("country-list").replaceChildren(
      ...list.map((entry) =>
        h(
          "figure",
          { class: "map-tile" },
          h("figcaption", {}, padNumber(entry.number)),
          h("img", { src: entry.photo, alt: title(entry), loading: "lazy", decoding: "async" })
        )
      )
    );
  }

  for (const button of modes.querySelectorAll("button")) {
    if (button.dataset.mode === mode) button.setAttribute("aria-current", "page");
    else button.removeAttribute("aria-current");
  }
}

modes.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-mode]");
  if (!button) return;
  mode = button.dataset.mode;
  selected = null;
  history.replaceState(null, "", mode === "eaten" ? "#eaten" : location.pathname);
  render();
});

api("/api/entries")
  .then((list) => {
    entries = list;
    render();
  })
  .catch((err) => (summary.textContent = `Couldn't load the noodles: ${err.message}`))
  .finally(() => page.setAttribute("aria-busy", "false"));
