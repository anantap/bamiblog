// The charts on /bamiversary/, each drawn to fill its box: noodle o'clock (a bar chart), noodle real estate
// (a treemap), the year in noodles (a stream graph) and who makes what (a sociogram).
import { brands, hours, weekly } from "./facts.js";
import { makers } from "./makers.js";
import { flag } from "./format.js";

const NS = "http://www.w3.org/2000/svg";
const names = new Intl.DisplayNames(["en"], { type: "region" });
const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

export function svg(tag, attrs = {}, text) {
  const el = document.createElementNS(NS, tag);
  for (const [key, value] of Object.entries(attrs)) el.setAttribute(key, value);
  if (text != null) el.textContent = text;
  return el;
}

function frame(host) {
  const { width, height } = host.getBoundingClientRect();
  const el = svg("svg", { viewBox: `0 0 ${width} ${height}`, width, height });
  host.replaceChildren(el);
  return { el, width, height };
}

// Noodle o'clock: a bar for each hour of the day, as tall as the noodles logged in it, the busiest in red.
export function clock(host, entries) {
  const counts = hours(entries);
  const most = Math.max(...counts);
  const { el, width, height } = frame(host);
  const bottom = 22, top = 18, gap = Math.min(6, width / 24 / 4), w = width / 24;
  counts.forEach((count, hour) => {
    const h = count ? Math.max(2, (count / most) * (height - bottom - top)) : 2;
    const x = hour * w + gap / 2, y = height - bottom - h;
    el.append(svg("rect", { x, y, width: w - gap, height: h, class: count === most ? "bar most" : count ? "bar" : "bar none" }));
    if (count && w > 22) el.append(svg("text", { x: x + (w - gap) / 2, y: y - 5, "text-anchor": "middle" }, count));
    if (hour % 3 === 0) el.append(svg("text", { x: x + (w - gap) / 2, y: height - 4, "text-anchor": "middle" }, String(hour).padStart(2, "0")));
  });
}

// Squarified treemap: lays items ({ v }) out in the box as close to squares as it can.
function squarify(items, x, y, w, h, out = []) {
  items = items.filter((i) => i.v > 0);
  if (!items.length) return out;
  if (items.length === 1) return out.push({ ...items[0], x, y, w, h }), out;
  const total = items.reduce((n, i) => n + i.v, 0);
  const short = Math.min(w, h), scale = (w * h) / total;
  const worst = (row) => {
    const sum = row.reduce((n, a) => n + a.v * scale, 0);
    const big = Math.max(...row.map((a) => a.v * scale)), small = Math.min(...row.map((a) => a.v * scale));
    return Math.max((short * short * big) / (sum * sum), (sum * sum) / (short * short * small));
  };
  let row = [], best = Infinity, i = 0;
  while (i < items.length) {
    const next = [...row, items[i]], score = worst(next);
    if (score > best) break;
    row = next;
    best = score;
    i++;
  }
  const thick = row.reduce((n, a) => n + a.v * scale, 0) / short;
  let offset = 0;
  for (const a of row) {
    const length = (a.v * scale) / thick;
    out.push(w >= h ? { ...a, x, y: y + offset, w: thick, h: length } : { ...a, x: x + offset, y, w: length, h: thick });
    offset += length;
  }
  return w >= h ? squarify(items.slice(i), x + thick, y, w - thick, h, out) : squarify(items.slice(i), x, y + thick, w, h - thick, out);
}

const fits = (text, size, room) => text.length * size * 0.6 < room;

