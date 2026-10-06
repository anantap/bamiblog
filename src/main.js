import { api, h } from "./dom.js";
import { caption, formatDate, groupEntries, padNumber } from "./format.js";

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

function tile(entry) {
  return h(
    "button",
    { class: "tile", type: "button", onclick: () => openDetail(entry) },
    h("span", { class: "number" }, padNumber(entry.number)),
    h("img", { src: entry.photo, alt: caption(entry), loading: "lazy", decoding: "async" }),
    h("span", { class: "caption" }, caption(entry))
  );
}

function dateCard(group) {
  return h(
    "div",
    { class: "date-card" },
    h("span", {}, formatDate(group.date)),
    group.place && h("span", {}, group.place)
  );
}

function render() {
  grid.setAttribute("aria-busy", "false");
  if (entries.length === 0) {
    grid.replaceChildren(h("p", { class: "empty" }, "No noodles yet."));
    return;
  }
  grid.replaceChildren(...groupEntries(entries).flatMap((group) => [dateCard(group), ...group.entries.map(tile)]));
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
    h("img", { class: "detail-photo", src: entry.photo, alt: caption(entry) }),
    h("p", { class: "number" }, padNumber(entry.number)),
    h("p", { class: "caption" }, caption(entry)),
    entry.note && h("p", { class: "note" }, entry.note),
    h("p", { class: "meta" }, [formatDate(entry.date), entry.place].filter(Boolean).join(" · ")),
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
    document.getElementById("add-link").hidden = !loggedIn;
    render();
  } catch (err) {
    grid.setAttribute("aria-busy", "false");
    grid.replaceChildren(h("p", { class: "empty" }, `Couldn't load the noodles: ${err.message}`));
  }
}

load();
