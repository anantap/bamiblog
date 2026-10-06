import { COUNTRIES } from "./countries.js";

const LIMITS = { brand: 60, flavour: 80, note: 280, place: 80 };

function text(value, max) {
  const s = typeof value === "string" ? value.trim() : "";
  return s.length <= max ? s : null;
}

function isRealDate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const d = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
}

// Returns { entry } with cleaned fields, or { error } describing the first problem.
export function validateEntry(input) {
  if (!input || typeof input !== "object") return { error: "invalid entry" };

  const entry = {};
  for (const [field, max] of Object.entries(LIMITS)) {
    const value = text(input[field], max);
    if (value === null) return { error: `${field} is too long (max ${max})` };
    entry[field] = value;
  }
  if (!entry.brand) return { error: "brand is required" };

  const country = typeof input.country === "string" ? input.country.trim().toUpperCase() : "";
  if (country && !COUNTRIES.includes(country)) return { error: "unknown country" };

  const rating = Number(input.rating);
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) return { error: "rating must be 1–5" };

  if (!isRealDate(input.date)) return { error: "date must be YYYY-MM-DD" };

  return {
    entry: {
      brand: entry.brand,
      flavour: entry.flavour,
      country,
      rating,
      note: entry.note,
      place: entry.place,
      date: input.date,
    },
  };
}
