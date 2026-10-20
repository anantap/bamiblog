// Every pack, the closing part of /bamiversary/: all the photos in one row, running from left to right like a
// ticker, round and round, with the number of the pack in the middle counting up underneath. A swipe (a drag, or a
// trackpad swipe) moves it one picture on or back, settling with that picture in the middle, and it runs on by
// itself a moment after. With less motion asked for, it's a plain row to swipe through instead.
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
  const tile = (e) => h("img", { src: e.photo, alt: title(e), loading: "lazy", decoding: "async", draggable: "false" });

  let step = 0, loop = 0, at = 0, held = false, restUntil = 0, before = 0, shown = -1, glide = null;
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
      if (glide) {
        const t = Math.min(1, (now - glide.start) / 350), eased = 1 - (1 - t) ** 3;
        at = wrapAt(glide.from + (glide.to - glide.from) * eased);
        if (t === 1) glide = null;
        restUntil = now + 1500;
      } else if (!held && now > restUntil) at = (at + SPEED * seconds) % loop;
      const x = at - loop; // from one copy to the left of the screen, moving right
      row.style.transform = `translate3d(${x}px, 0, 0)`;
      show(middle(x));
    }
    requestAnimationFrame(run);
  };
  track.addEventListener("scroll", () => still.matches && step && show(Math.min(packs.length - 1, Math.round(track.scrollLeft / step))), { passive: true });
  // Dragging moves the row with the finger or mouse; scrolling the page up and down still works on phones, since
  // the row only takes sideways moves (touch-action: pan-y). A mouse resting on it stops it.
  const wrapAt = (v) => ((v % loop) + loop) % loop;
  // Glide to a picture sitting in the middle: the next one on (way > 0), the one before (way < 0) or the nearest.
  const settle = (way) => {
    const centred = innerWidth / 2 - row.children[0].offsetWidth / 2; // `at` is a multiple of step from here
    const k = (at - centred) / step;
    const to = centred + (way > 0 ? Math.ceil(k + 0.001) : way < 0 ? Math.floor(k - 0.001) : Math.round(k)) * step;
    glide = { from: at, to, start: performance.now() };
  };
  let drag = null, hovered = false, swiped = 0;
  track.addEventListener("pointerdown", (e) => {
    if (still.matches) return;
    drag = { x: e.clientX, at };
    held = true;
    track.setPointerCapture(e.pointerId);
  });
  track.addEventListener("pointermove", (e) => drag && (at = wrapAt(drag.at + e.clientX - drag.x)));
  const release = (e) => {
    if (!drag) return;
    const moved = e.type === "pointerup" ? e.clientX - drag.x : 0; // a cancelled touch was the page scrolling
    drag = null;
    held = hovered;
    settle(Math.abs(moved) > 30 ? Math.sign(moved) : 0);
  };
  track.addEventListener("pointerup", release);
  track.addEventListener("pointercancel", release);
  track.addEventListener("pointerenter", (e) => e.pointerType === "mouse" && (hovered = held = true));
  track.addEventListener("pointerleave", (e) => e.pointerType === "mouse" && ((hovered = false), drag || (held = false)));
  // One trackpad swipe (a burst of sideways wheel events, momentum and all) is one picture.
  track.addEventListener("wheel", (e) => {
    if (still.matches || Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return;
    e.preventDefault();
    const now = performance.now();
    if (now - swiped > 250 && Math.abs(e.deltaX) > 3) settle(-Math.sign(e.deltaX));
    swiped = now;
  }, { passive: false });
  let width = innerWidth;
  addEventListener("resize", () => innerWidth !== width && ((width = innerWidth), build())); // not when a phone's bar hides
  still.addEventListener("change", build);
  build();
  // The ticker starts with the first pack (the last tile of a copy) in the middle of the screen.
  at = (((innerWidth / 2 - row.children[0].offsetWidth / 2 + step) % loop) + loop) % loop;
  requestAnimationFrame(run);
}
