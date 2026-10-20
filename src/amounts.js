// Two of the year's amounts on /bamiversary/, drawn to show how much they are: all the noodles as one noodle a pixel
// a meter long, snaking back and forth with a mark every kilometer, and all the soup in bathtubs.
import { svg } from "./charts.js";
import { facts } from "./facts.js";
import { cubic, noodle } from "./noodles.js";
import { BATHTUB } from "./story.js";

const ROW = 22; // the noodle's rows are this far apart
const TURN = ROW / 2;

// One noodle `meters` pixels long, in rows across `width`, turning round at the ends; with where each kilometer is.
function snake(meters, width) {
  const pieces = [], marks = [];
  const across = Math.max(40, width - 2 * TURN - 8);
  let x = TURN + 4, y = TURN + 4, way = 1, gone = 0;
  while (gone < meters) {
    const run = Math.min(across, meters - gone), to = x + way * run;
    const turn = gone + run < meters ? Math.PI * TURN : 0;
    // A kilometer that comes in the turn is marked at the end of the row.
    for (let km = Math.floor(gone / 1000) * 1000 + 1000; km <= gone + run + turn; km += 1000) {
      marks.push({ km, x: x + way * Math.min(run, km - gone), y });
    }
    const line = [[x, y], ...cubic([x, y], [x, y], [to, y], [to, y])];
    gone += run;
    x = to;
    if (gone < meters) {
      // Half a turn, round to the row below.
      for (let k = 1; k <= 12; k++) {
        const a = (Math.PI * k) / 12;
        line.push([x + way * TURN * Math.sin(a), y + TURN - TURN * Math.cos(a)]);
      }
      gone += turn;
      y += ROW;
      way = -way;
    }
    pieces.push(line);
  }
  return { pieces, marks, height: y + TURN + 4 };
}

function drawLength(host, meters) {
  const width = host.clientWidth;
  const { pieces, marks, height } = snake(meters, width);
  const el = svg("svg", { viewBox: `0 0 ${width} ${height}`, width, height, role: "img", "aria-label": `${meters.toLocaleString("en")} meters of noodles, a pixel for every meter` });
  const lines = svg("g", { class: "length-noodle" });
  pieces.forEach((line, i) => lines.append(noodle(line, 300 + i)));
  const kms = svg("g", { class: "length-marks" });
  for (const { km, x, y } of marks) {
    kms.append(svg("rect", { x: x - 3, y: y - 3, width: 6, height: 6 }));
    kms.append(svg("text", { x, y: y - 7 }, `${km / 1000} km`));
  }
  el.append(lines, kms);
  host.replaceChildren(el);
}

// A bathtub, 200 wide and 112 tall, with soup in it to `full` (0 to 1).
function tub(full, id) {
  const body = "M10 28H190V60Q190 95 155 95H45Q10 95 10 60Z";
  const el = svg("svg", { viewBox: "0 0 200 112", class: "tub" });
  const clip = svg("clipPath", { id });
  clip.append(svg("path", { d: body }));
  const defs = svg("defs");
  defs.append(clip);
  const level = 95 - full * 67;
  el.append(
    defs,
    svg("rect", { class: "tub-side", x: 0, y: 20, width: 200, height: 8 }),
    svg("path", { class: "tub-side", d: body }),
    svg("rect", { class: "tub-soup", x: 0, y: level, width: 200, height: 95 - level, "clip-path": `url(#${id})` }),
    svg("rect", { class: "tub-side", x: 40, y: 95, width: 10, height: 17 }),
    svg("rect", { class: "tub-side", x: 150, y: 95, width: 10, height: 17 })
  );
  return el;
}

function drawTubs(host, liters) {
  const n = liters / BATHTUB;
  const count = Math.max(1, Math.ceil(n - 0.1)); // about one bathtub is one, filled to the brim
  host.replaceChildren(...Array.from({ length: count }, (_, i) => tub(Math.min(1, Math.max(0, n - i)) || 0, `tub-${i}`)));
  host.setAttribute("role", "img");
  host.setAttribute("aria-label", `${liters} liters of soup in bathtubs of ${BATHTUB} liters`);
}

export function amounts(entries) {
  const { meters, liters } = facts(entries);
  const length = document.getElementById("length"), tubs = document.getElementById("tubs");
  document.getElementById("length-panel").hidden = !meters;
  document.getElementById("soup-panel").hidden = !entries.length;
  if (!entries.length) return;
  drawTubs(tubs, liters);
  let width = 0;
  new ResizeObserver(() => {
    if (length.clientWidth === width) return;
    width = length.clientWidth;
    drawLength(length, meters);
  }).observe(length);
}
