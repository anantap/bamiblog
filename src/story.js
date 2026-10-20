// The story of the year on /bamiversary/: a sentence ahead of each part, worked out from the noodles so it stays
// true as more come in; pack #1 at the start and the latest pack at the end; and one noodle running down the whole
// page, from the title to "send noods", ducking behind every part on the way.
import { svg } from "./charts.js";
import { brands, facts } from "./facts.js";
import { formatDate, padNumber, title } from "./format.js";
import { byCountry } from "./map-data.js";
import { cubic, noodle } from "./noodles.js";

const names = new Intl.DisplayNames(["en"], { type: "region" });
const plural = (n, word) => `${n.toLocaleString("en")} ${n === 1 ? word : `${word}s`}`;
const pack = ({ brand, flavour }) => [brand, flavour].filter(Boolean).join(" ") || "noodles";

// The sentences, by the part they open; null with no noodles.
export function storyLines(entries) {
  if (!entries.length) return null;
  const byNumber = [...entries].sort((a, b) => a.number - b.number);
  const first = byNumber[0], latest = byNumber.at(-1);
  const countries = [...byCountry(entries)].sort((a, b) => b[1].length - a[1].length);
  const all = brands(entries);
  const top = all[0];
  const once = all.filter((b) => b.count === 1).length;
  const counted = countries.reduce((n, [, list]) => n + list.length, 0);
  let map = "";
  if (countries.length === 1) map = `all of them came from ${names.of(countries[0][0])}.`;
  else if (countries.length > 1) {
    const most = countries[0][1].length > counted / 2 ? "most of them" : "the most";
    map = `then they came from ${countries.length} countries, ${most} from ${names.of(countries[0][0])}.`;
  }
  return {
    start: `it started on ${formatDate(first.date)}, with one pack of ${pack(first)}.`,
    map,
    brands: `${plural(all.length, "brand")}, ${plural(facts(entries).flavours, "flavour")}. ${once === all.length ? "never the same brand twice." : once ? "some only once, some again and again." : "every one of them again and again."}`,
    estate: all.length > 1 ? `${top.brand} alone took up ${Math.round((top.count / entries.length) * 100)}% of the year.` : `${top.brand} took up the whole year.`,
    strip: `and here they all are, ${plural(entries.length, "pack")} in a row.`,
    end: latest === first ? "" : `${plural(entries.length - 1, "pack")} later, on ${formatDate(latest.date)}: ${pack(latest)}.`,
    first,
    latest,
  };
}

const photo = (img, e) => Object.assign(img, { src: e.photo, alt: title(e) });

export function tell(entries) {
  const lines = storyLines(entries);
  if (!lines) return;
  const text = (id, value) => (document.getElementById(id).textContent = value);
  text("story-start", lines.start);
  photo(document.getElementById("first-photo"), lines.first);
  text("first-number", `#${padNumber(lines.first.number)}`);
  text("story-map", lines.map);
  text("story-brands", lines.brands);
  text("story-estate", lines.estate);
  text("story-strip", lines.strip);
  document.getElementById("day-one").hidden = false;
  if (lines.end) {
    text("story-end", lines.end);
    photo(document.getElementById("latest-photo"), lines.latest);
    text("latest-number", `#${padNumber(lines.latest.number)}`);
  }
  document.querySelector(".the-end-latest").hidden = !lines.end;
}

// The thread: one noodle from under the title down into "send noods". It only shows where there's room between the
// parts, swinging across from one side to the other there, and is hidden where it runs down past a part, as if
// behind it, so it laces down the page. Drawn again whenever the page changes size.
const ROOM = 56; // a gap between parts at least this tall gets a swing; smaller ones it passes straight through

export function thread(page) {
  const layer = svg("svg", { class: "thread", "aria-hidden": "true" });
  page.querySelector(".intro").after(layer); // so it shows with the rest of the page after the intro
  let pending = 0;
  const draw = () => {
    pending = 0;
    const box = page.getBoundingClientRect();
    const from = page.querySelector(".map-title")?.getBoundingClientRect();
    const to = page.querySelector(".the-end-action img")?.getBoundingClientRect();
    const above = page.querySelector(".the-end-action")?.previousElementSibling?.getBoundingClientRect();
    if (!from || !to || !to.height) return layer.replaceChildren();
    const width = page.clientWidth, height = page.scrollHeight;
    const y = (r, edge) => r[edge] - box.top;
    // Where the parts are, top to bottom, run together where they're closer than ROOM.
    const parts = [...page.querySelectorAll(":scope > :is(header, section):not([hidden]) > *")]
      .map((el) => el.getBoundingClientRect())
      .filter((r) => r.height > 0)
      .map((r) => [y(r, "top"), y(r, "bottom")])
      .sort((a, b) => a[0] - b[0]);
    const runs = [];
    for (const [top, bottom] of parts) {
      const last = runs.at(-1);
      if (last && top < last[1] + ROOM) last[1] = Math.max(last[1], bottom);
      else runs.push([top, bottom]);
    }
    const start = [width / 2, y(from, "bottom") + 4], end = [width / 2, y(to, "top") - 4];
    const left = Math.max(24, width * 0.14), right = width - left;
    const lines = svg("g", { "clip-path": "url(#thread-room)" });
    const room = svg("clipPath", { id: "thread-room" });
    const show = (top, bottom) => room.append(svg("rect", { x: -40, y: top, width: width + 80, height: Math.max(0, bottom - top) }));
    let at = start, seed = 101;
    const add = (points) => {
      lines.append(noodle([at, ...points], seed++));
      at = points.at(-1);
    };
    // A swing from where it is to b, leaving straight down and coming into b straight down.
    const swing = (b) => {
      const middle = (at[1] + b[1]) / 2;
      add(cubic(at, [at[0], middle], [b[0], middle], b));
    };
    const gaps = runs.slice(1).map((run, i) => [runs[i][1], run[0]]).filter(([top, bottom]) => top >= start[1] - 8 && bottom <= end[1]);
    gaps.forEach(([top, bottom], i) => {
      const pad = Math.min(16, (bottom - top) / 4);
      show(top, bottom);
      if (at !== start) add(cubic(at, at, [at[0], top + pad], [at[0], top + pad])); // down behind the part above
      // From side to side; the last swing comes back to the middle, to drop straight into "send noods".
      swing([i === gaps.length - 1 ? end[0] : at[0] <= width / 2 ? right : left, bottom - pad]);
    });
    add(cubic(at, at, end, end));
    if (above) show(y(above, "bottom"), end[1] + 2);
    layer.setAttribute("viewBox", `0 0 ${width} ${height}`);
    layer.setAttribute("width", width);
    layer.setAttribute("height", height);
    const defs = svg("defs");
    defs.append(room);
    layer.replaceChildren(defs, lines);
  };
  new ResizeObserver(() => (pending ||= requestAnimationFrame(draw))).observe(page);
}
