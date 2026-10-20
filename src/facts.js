// The bamiversary fact sheet: rough totals over every noodle in the log.
export const METERS_PER_PACK = 50; // a pack holds a few dozen strands of roughly 1–1.5 m
export const LITERS_PER_PACK = 0.45; // the water most packs ask for
// Fried and dry noodles (mie goreng, yakisoba, …) don't come with soup.
const NO_SOUP = /goreng|fried|dry|yakisoba|mazemen/i;

export function facts(entries) {
  const soupy = entries.filter((e) => !NO_SOUP.test(`${e.brand ?? ""} ${e.flavour ?? ""}`));
  return {
    packs: entries.length,
    meters: Math.round(entries.length * METERS_PER_PACK),
    liters: Math.round(soupy.length * LITERS_PER_PACK),
  };
}
