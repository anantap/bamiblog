// Newest first; entries from the same day by number, highest first.
export function sortEntries(entries) {
  return [...entries].sort((a, b) => b.date.localeCompare(a.date) || b.number - a.number);
}

export function formatDate(iso) {
  const [y, m, d] = iso.split("-");
  return `${d}${m}${y}`;
}

export function padNumber(n) {
  return String(n).padStart(3, "0");
}

export function flag(code) {
  if (!code) return "";
  return [...code.toUpperCase()].map((c) => String.fromCodePoint(0x1f1e6 + c.charCodeAt(0) - 65)).join("");
}

export function stars(rating) {
  return { on: "★".repeat(rating), off: "★".repeat(5 - rating) };
}

export function title({ brand, flavour, country }) {
  const name = [brand, flavour].filter(Boolean).join(" — ");
  return [flag(country), name].filter(Boolean).join(" ");
}
