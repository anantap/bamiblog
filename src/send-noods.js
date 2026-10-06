// The address is put together in the browser so it never sits in the HTML for spam scrapers.
const address = ["anantadotwork", "gmail.com"].join("@");

export const SEND_NOODS = `mailto:${address}?subject=noods`;

// Points every <a data-send-noods> at the address.
export function linkSendNoods(root = document) {
  for (const link of root.querySelectorAll("a[data-send-noods]")) link.href = SEND_NOODS;
}