// Noodle real estate: each brand a block the size of its packs in its own red, cut into its flavours in lighter
// and lighter shades of that red (busiest flavour first), with white between them.
export function treemap(host, entries) {
  const { el, width, height } = frame(host);
  const gap = 4, head = 26;
  const blocks = squarify(brands(entries).map((b) => ({ ...b, v: b.count })), 0, 0, width, height);
  blocks.forEach((b, i) => {
    const g = svg("g", { class: `estate tone-${i % 4}` });
    const x = b.x + gap / 2, y = b.y + gap / 2, w = Math.max(0, b.w - gap), h = Math.max(0, b.h - gap);
    const inner = h > head * 2 ? squarify(b.flavours.map((f) => ({ ...f, v: f.count })), x, y + head, w, h - head) : [];
    g.append(svg("rect", { x, y, width: w, height: inner.length ? head + 1 : h })); // 1px under the first flavour: no seam
    inner.forEach((f, j) => {
      const shade = Math.max(30, 100 - j * 22); // percent of the brand's red, the rest white
      const tile = svg("g", { class: shade >= 70 ? "shade-dark" : "shade-light" });
      tile.append(svg("rect", { x: f.x, y: f.y, width: Math.max(0, f.w - (f.x + f.w < x + w - 1 ? 2 : 0)), height: Math.max(0, f.h - (f.y + f.h < y + h - 1 ? 2 : 0)), style: `fill: color-mix(in srgb, var(--tone) ${shade}%, #fff)` }));
      const label = `${f.flavour || "no flavour"} ${f.count}`;
      if (fits(label, 11, f.w - 14) && f.h > 24) tile.append(svg("text", { x: f.x + 8, y: f.y + 17 }, label));
      g.append(tile);
    });
    const name = `${b.brand} ${b.count}`;
    // The brand's name, smaller or as just the number when the block is narrow.
    const tag = [[name, 14], [name, 11], [String(b.count), 11]].find(([text, size]) => fits(text, size, w - 16));
    if (tag && h > head) g.append(svg("text", { x: x + 8, y: y + 18, class: "estate-brand", style: `font-size: ${tag[1]}px` }, tag[0]));
    el.append(g);
  });
}

// The year in noodles: a stream per country, week by week, smoothed and stacked around the middle. Time runs
// across on wide boxes and down on tall ones (phones).
export function stream(host, entries) {
  const { start, weeks, series } = weekly(entries);
  const { el, width, height } = frame(host);
  if (!weeks) return;
  const across = width >= height;
  const length = (across ? width : height) - 40, room = (across ? height : width) - 8;
  const smooth = (counts) =>
    counts.map((_, i) => {
      let sum = 0, weight = 0;
      for (let d = -3; d <= 3; d++) {
        if (counts[i + d] == null) continue;
        const k = Math.exp(-(d * d) / 4);
        sum += counts[i + d] * k;
        weight += k;
      }
      return sum / weight;
    });
  const layers = series.map((s) => ({ ...s, values: smooth(s.counts) }));
  const totals = Array.from({ length: weeks }, (_, i) => layers.reduce((n, l) => n + l.values[i], 0));
  const unit = room / Math.max(...totals) / 1.1;
  const at = (i) => 40 + (weeks === 1 ? length / 2 : (i / (weeks - 1)) * length);
  const point = (t, v) => (across ? [t, v + 4] : [v + 4, t]);
  const curve = (pts) =>
    pts.map(([t, v], i) => {
      const [x, y] = point(t, v);
      if (!i) return `${x} ${y}`;
      const [pt] = pts[i - 1], [cx1, cy1] = point((pt + t) / 2, pts[i - 1][1]), [cx2, cy2] = point((pt + t) / 2, v);
      return `C${cx1} ${cy1} ${cx2} ${cy2} ${x} ${y}`;
    }).join("");
  let base = totals.map((t) => room / 2 - (t * unit) / 2);
  layers.forEach((layer, n) => {
    const top = base.map((v, i) => [at(i), v]);
    const next = base.map((v, i) => v + layer.values[i] * unit);
    const low = next.map((v, i) => [at(i), v]).reverse();
    el.append(svg("path", { d: `M${curve(top)}L${curve(low)}Z`, class: `flow tone-${layer.country ? n % 5 : "other"}` }));
    base = next;
  });
  // Month names where each month starts.
  for (let i = 0; i < weeks; i++) {
    const day = new Date(start + i * 7 * 86400000);
    const prev = new Date(start + (i - 1) * 7 * 86400000);
    if (i && day.getUTCMonth() === prev.getUTCMonth()) continue;
    const t = at(i);
    el.append(svg("text", across ? { x: t, y: height - 2, "text-anchor": "middle" } : { x: 0, y: t + 4 }, MONTHS[day.getUTCMonth()]));
  }
}

