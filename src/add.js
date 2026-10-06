import { COUNTRIES } from "../lib/countries.js";
import { api, h } from "./dom.js";
import { flag } from "./format.js";
import { createCropper } from "./cropper.js";

const loginForm = document.getElementById("login");
const entryForm = document.getElementById("entry");
const logout = document.getElementById("logout");
const picker = document.getElementById("picker");
const cropParts = ["cropper", "crop-tools"].map((id) => document.getElementById(id));
const cropper = createCropper(document.querySelector("#cropper canvas"), {
  preview: document.querySelector(".tile-preview"),
});

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
    setBusy(loginForm, false, "Log in");
  }
});

logout.addEventListener("click", async () => {
  await api("/api/login", { method: "DELETE" });
  show(false);
});

entryForm.photo.addEventListener("change", async () => {
  const file = entryForm.photo.files[0];
  if (!file) return;
  picker.hidden = true;
  for (const part of cropParts) part.hidden = false;
  await cropper.load(file);
});

document.getElementById("new-photo").addEventListener("click", () => entryForm.photo.click());

entryForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const error = entryForm.querySelector(".error");
  error.textContent = "";
  setBusy(entryForm, true, "Saving…");
  try {
    const fields = Object.fromEntries(new FormData(entryForm));
    const photo = cropper.toDataURL();
    await api("/api/entries", { method: "POST", body: { ...fields, photo } });
    location.href = "/";
  } catch (err) {
    error.textContent = err.message;
    setBusy(entryForm, false, "Save");
  }
});

api("/api/login")
  .then((session) => show(session.loggedIn))
  .catch(() => show(false));
