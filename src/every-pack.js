// Every pack, the end of /bamiversary/: all the photos in one square-ish grid, oldest at the top left, and in the
// room left after the newest, "And more to come…". The columns are picked so the grid is about as wide as tall and
// that room fits the words; with none that does, they get a row of their own.
import { h } from "./dom.js";
import { formatDate, padNumber, title } from "./format.js";

const WORDS = 150; // about how wide "and more to come…" is, in pixels

function columns(count, width) {
  const square = Math.ceil(Math.sqrt(count));
  for (let cols = square; cols <= square + 6; cols++) {
    const left = cols * Math.ceil(count / cols) - count;
    if (left * (width / cols) >= WORDS) return { cols, span: left };
  }
  return { cols: square, span: square };
}

export function everyPack(section, entries) {
  const grid = section.querySelector(".every-grid");
  section.hidden = !entries.length;
  if (!entries.length) return;
  const oldest = [...entries].sort((a, b) => a.number - b.number);
  const more = h("p", { class: "every-more" }, "And more to come…");
  grid.replaceChildren(
    ...oldest.map((e) => h("img", { src: e.photo, alt: title(e), title: `#${padNumber(e.number)} ${title(e)} · ${formatDate(e.date)}`, loading: "lazy", decoding: "async" })),
    more
  );
  const fit = () => {
    const { cols, span } = columns(oldest.length, grid.clientWidth);
    grid.style.setProperty("--cols", cols);
    more.style.gridColumn = `span ${span}`;
  };
  fit();
  new ResizeObserver(fit).observe(grid);
}
