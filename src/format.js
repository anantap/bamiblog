// Newest first; consecutive entries with the same date and place share one group.
export function groupEntries(entries) {
  const sorted = [...entries].sort((a, b) => b.date.localeCompare(a.date) || b.number - a.number);
  const groups = [];
  for (const entry of sorted) {
    const last = groups[groups.length - 1];
    if (last && last.date === entry.date && last.place === entry.place) {
      last.entries.push(entry);
    } else {
      groups.push({ date: entry.date, place: entry.place, entries: [entry] });
    }
  }
  return groups;
}

export function formatDate(iso) {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

export function padNumber(n) {
  return String(n).padStart(3, "0");
}

export function flag(code) {
  if (!code) return "";
  return [...code.toUpperCase()].map((c) => String.fromCodePoint(0x1f1e6 + c.charCodeAt(0) - 65)).join("");
}

export function caption({ brand, flavour, country, rating }) {
  const name = [brand, flavour].filter(Boolean).join(" — ").toUpperCase();
  return [flag(country), name].filter(Boolean).join(" ") + ` · ★${rating}`;
}
