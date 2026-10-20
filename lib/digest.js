import { formatDate, padNumber, title } from "../src/format.js";

const WEEK = 7 * 24 * 60 * 60 * 1000;

// One-off extras for a single weekly email: included in emails built from `from` (if set) up to and including
// `until` (UTC dates), so previews show them ahead of time. Remove an entry once its email has gone out.
export const ONE_OFFS = [
  {
    from: "2026-10-20",
    until: "2026-10-26",
    markdown: (site) =>
      `![Monday mood](${site}/email/monday-mood-2.jpg)\n\nMonday mood (via [Bastiaan](https://www.instagram.com/bastiaansizoo/))`,
  },
];

function oneOffsFor(now) {
  const today = new Date(now).toISOString().slice(0, 10);
  return ONE_OFFS.filter((o) => (!o.from || o.from <= today) && today <= o.until);
}

// The footer item (from the mail tab on /add) for the email built at `now`: the oldest one not sent yet.
// Weeks that already have a hard-coded one-off above skip the queue, so each email gets one item at most.
export function pickExtra(extras, now = Date.now()) {
  if (oneOffsFor(now).length > 0) return null;
  return extras.filter((e) => !e.sentAt).sort((a, b) => a.createdAt - b.createdAt)[0] ?? null;
}

// A footer item as Markdown: the image (linked when there's a link), then "caption (via credit)".
export function extraMarkdown({ image, link, caption, credit, creditUrl }) {
  const picture = link ? `[![${caption}](${image})](${link})` : `![${caption}](${image})`;
  const via = credit ? ` (via ${creditUrl ? `[${credit}](${creditUrl})` : credit})` : "";
  return `${picture}\n\n${caption}${via}`;
}

// Noodles added after the last email went out (or in the past week, before the first one), oldest first.
export function newSince(entries, since, now = Date.now()) {
  const from = since ?? now - WEEK;
  return entries.filter((e) => e.createdAt > from && e.createdAt <= now).sort((a, b) => a.number - b.number);
}

// One Markdown email for Buttondown: the bami.blog logo, then each noodle's number, date, name, location, photo
// and review. No ratings. The logo is a PNG because many mail apps don't show SVG.
export function digestEmail(entries, site = "https://bami.blog", now = Date.now(), extra = null) {
  const subject = "weekly ingest";
  const sections = entries.map((e) => {
    const name = title(e);
    const meta = [formatDate(e.date), e.place].filter(Boolean).join(" · ");
    return [`## ${padNumber(e.number)} · ${name}`, meta, `![${name}](${e.photo})`, e.review].filter(Boolean).join("\n\n");
  });
  const heading = `<img src="${site}/logo-email.png" alt="bami.blog" width="200" height="96" />`;
  const extras = [...oneOffsFor(now).map((o) => o.markdown(site)), ...(extra ? [extraMarkdown(extra)] : [])];
  const body = `${heading}\n\n${[...sections, ...extras, `All the noods: [bami.blog](${site})`].join("\n\n---\n\n")}`;
  return { subject, body };
}
