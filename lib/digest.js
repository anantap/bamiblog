import { formatDate, padNumber, title } from "../src/format.js";

const WEEK = 7 * 24 * 60 * 60 * 1000;

// Noodles added after the last email went out (or in the past week, before the first one), oldest first.
export function newSince(entries, since, now = Date.now()) {
  const from = since ?? now - WEEK;
  return entries.filter((e) => e.createdAt > from && e.createdAt <= now).sort((a, b) => a.number - b.number);
}

// One Markdown email for Buttondown: the bami.blog logo, then each noodle's number, date, name, location, photo
// and review. No ratings. The logo is a PNG because many mail apps don't show SVG.
export function digestEmail(entries, site = "https://bami.blog") {
  const subject = "weekly ingest";
  const sections = entries.map((e) => {
    const name = title(e);
    const meta = [formatDate(e.date), e.place].filter(Boolean).join(" · ");
    return [`## ${padNumber(e.number)} · ${name}`, meta, `![${name}](${e.photo})`, e.review].filter(Boolean).join("\n\n");
  });
  const heading = `<img src="${site}/logo-email.png" alt="bami.blog" width="200" height="96" />`;
  const body = `${heading}\n\n${[...sections, `All the noods: [bami.blog](${site})`].join("\n\n---\n\n")}`;
  return { subject, body };
}
