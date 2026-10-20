// Every pack, the closing part of /bamiversary/: all the photos in one row, first noodle to last. The section
// pins to the screen and scrolling down slides the row sideways, with the number of the pack in the middle
// counting up underneath. With less motion asked for, it's a plain row to swipe through instead.
import { h } from "./dom.js";
import { formatDate, padNumber, title } from "./format.js";

const SPEED = 3; // the row moves at least this many pixels sideways for every pixel scrolled down
const SCREENS = 20; // and the whole row takes at most this many screens of scrolling
const still = matchMedia("(prefers-reduced-motion: reduce)");

export function strip(section, entries) {
  const row = section.querySelector(".strip-row");
  const count = section.querySelector(".strip-count");
  const name = section.querySelector(".strip-name");
  const packs = [...entries].sort((a, b) => a.number - b.number);
  section.hidden = !packs.length;
  if (!packs.length) return;
  row.replaceChildren(...packs.map((e) => h("img", { src: e.photo, alt: title(e), loading: "lazy", decoding: "async" })));

  let step = 0, travel = 0, shown = -1;
  const show = (i) => {
    if (i === shown) return;
    shown = i;
    count.textContent = padNumber(packs[i].number);
    name.textContent = `${title(packs[i])} · ${formatDate(packs[i].date)}`;
  };
  // How far the row has to travel, and so how tall the section is: one screen to pin in, plus the travel.
  const measure = () => {
    const tiles = row.children;
    step = tiles.length > 1 ? tiles[1].offsetLeft - tiles[0].offsetLeft : 0;
    travel = step * (packs.length - 1);
    section.classList.toggle("free", still.matches);
    section.style.height = still.matches ? "" : `calc(100svh + ${Math.ceil(Math.min(travel / SPEED, innerHeight * SCREENS))}px)`;
    move();
  };
  const track = section.querySelector(".strip-track");
  track.addEventListener("scroll", () => still.matches && step && show(Math.round(track.scrollLeft / step)), { passive: true });
  const move = () => {
    if (still.matches) return show(step ? Math.round(track.scrollLeft / step) : 0);
    const top = section.getBoundingClientRect().top;
    const room = section.offsetHeight - innerHeight;
    const progress = room > 0 ? Math.min(1, Math.max(0, -top / room)) : 0;
    row.style.transform = `translate3d(${-progress * travel}px, 0, 0)`;
    show(step ? Math.round((progress * travel) / step) : 0);
  };
  let queued = false;
  addEventListener("scroll", () => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      move();
    });
  }, { passive: true });
  addEventListener("resize", measure);
  still.addEventListener("change", measure);
  measure();
}
