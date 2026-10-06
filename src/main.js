import { api, h } from "./dom.js";
import { formatDate, padNumber, sortEntries, stars, title } from "./format.js";
import { SEND_NOODS } from "./send-noods.js";

const grid = document.getElementById("grid");
let loggedIn = false;
let entries = [];

function starLine(rating) {
  const { on, off } = stars(rating);
  return h("span", { class: "stars", "aria-label": `${rating} out of 5` }, on, h("span", { class: "off" }, off));
}

async function remove(entry) {
  if (!confirm(`Delete ${padNumber(entry.number)}?`)) return;
  try {
    await api(`/api/entries?id=${encodeURIComponent(entry.id)}`, { method: "DELETE" });
    entries = entries.filter((e) => e.id !== entry.id);
    render();
  } catch (err) {
    alert(err.message);
  }
}

function tile(entry) {
  return h(
    "figure",
    { class: "tile" },
    h(
      "figcaption",
      { class: "tile-head" },
      h("span", { class: "number" }, padNumber(entry.number)),
      h("span", { class: "date" }, formatDate(entry.date))
    ),
    h(
      "div",
      { class: "frame" },
      h("img", { src: entry.photo, alt: title(entry), loading: "lazy", decoding: "async" }),
      loggedIn &&
        h("button", { class: "remove", type: "button", "aria-label": `Delete ${padNumber(entry.number)}`, onclick: () => remove(entry) }, "×")
    ),
    starLine(entry.rating)
  );
}

function render() {
  grid.setAttribute("aria-busy", "false");
  if (entries.length === 0) {
    grid.replaceChildren(
      h(
        "p",
        { class: "empty" },
        h("a", { class: "lettering", href: SEND_NOODS }, h("img", { src: "/lettering/send-noods.svg", alt: "send noods", width: 616, height: 132 }))
      )
    );
    return;
  }
  grid.replaceChildren(...sortEntries(entries).map(tile));
}

async function load() {
  try {
    const [list, session] = await Promise.all([api("/api/entries"), api("/api/login")]);
    entries = list;
    loggedIn = session.loggedIn;
    render();
  } catch (err) {
    grid.setAttribute("aria-busy", "false");
    grid.replaceChildren(h("p", { class: "empty" }, `Couldn't load the noodles: ${err.message}`));
  }
}

load();
