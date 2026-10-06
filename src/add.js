import { COUNTRIES } from "../lib/countries.js";
import { api, h } from "./dom.js";
import { flag } from "./format.js";
import { resizePhoto } from "./resize.js";

const loginForm = document.getElementById("login");
const entryForm = document.getElementById("entry");
const logout = document.getElementById("logout");
const preview = document.getElementById("preview");
const photoLabel = document.getElementById("photo-label");

const countryNames = new Intl.DisplayNames(["en"], { type: "region" });
entryForm.country.append(
  ...COUNTRIES.map((code) => ({ code, name: countryNames.of(code) }))
    .sort((a, b) => a.name.localeCompare(b.name))
    .map(({ code, name }) => h("option", { value: code }, `${flag(code)} ${name}`))
);

function today() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function show(loggedIn) {
  loginForm.hidden = loggedIn;
  entryForm.hidden = !loggedIn;
  logout.hidden = !loggedIn;
  if (loggedIn && !entryForm.date.value) entryForm.date.value = today();
  (loggedIn ? entryForm.brand : loginForm.password).focus();
}

function setBusy(form, busy, label) {
  const button = form.querySelector("button[type=submit]");
  button.disabled = busy;
  button.textContent = label;
}

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const error = loginForm.querySelector(".error");
  error.textContent = "";
  setBusy(loginForm, true, "…");
  try {
    await api("/api/login", { method: "POST", body: { password: loginForm.password.value } });
    loginForm.reset();
    show(true);
  } catch (err) {
    error.textContent = err.message;
  } finally {
    setBusy(loginForm, false, "LOG IN");
  }
});

logout.addEventListener("click", async () => {
  await api("/api/login", { method: "DELETE" });
  show(false);
});

entryForm.photo.addEventListener("change", () => {
  const file = entryForm.photo.files[0];
  if (preview.src) URL.revokeObjectURL(preview.src);
  preview.hidden = !file;
  photoLabel.hidden = Boolean(file);
  if (file) preview.src = URL.createObjectURL(file);
});

entryForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const error = entryForm.querySelector(".error");
  error.textContent = "";
  setBusy(entryForm, true, "SAVING…");
  try {
    const fields = Object.fromEntries(new FormData(entryForm));
    const photo = await resizePhoto(entryForm.photo.files[0]);
    await api("/api/entries", { method: "POST", body: { ...fields, photo } });
    location.href = "/";
  } catch (err) {
    error.textContent = err.message;
    setBusy(entryForm, false, "SAVE");
  }
});

api("/api/login")
  .then((session) => show(session.loggedIn))
  .catch(() => show(false));
