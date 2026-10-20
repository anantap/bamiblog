// The charts on /bamiversary/, each drawn to fill its box: noodle o'clock (a contour plot), noodle real estate
// (a treemap), the year in noodles (a stream graph) and who makes what (a sociogram).
import { brands, monthHours, weekly } from "./facts.js";
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

// The colours, read from the stylesheet so the canvas matches it.
function colours(el) {
  const style = getComputedStyle(el);
  return ["--line", "--accent-pale", "--accent-light", "--accent", "--accent-dark", "--anthracite"].map((name) => style.getPropertyValue(name).trim());
}

function frame(host) {
  const { width, height } = host.getBoundingClientRect();
  const el = svg("svg", { viewBox: `0 0 ${width} ${height}`, width, height });
  host.replaceChildren(el);
  return { el, width, height };
}

// Noodle o'clock: hours across, months down. The counts are smoothed into a landscape and cut into bands, from
// the palest red for a few noodles to anthracite for the busiest hours.
export function contour(host, entries) {
  const grid = monthHours(entries);
  const blur = grid.map((row, m) =>
    row.map((_, h) => {
      let sum = 0, weight = 0;
      for (let dm = -2; dm <= 2; dm++) {
        for (let dh = -2; dh <= 2; dh++) {
          const mm = m + dm;
          if (mm < 0 || mm > 11) continue;
          const k = Math.exp(-(dm * dm + dh * dh) / 2);
          sum += grid[mm][(h + dh + 24) % 24] * k;
          weight += k;
        }
      }
      return sum / weight;
    })
  );
  const most = Math.max(...blur.flat());
  if (!most) return host.replaceChildren();
  const { el, width, height } = frame(host);
  const left = 36, bottom = 22, w = Math.max(1, width - left), h = Math.max(1, height - bottom);

  const scale = devicePixelRatio || 1;
  const canvas = Object.assign(document.createElement("canvas"), { width: Math.round(w * scale), height: Math.round(h * scale) });
  const ctx = canvas.getContext("2d");
  const image = ctx.createImageData(canvas.width, canvas.height);
  const bands = colours(host).map((c) => c.match(/\w\w/g).map((x) => parseInt(x, 16)));
  const at = (m, hr) => blur[Math.max(0, Math.min(11, m))][(hr + 24) % 24];
  for (let y = 0; y < canvas.height; y++) {
    for (let x = 0; x < canvas.width; x++) {
      const fh = (x / canvas.width) * 24 - 0.5, fm = (y / canvas.height) * 12 - 0.5;
      const h0 = Math.floor(fh), m0 = Math.floor(fm), th = fh - h0, tm = fm - m0;
      const v = ((at(m0, h0) * (1 - th) + at(m0, h0 + 1) * th) * (1 - tm) + (at(m0 + 1, h0) * (1 - th) + at(m0 + 1, h0 + 1) * th) * tm) / most;
      const band = v < 0.08 ? null : bands[Math.min(5, 1 + Math.floor(((v - 0.08) / 0.92) * 5))];
      image.data.set(band ? [...band, 255] : [255, 255, 255, 0], (y * canvas.width + x) * 4);
    }
  }
  ctx.putImageData(image, 0, 0);
  el.append(svg("image", { href: canvas.toDataURL(), x: left, y: 0, width: w, height: h }));
  MONTHS.forEach((m, i) => el.append(svg("text", { x: left - 8, y: ((i + 0.5) / 12) * h + 4, "text-anchor": "end" }, m)));
  for (let hr = 0; hr < 24; hr += 6) el.append(svg("text", { x: left + (hr / 24) * w, y: height - 4, "text-anchor": hr ? "middle" : "start" }, `${String(hr).padStart(2, "0")}:00`));
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

// Noodle real estate: each brand a block the size of its packs, cut into its flavours.
export function treemap(host, entries) {
  const { el, width, height } = frame(host);
  const gap = 3, head = 26;
  const blocks = squarify(brands(entries).map((b) => ({ ...b, v: b.count })), 0, 0, width, height);
  blocks.forEach((b, i) => {
    const g = svg("g", { class: `estate tone-${i % 4}` });
    g.append(svg("rect", { x: b.x + gap / 2, y: b.y + gap / 2, width: Math.max(0, b.w - gap), height: Math.max(0, b.h - gap) }));
    const name = `${b.brand} ${b.count}`;
    // The brand's name, smaller or as just the number when the block is narrow.
    const tag = [[name, 14], [name, 11], [String(b.count), 11]].find(([text, size]) => fits(text, size, b.w - 16));
    if (tag && b.h > head) g.append(svg("text", { x: b.x + 10, y: b.y + 19, class: "estate-brand", style: `font-size: ${tag[1]}px` }, tag[0]));
    const inner = b.h > head * 2 ? squarify(b.flavours.map((f) => ({ ...f, v: f.count })), b.x + gap, b.y + head, b.w - 2 * gap, b.h - head - gap) : [];
    for (const f of inner) {
      g.append(svg("rect", { x: f.x + 1, y: f.y + 1, width: Math.max(0, f.w - 2), height: Math.max(0, f.h - 2), class: "estate-flavour" }));
      const label = `${f.flavour || "no flavour"} ${f.count}`;
      if (fits(label, 11, f.w - 14) && f.h > 24) g.append(svg("text", { x: f.x + 8, y: f.y + 17 }, label));
    }
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
  return layers.map((l, n) => ({ label: l.country ? `${flag(l.country)} ${names.of(l.country)}` : "the rest", tone: l.country ? n % 5 : "other" }));
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
