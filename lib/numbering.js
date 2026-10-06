// Next entry number: one past the highest existing one, so an empty log starts at 001.
export function nextNumber(entries) {
  return entries.reduce((max, entry) => Math.max(max, entry.number), 0) + 1;
}
