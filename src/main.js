import { api, h } from "./dom.js";
import { formatDate, padNumber, sortEntries, stars, title } from "./format.js";

const grid = document.getElementById("grid");
const detail = document.getElementById("detail");
const about = document.getElementById("about");
let loggedIn = false;
let entries = [];

document.getElementById("about-open").addEventListener("click", () => about.showModal());

for (const dialog of [detail, about]) {
  // Clicking the backdrop closes the dialog.
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) dialog.close();
  });
}

function starLine(rating) {
  const { on, off } = stars(rating);
  return h("span", { class: "stars", "aria-label": `${rating} out of 5` }, on, h("span", { class: "off" }, off));
}

function tile(entry) {
  return h(
    "button",
    { class: "tile", type: "button", onclick: () => openDetail(entry) },
    h(
      "span",
      { class: "tile-head" },
      h("span", { class: "number" }, padNumber(entry.number)),
      h("span", { class: "date" }, formatDate(entry.date))
    ),
    h("img", { src: entry.photo, alt: title(entry), loading: "lazy", decoding: "async" }),
    starLine(entry.rating)
  );
}

function render() {
  grid.setAttribute("aria-busy", "false");
  if (entries.length === 0) {
    grid.replaceChildren(h("p", { class: "empty" }, "No noodles yet."));
    return;
  }
  grid.replaceChildren(...sortEntries(entries).map(tile));
}

function openDetail(entry) {
  const remove = async () => {
    if (!confirm(`Delete ${padNumber(entry.number)}?`)) return;
    try {
      await api(`/api/entries?id=${encodeURIComponent(entry.id)}`, { method: "DELETE" });
      entries = entries.filter((e) => e.id !== entry.id);
      detail.close();
      render();
    } catch (err) {
      alert(err.message);
    }
  };

  detail.replaceChildren(
    h("img", { class: "detail-photo", src: entry.photo, alt: title(entry) }),
    h(
      "p",
      { class: "tile-head" },
      h("span", { class: "number" }, padNumber(entry.number)),
      h("span", { class: "date" }, formatDate(entry.date))
    ),
    h("p", { class: "title" }, title(entry)),
    starLine(entry.rating),
    entry.note && h("p", { class: "note" }, entry.note),
    h(
      "div",
      { class: "actions" },
      loggedIn && h("button", { class: "delete", type: "button", onclick: remove }, "DELETE"),
      h("button", { class: "close", type: "button", onclick: () => detail.close() }, "CLOSE")
    )
  );
  detail.showModal();
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
