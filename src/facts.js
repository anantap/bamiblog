// The bamiversary fact sheet: rough totals over every noodle in the log.
export const METERS_PER_PACK = 50; // a pack holds a few dozen strands of roughly 1–1.5 m
export const LITERS_PER_PACK = 0.45; // the water most packs ask for
// Fried and dry noodles (mie goreng, yakisoba, …) don't come with soup.
const NO_SOUP = /goreng|fried|dry|yakisoba|mazemen/i;

export function facts(entries) {
  const soupy = entries.filter((e) => !NO_SOUP.test(`${e.brand ?? ""} ${e.flavour ?? ""}`));
  return {
    packs: entries.length,
    flavours: brands(entries).reduce((n, brand) => n + brand.flavours.length, 0),
    meters: Math.round(entries.length * METERS_PER_PACK),
    liters: Math.round(soupy.length * LITERS_PER_PACK),
  };
}

// How many noodles were logged in each hour of the day (0–23), in Dutch time. Posting time stands in for eating
// time: noodles only store the date they were eaten.
export function hours(entries, timeZone = "Europe/Amsterdam") {
  const hour = new Intl.DateTimeFormat("en-GB", { hour: "numeric", hourCycle: "h23", timeZone });
  const counts = Array(24).fill(0);
  for (const { createdAt } of entries) if (createdAt) counts[Number(hour.format(createdAt))]++;
  return counts;
}

// Names compared loosely, so "Mi Goreng" and "mi  goreng" are the same flavour.
const key = (name) => (name ?? "").trim().replace(/\s+/g, " ").toLowerCase();

// Every brand with the flavours eaten of it, busiest first: [{ brand, count, flavours: [{ flavour, count }] }].
// A noodle without a flavour counts as its own one ("").
export function brands(entries) {
  const byBrand = new Map();
  for (const { brand, flavour } of entries) {
    if (!byBrand.has(key(brand))) byBrand.set(key(brand), { brand: (brand ?? "").trim(), count: 0, flavours: new Map() });
    const group = byBrand.get(key(brand));
    group.count++;
    if (!group.flavours.has(key(flavour))) group.flavours.set(key(flavour), { flavour: (flavour ?? "").trim(), count: 0 });
    group.flavours.get(key(flavour)).count++;
  }
  const busiest = (a, b) => b.count - a.count || key(a.brand ?? a.flavour).localeCompare(key(b.brand ?? b.flavour));
  return [...byBrand.values()].map((b) => ({ ...b, flavours: [...b.flavours.values()].sort(busiest) })).sort(busiest);
}

// Noodles per month (0–11, by the date eaten) and hour (0–23, by when they were logged in Dutch time): rows are months.
export function monthHours(entries, timeZone = "Europe/Amsterdam") {
  const hour = new Intl.DateTimeFormat("en-GB", { hour: "numeric", hourCycle: "h23", timeZone });
  const grid = Array.from({ length: 12 }, () => Array(24).fill(0));
  for (const { date, createdAt } of entries) if (date && createdAt) grid[Number(date.slice(5, 7)) - 1][Number(hour.format(createdAt))]++;
  return grid;
}

const DAY = 24 * 60 * 60 * 1000;

// Noodles per week by the country they come from, from the first noodle's week to the last's. The `top` busiest
// countries get a series each, busiest first; the rest share one with country "".
export function weekly(entries, top = 5) {
  const dated = entries.filter((e) => e.date);
  if (!dated.length) return { start: 0, weeks: 0, series: [] };
  const day = (e) => Date.parse(`${e.date}T00:00:00Z`);
  const start = Math.min(...dated.map(day));
  const weeks = Math.floor((Math.max(...dated.map(day)) - start) / (7 * DAY)) + 1;
  const totals = new Map();
  for (const e of dated) totals.set(e.country ?? "", (totals.get(e.country ?? "") ?? 0) + 1);
  const named = [...totals].filter(([c]) => c).sort((a, b) => b[1] - a[1]).slice(0, top).map(([c]) => c);
  const series = [...named, ""].map((country) => ({ country, counts: Array(weeks).fill(0) }));
  for (const e of dated) {
    const s = series.find((x) => x.country === (named.includes(e.country) ? e.country : ""));
    s.counts[Math.floor((day(e) - start) / (7 * DAY))]++;
  }
  return { start, weeks, series: series.filter((s) => s.counts.some(Boolean)) };
}
