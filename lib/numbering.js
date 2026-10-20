// Next entry number: one past the highest existing one, so an empty log starts at 001.
export function nextNumber(entries) {
  return entries.reduce((max, entry) => Math.max(max, entry.number), 0) + 1;
}

// Every hundredth noodle (100, 200, …) gets a bami special.
export function isSpecial(number) {
  return number > 0 && number % 100 === 0;
}
