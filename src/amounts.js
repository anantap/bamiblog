// Two of the year's amounts on /bamiversary/, drawn to show how much they are: all the noodles as one noodle a pixel
// a meter long, snaking back and forth with a mark every kilometer, and all the soup cooling an AI data center.
import { svg } from "./charts.js";
import { h } from "./dom.js";
import { facts } from "./facts.js";
import { cubic, noodle } from "./noodles.js";
import { DATA_CENTER } from "./story.js";

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

// The soup cooling an AI data center, in the map's noodle bricks: a pile of red bricks, a liter each (or more, when
// there's a lot of soup), runs down a pipe into the data center, built like a factory of grey bricks (a hall with a
// sawtooth roof, a door and windows, and a chimney), emptying in real time at the rate a big one goes through water.
// While it runs, the windows flicker and smoke rises from the chimney; once the soup's gone it goes dark, a moment
// later the pile fills up again, and round it goes. With less motion asked for it stands still, full and running.
const BRICK = { w: 14, h: 10, gap: 2 }; // as wide to tall as the map's bricks, with the same white between them
const PILE = 8; // bricks across the pile
const PIPE = 4; // bricks along the pipe
const HALL = 15, TOOTH = 5, CHIMNEY = 2; // bricks across the hall and each tooth of its roof, and the chimney
const SMOKE = 5; // puffs of smoke
const DARK = 2, REFILL = 0.8; // seconds it stays dark, and takes to fill up again
const still = matchMedia("(prefers-reduced-motion: reduce)");

function drawDataCenter(host, liters) {
  const per = Math.max(1, Math.ceil(liters / 400)); // liters a brick
  const count = Math.max(1, Math.round(liters / per));
  const run = Math.max(1, liters / DATA_CENTER); // seconds it lasts
  const pileRows = Math.ceil(count / PILE);
  const walls = Math.max(6, pileRows - 10); // the hall's walls, below the roof
  const stack = walls + 9; // the chimney's top
  const rows = Math.max(pileRows, stack + 6); // with room for the smoke
  const stepX = BRICK.w + BRICK.gap, stepY = BRICK.h + BRICK.gap;
  const y = (row) => (rows - 1 - row) * stepY;
  const brick = (col, row, cls) => svg("rect", { class: cls, x: col * stepX, y: y(row), width: BRICK.w, height: BRICK.h });
  const factory = PILE + PIPE; // its first column
  const wide = (factory + HALL + CHIMNEY) * stepX - BRICK.gap;
  const el = svg("svg", { viewBox: `0 0 ${wide} ${rows * stepY + 20}`, class: "cooling" });
  const label = (x, text) => svg("text", { x, y: rows * stepY + 16 }, text);
  el.append(label((PILE * stepX - BRICK.gap) / 2, "soup"), label((factory + (HALL + CHIMNEY) / 2) * stepX, "AI data center"));
  // The pile, filled from the bottom up; it empties from the top.
  const soup = Array.from({ length: count }, (_, i) => brick(i % PILE, Math.floor(i / PILE), "cool-soup"));
  const pipe = Array.from({ length: PIPE }, (_, i) => brick(PILE + i, 0, "cool-pipe"));
  const lights = [], building = [];
  for (let col = 0; col < HALL; col++) {
    const roof = Math.ceil((((col % TOOTH) + 1) * 3) / TOOTH); // each tooth rises to the right, then drops
    for (let row = 0; row < walls + roof; row++) {
      const door = row < 2 && col >= 6 && col <= 8;
      if (door) continue;
      const pane = row >= 1 && row < walls - 1 && row % 2 === 1 && col % 3 === 1;
      (pane ? lights : building).push(brick(factory + col, row, pane ? "cool-light" : "cool-rack"));
    }
  }
  for (let col = 0; col < CHIMNEY; col++) for (let row = 0; row < stack; row++) building.push(brick(factory + HALL + col, row, "cool-rack"));
  const smoke = Array.from({ length: SMOKE }, () => svg("rect", { class: "cool-smoke", width: BRICK.w, height: BRICK.h }));
  el.append(...building, ...lights, ...pipe, ...soup, ...smoke);
  const timer = h("p", { class: "cool-timer" });
  host.replaceChildren(el, timer);
  host.setAttribute("role", "img");
  host.setAttribute("aria-label", `${liters} liters of soup, a brick for ${per === 1 ? "every liter" : `every ${per} liters`}, cooling an AI data center for ${Math.round(run)} seconds`);

  const show = (left, t, running) => {
    soup.forEach((b, i) => b.classList.toggle("gone", i >= left));
    pipe.forEach((b, i) => b.classList.toggle("on", running && (i + Math.floor(t * 12)) % 3 === 0));
    lights.forEach((b, i) => b.classList.toggle("on", running && Math.sin(i * 7.3 + Math.floor(t * 4) * 2.1) > -0.6));
    // Puffs rise from the chimney, drifting back over the roof and fading as they go.
    smoke.forEach((b, i) => {
      const up = (t * 1.6 + (i * 6) / SMOKE) % 6;
      b.setAttribute("x", (factory + HALL + CHIMNEY / 2 - 0.5 - up * 0.45 + Math.sin(i + up) * 0.3) * stepX);
      b.setAttribute("y", y(stack) - up * stepY);
      b.style.opacity = running ? 1 - up / 6 : 0;
    });
    timer.textContent = `${Math.min(t, run).toFixed(1)} s`;
  };
  if (still.matches) return show(count, run, true);
  let start = 0, seen = false;
  const frame = (now) => {
    if (!host.isConnected) return;
    if (seen) {
      start ||= now;
      const t = (now - start) / 1000;
      if (t < run) show(Math.ceil(count * (1 - t / run)), t, true);
      else if (t < run + DARK) show(0, run, false);
      else if (t < run + DARK + REFILL) show(Math.ceil((count * (t - run - DARK)) / REFILL), 0, false);
      else start = now;
    }
    requestAnimationFrame(frame);
  };
  // It only runs on screen, starting from full each time it comes into view.
  new IntersectionObserver(([e]) => ((seen = e.isIntersecting), (start = 0))).observe(host);
  show(count, 0, false);
  requestAnimationFrame(frame);
}

export function amounts(entries) {
  const { meters, liters } = facts(entries);
  const length = document.getElementById("length");
  document.getElementById("length-panel").hidden = !meters;
  document.getElementById("soup-panel").hidden = !entries.length;
  if (!entries.length) return;
  if (liters) drawDataCenter(document.getElementById("cooling"), liters);
  let width = 0;
  new ResizeObserver(() => {
    if (length.clientWidth === width) return;
    width = length.clientWidth;
    drawLength(length, meters);
  }).observe(length);
}
