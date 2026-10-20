// The story of the year on /bamiversary/: how it started, then a sentence ahead of each part, worked out from the
// noodles so it stays true as more come in.
import { brands, facts } from "./facts.js";
import { formatDate, padNumber, title } from "./format.js";
import { byCountry } from "./map-data.js";

const names = new Intl.DisplayNames(["en"], { type: "region" });
const plural = (n, word) => `${n.toLocaleString("en")} ${n === 1 ? word : `${word}s`}`;
const pack = ({ brand, flavour }) => [brand, flavour].filter(Boolean).join(" ") || "noodles";

// How much soup a bathtub holds, in liters.
export const BATHTUB = 150;

// The soup in bathtubs: a part of one, about one, or how many.
function tubs(liters) {
  const n = liters / BATHTUB;
  if (n < 0.9) return `${Math.max(1, Math.round(n * 100))}% of a bathtub`;
  if (n < 1.1) return "a bathtub";
  return `${Math.round(n * 10) / 10} bathtubs`;
}

// The sentences, by the part they open; null with no noodles.
export function storyLines(entries) {
  if (!entries.length) return null;
  const byNumber = [...entries].sort((a, b) => a.number - b.number);
  const first = byNumber[0];
  const countries = [...byCountry(entries)].sort((a, b) => b[1].length - a[1].length);
  const all = brands(entries);
  const top = all[0];
  const { flavours, meters, liters } = facts(entries);
  const counted = countries.reduce((n, [, list]) => n + list.length, 0);
  let map = "";
  if (countries.length === 1) map = `Then came ${plural(counted, "noodle")}, all of them from ${names.of(countries[0][0])}.`;
  else if (countries.length > 1) {
    const most = countries[0][1].length > counted / 2 ? "most of them" : "the most";
    map = `Then came ${plural(counted, "noodle")} from ${countries.length} countries, ${most} from ${names.of(countries[0][0])}.`;
  }
  return {
    start: "It started with a pan, a stove, 300ml water and an idea.",
    map,
    brands: `${plural(all.length, "brand")}, ${plural(flavours, "flavour")}. Some only once, some again and again.`,
    meters: `All together, that's ${meters.toLocaleString("en")} meters of noodles.`,
    soup: liters ? `And ${plural(liters, "liter")} of soup: enough to fill ${tubs(liters)}.` : "And not a drop of soup.",
    estate: all.length > 1 ? `${top.brand} alone took up ${Math.round((top.count / entries.length) * 100)}% of the year.` : `${top.brand} took up the whole year.`,
    every: `And here they all are, ${plural(entries.length, "pack")}.`,
    first,
  };
}


// "…again and again." goes on: and again, and again, each one smaller than the one before, trailing off.
const AGAINS = 8;

function againAndAgain(el, line) {
  if (!line.endsWith(" and again.")) return (el.textContent = line);
  const words = line.slice(0, -" and again.".length);
  const fading = Array.from({ length: AGAINS }, (_, k) => {
    const span = document.createElement("span");
    span.textContent = k === AGAINS - 1 ? " and again…" : " and again";
    span.style.fontSize = `${Math.round(100 * 0.8 ** (k + 1))}%`;
    return span;
  });
  el.replaceChildren(words, ...fading);
  el.setAttribute("aria-label", line);
}

export function tell(entries) {
  const lines = storyLines(entries);
  if (!lines) return;
  const text = (id, value) => (document.getElementById(id).textContent = value);
  text("story-start", lines.start);
  Object.assign(document.getElementById("first-photo"), { src: lines.first.photo, alt: title(lines.first) });
  text("first-number", `#${padNumber(lines.first.number)} ${pack(lines.first)} · ${formatDate(lines.first.date)}`);
  text("story-map", lines.map);
  againAndAgain(document.getElementById("story-brands"), lines.brands);
  text("story-estate", lines.estate);
  text("story-meters", lines.meters);
  text("story-soup", lines.soup);
  text("story-every", lines.every);
  document.getElementById("day-one").hidden = false;
}
