import { api, h } from "./dom.js";

const MAX_WIDTH = 1080; // the email column is 600px; this stays sharp on phones

// The "mail" tab on /add: footer items for the weekly email (an image, an optional link, "caption (via credit)").
export function initExtras() {
  const form = document.getElementById("extra");
  const picker = document.getElementById("extra-picker");
  const preview = document.getElementById("extra-preview");
  const tools = document.getElementById("extra-tools");
  const queue = document.getElementById("queue");
  const error = form.querySelector(".error");
  const button = form.querySelector("button[type=submit]");
  let bitmap = null;
  let image = null;

  // The image, scaled down to at most 1080px wide, with the blog's red play button on top for videos.
  // Always JPEG, which every mail app shows.
  function render() {
    const width = Math.min(MAX_WIDTH, bitmap.width);
    const height = Math.round((bitmap.height * width) / bitmap.width);
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(bitmap, 0, 0, width, height);
    if (form.video.checked) {
      const r = Math.min(width, height) * 0.11;
      const [x, y] = [width / 2, height / 2];
      ctx.shadowColor = "rgb(0 0 0 / 0.35)";
      ctx.shadowBlur = r * 0.15;
      ctx.shadowOffsetY = r * 0.03;
      ctx.fillStyle = "#e54c2a";
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowColor = "transparent";
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.moveTo(x - r * 0.2, y - r * 0.38);
      ctx.lineTo(x + r * 0.45, y);
      ctx.lineTo(x - r * 0.2, y + r * 0.38);
      ctx.closePath();
      ctx.fill();
    }
    image = canvas.toDataURL("image/jpeg", 0.85);
    preview.src = image;
  }

  function reset() {
    form.reset();
    bitmap?.close();
    bitmap = image = null;
    picker.hidden = false;
    preview.hidden = tools.hidden = true;
    preview.removeAttribute("src");
  }

  async function load() {
    const items = await api("/api/extras");
    queue.replaceChildren(
      ...items.map((item, i) =>
        h(
          "li",
          {},
          h("img", { src: item.image, alt: "", loading: "lazy" }),
          h(
            "div",
            {},
            h("p", {}, item.credit ? `${item.caption} (via ${item.credit})` : item.caption),
            h("p", { class: "hint" }, `${["first", "second", "third"][i] ?? `${i + 1}th`} in line`),
            h("button", { class: "remove", type: "button", onclick: () => remove(item) }, "Delete")
          )
        )
      )
    );
  }

  async function remove(item) {
    if (!confirm(`Delete "${item.caption}"?`)) return;
    try {
      await api(`/api/extras?id=${encodeURIComponent(item.id)}`, { method: "DELETE" });
      await load();
    } catch (err) {
      alert(err.message);
    }
  }

  form.image.addEventListener("change", async () => {
    const file = form.image.files[0];
    if (!file) return;
    bitmap?.close();
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
    render();
    picker.hidden = true;
    preview.hidden = tools.hidden = false;
  });
  form.video.addEventListener("change", () => bitmap && render());
  document.getElementById("extra-new").addEventListener("click", () => form.image.click());

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    error.textContent = "";
    if (!image) {
      error.textContent = "add an image first";
      return;
    }
    button.disabled = true;
    button.textContent = "Adding…";
    try {
      const { caption, link, credit, creditUrl } = Object.fromEntries(new FormData(form));
      await api("/api/extras", { method: "POST", body: { caption, link, credit, creditUrl, image } });
      reset();
      await load();
    } catch (err) {
      error.textContent = err.message;
    } finally {
      button.disabled = false;
      button.textContent = "Add to the mail";
    }
  });

  load().catch((err) => (error.textContent = err.message));
}