// What the streams are, in the order they're drawn (the legend is filled in before the chart takes its space).
export function streamKey(entries) {
  return weekly(entries).series.map((s, n) => ({ label: s.country ? `${flag(s.country)} ${names.of(s.country)}` : "the rest", tone: s.country ? n % 5 : "other" }));
}

// Who makes what: companies (anthracite) with arrows to their brands, red when eaten, outlined when not yet.
// Every company gets a spot on a loose grid with its brands fanned out over the top (its name goes below);
// brands without a known company share the last spots. On narrow screens the grid grows downwards rather
// than squeezing.
export function sociogram(host, entries) {
  const { companies, loners } = makers(brands(entries).map((b) => b.brand));
  const frameEl = frame(host);
  const { el, width } = frameEl;
  const clusters = [...companies.map((c) => ({ centre: { name: c.company, kind: c.eaten ? "company eaten" : "company", r: 15 }, ring: c.brands })), ...loners.map((b) => ({ centre: { name: b, kind: "brand", r: 9 }, ring: [] }))];
  if (!clusters.length) return;
  const cols = Math.max(1, Math.min(Math.floor(width / 180), Math.round(Math.sqrt((clusters.length * width) / frameEl.height))));
  const rows = Math.ceil(clusters.length / cols);
  const height = Math.max(frameEl.height, rows * 150);
  el.setAttribute("viewBox", `0 0 ${width} ${height}`);
  el.setAttribute("height", height);
  const pad = cols > 1 ? 60 : 0; // room for the outermost names
  const cw = (width - 2 * pad) / cols, ch = height / rows, reach = Math.min(cw * 0.32, ch * 0.34, 90);
  const defs = svg("defs");
  const arrow = svg("marker", { id: "arrow", viewBox: "0 0 10 10", refX: 10, refY: 5, markerWidth: 7, markerHeight: 7, orient: "auto" });
  arrow.append(svg("path", { d: "M0 0L10 5L0 10z", class: "arrow" }));
  defs.append(arrow);
  el.append(defs);
  const node = ({ name, kind, r }, x, y, label) => {
    const g = svg("g", { class: `node ${kind}` });
    g.append(svg("circle", { cx: x, cy: y, r }), svg("text", label, name));
    el.append(g);
  };
  clusters.forEach(({ centre, ring }, i) => {
    // A little offset per spot, so the grid doesn't look like one.
    const x = pad + ((i % cols) + 0.5) * cw + Math.sin(i * 2.4) * cw * 0.06;
    const y = (Math.floor(i / cols) + 0.5) * ch + Math.cos(i * 1.7) * ch * 0.05 + reach * 0.3;
    ring.forEach((b, j) => {
      // Spread over the top of the circle, clear of the company's name underneath.
      const a = ((165 + ((j + 0.5) / ring.length) * 210) * Math.PI) / 180;
      const cos = Math.cos(a), sin = Math.sin(a);
      const bx = x + cos * reach, by = y + sin * reach;
      el.append(svg("line", { x1: x + cos * 15, y1: y + sin * 15, x2: bx - cos * 12, y2: by - sin * 12, class: "tie", "marker-end": "url(#arrow)" }));
      const side = cos > 0.35 ? "start" : cos < -0.35 ? "end" : "middle";
      const label = side === "middle" ? { x: bx, y: sin < 0 ? by - 15 : by + 23, "text-anchor": "middle" } : { x: bx + cos * 15, y: by + 4, "text-anchor": side };
      node({ name: b.brand, kind: b.eaten ? "brand" : "brand not-yet", r: 9 }, bx, by, label);
    });
    node(centre, x, y, { x, y: y + centre.r + 16, "text-anchor": "middle" });
  });
}
