import { sortEntries } from "./format.js";

// Noodles grouped by the country they come from, newest first.
export function byCountry(entries) {
  const groups = new Map();
  for (const entry of sortEntries(entries)) {
    if (!entry.country) continue;
    if (!groups.has(entry.country)) groups.set(entry.country, []);
    groups.get(entry.country).push(entry);
  }
  return groups;
}
