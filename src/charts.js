// Noodle real estate on /bamiversary/: a treemap of brands and their flavours, drawn to fill its box.
import { brands } from "./facts.js";

const NS = "http://www.w3.org/2000/svg";

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

// Text broken into lines that fit `room` (DM Mono is 0.6em a character); null when a word alone is too long.
function wrap(text, size, room) {
  const lines = [];
  for (const word of text.split(" ")) {
    if (!fits(word, size, room)) return null;
    const last = lines.length - 1;
    if (last >= 0 && fits(`${lines[last]} ${word}`, size, room)) lines[last] += ` ${word}`;
    else lines.push(word);
  }
  return lines;
}

function label(x, y, lines, size, attrs = {}) {
  const text = svg("text", { x, y, ...attrs, style: `font-size: ${size}px` });
  lines.forEach((line, i) => text.append(svg("tspan", { x, dy: i ? size * 1.3 : 0 }, line)));
  return text;
}

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
    g.append(svg("rect", { x, y, width: w, height: inner.length ? head : h }));
    inner.forEach((f, j) => {
      const shade = Math.max(30, 100 - j * 22); // percent of the brand's red, the rest white
      const tile = svg("g", { class: shade >= 70 ? "shade-dark" : "shade-light" });
      // The busiest flavour runs into the brand's strip (reaching 1px up into it, so no seam shows); the others
      // touching the strip get a white line between.
      const top = Math.abs(f.y - (y + head)) < 0.5 ? (j ? 2 : -1) : 0;
      const fw = f.w - (f.x + f.w < x + w - 1 ? 2 : 0), fh = f.h - (f.y + f.h < y + h - 1 ? 2 : 0) - top;
      tile.append(svg("rect", { x: f.x, y: f.y + top, width: Math.max(0, fw), height: Math.max(0, fh), style: `fill: color-mix(in srgb, var(--tone) ${shade}%, #fff)` }));
      const lines = wrap(f.flavour || "no flavour", 11, f.w - 14);
      if (lines && lines.length * 14.3 + 10 < f.h) tile.append(label(f.x + 8, f.y + 17, lines, 11));
      g.append(tile);
    });
    // The brand's name, smaller when the block is narrow.
    const size = [14, 11].find((px) => fits(b.brand, px, w - 16));
    if (size && h > head) g.append(label(x + 8, y + 18, [b.brand], size, { class: "estate-brand" }));
    el.append(g);
  });
}

