import { COUNTRIES } from "../lib/countries.js";
import { api, h } from "./dom.js";
import { flag } from "./format.js";
import { createCropper } from "./cropper.js";

const loginForm = document.getElementById("login");
const entryForm = document.getElementById("entry");
const picker = document.getElementById("picker");
const cropParts = ["cropper", "crop-tools"].map((id) => document.getElementById(id));
const cropper = createCropper(document.querySelector("#cropper canvas"));
// /add/?id=… edits that noodle instead of adding a new one.
const editId = new URLSearchParams(location.search).get("id");
const saveLabel = editId ? "Save changes" : "Save";

const countryNames = new Intl.DisplayNames(["en"], { type: "region" });
entryForm.country.append(
  ...COUNTRIES.map((code) => ({ code, name: countryNames.of(code) }))
    .sort((a, b) => a.name.localeCompare(b.name))
    .map(({ code, name }) => h("option", { value: code }, `${flag(code)} ${name}`))
);

// Most noodles get eaten in the same place, so the form starts with the last location saved.
const LAST_PLACE = "bami:last-place";

function lastPlace() {
  try {
    return localStorage.getItem(LAST_PLACE) ?? "";
  } catch {
    return "";
  }
}

function rememberPlace(place) {
  try {
    localStorage.setItem(LAST_PLACE, place);
  } catch {}
}

function today() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// Fills the form with the noodle being edited. Its photo shows in the picker until a new one is chosen.
async function fillForEdit() {
  const entry = (await api("/api/entries")).find((e) => e.id === editId);
  if (!entry) throw new Error("that noodle doesn't exist (any more)");
  for (const field of ["brand", "flavour", "country", "review", "place", "date"]) entryForm[field].value = entry[field] ?? "";
  entryForm.rating.value = String(entry.rating);
  entryForm.photo.required = false;
  picker.classList.add("has-photo");
  picker.style.backgroundImage = `url("${entry.photo}")`;
  picker.querySelector("span").textContent = "Tap to replace the photo";
}

async function show(loggedIn) {
  loginForm.hidden = loggedIn;
  entryForm.hidden = !loggedIn;
  if (loggedIn && editId) {
    document.title = "Edit · bami.blog";
    setBusy(entryForm, false, saveLabel);
    try {
      await fillForEdit();
    } catch (err) {
      entryForm.querySelector(".error").textContent = err.message;
      setBusy(entryForm, true, saveLabel);
      return;
    }
  }
  if (loggedIn && !editId && !entryForm.date.value) entryForm.date.value = today();
  if (loggedIn && !editId && !entryForm.place.value) entryForm.place.value = lastPlace();
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
    const { photo: _file, ...fields } = Object.fromEntries(new FormData(entryForm));
    if (editId) {
      // Only send a photo when a new one was picked; otherwise the current one stays.
      const body = cropper.ready ? { ...fields, photo: cropper.toDataURL() } : fields;
      await api(`/api/entries?id=${encodeURIComponent(editId)}`, { method: "PATCH", body });
    } else {
      const saved = await api("/api/entries", { method: "POST", body: { ...fields, photo: cropper.toDataURL() } });
      rememberPlace(saved.place);
    }
    location.href = "/";
  } catch (err) {
    error.textContent = err.message;
    setBusy(entryForm, false, saveLabel);
  }
});

api("/api/login")
  .then((session) => show(session.loggedIn))
  .catch(() => show(false));
