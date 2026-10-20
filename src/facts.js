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
