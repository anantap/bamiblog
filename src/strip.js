// Every pack, the closing part of /bamiversary/: all the photos in one row, running from left to right like a
// ticker, round and round, with the number of the pack in the middle counting up underneath. Holding it stops
// it. With less motion asked for, it's a plain row to swipe through instead.
import { h } from "./dom.js";
import { formatDate, padNumber, title } from "./format.js";

const SPEED = 50; // pixels a second
const still = matchMedia("(prefers-reduced-motion: reduce)");

export function strip(section, entries) {
  const track = section.querySelector(".strip-track");
  const row = section.querySelector(".strip-row");
  const count = section.querySelector(".strip-count");
  const name = section.querySelector(".strip-name");
  const oldest = [...entries].sort((a, b) => a.number - b.number);
  section.hidden = !oldest.length;
  if (!oldest.length) return;
  // The ticker moves right, so the pack coming in from the left is the next one up: newest on the left. The still
  // row reads normally, oldest first.
  let packs = oldest;
  const tile = (e) => h("img", { src: e.photo, alt: title(e), loading: "lazy", decoding: "async" });

  let step = 0, loop = 0, at = 0, held = false, before = 0, shown = -1;
  const show = (i) => {
    if (i === shown) return;
    shown = i;
    count.textContent = padNumber(packs[i].number);
    name.textContent = `${title(packs[i])} · ${formatDate(packs[i].date)}`;
  };
  // Enough copies of the row to always cover the screen while one copy's width scrolls past.
  const build = () => {
    section.classList.toggle("free", still.matches);
    packs = still.matches ? oldest : [...oldest].reverse();
    shown = -1;
    row.replaceChildren(...packs.map(tile));
    const tiles = row.children;
    step = tiles.length > 1 ? tiles[1].offsetLeft - tiles[0].offsetLeft : tiles[0].offsetWidth + 8;
    loop = step * packs.length;
    if (still.matches) return show(0);
    const copies = Math.max(2, Math.ceil(innerWidth / loop) + 1);
    for (let c = 1; c < copies; c++) row.append(...packs.map(tile));
  };
  // The pack whose middle is closest to the middle of the screen.
  const middle = (x) => {
    const first = row.children[0].offsetWidth / 2;
    const k = Math.round((innerWidth / 2 - x - first) / step);
    return ((k % packs.length) + packs.length) % packs.length;
  };
  const run = (now) => {
    const seconds = before ? Math.min(0.1, (now - before) / 1000) : 0;
    before = now;
    if (!still.matches) {
      if (!held) at = (at + SPEED * seconds) % loop;
      const x = at - loop; // from one copy to the left of the screen, moving right
      row.style.transform = `translate3d(${x}px, 0, 0)`;
      show(middle(x));
    }
    requestAnimationFrame(run);
  };
  track.addEventListener("scroll", () => still.matches && step && show(Math.min(packs.length - 1, Math.round(track.scrollLeft / step))), { passive: true });
  for (const type of ["pointerdown", "touchstart"]) track.addEventListener(type, () => (held = true), { passive: true });
  for (const type of ["pointerup", "pointercancel", "touchend"]) addEventListener(type, () => (held = false), { passive: true });
  track.addEventListener("pointerenter", (e) => e.pointerType === "mouse" && (held = true));
  track.addEventListener("pointerleave", (e) => e.pointerType === "mouse" && (held = false));
  let width = innerWidth;
  addEventListener("resize", () => innerWidth !== width && ((width = innerWidth), build())); // not when a phone's bar hides
  still.addEventListener("change", build);
  build();
  // The ticker starts with the first pack (the last tile of a copy) in the middle of the screen.
  at = (((innerWidth / 2 - row.children[0].offsetWidth / 2 + step) % loop) + loop) % loop;
  requestAnimationFrame(run);
}
