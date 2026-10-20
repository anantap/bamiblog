import { sortEntries } from "./format.js";

// The country code at the end of a place like "The Hague, NL".
export function placeCountry(place) {
  return /,\s*([A-Z]{2})$/.exec(place ?? "")?.[1] ?? "";
}

// Noodles grouped by country, newest first: where they come from ("made") or where they were eaten ("eaten").
export function byCountry(entries, mode) {
  const groups = new Map();
  for (const entry of sortEntries(entries)) {
    const code = mode === "eaten" ? placeCountry(entry.place) : entry.country;
    if (!code) continue;
    if (!groups.has(code)) groups.set(code, []);
    groups.get(code).push(entry);
  }
  return groups;
}
