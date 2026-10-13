import { marked } from "marked";
import { EMAIL_CSS } from "./email-style.js";

const escape = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

// The weekly email as a page, roughly as a mail app shows it: subject on top, the body rendered from Markdown
// in a 600px column, styled with the same CSS as Buttondown. Buttondown adds its own header and footer.
export function emailPage({ subject, body } = {}, note = "") {
  const content = body ? marked.parse(body) : `<p class="empty">${escape(note)}</p>`;
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="robots" content="noindex" />
<title>${escape(subject ? `Preview: ${subject}` : "Preview")}</title>
<style>
${EMAIL_CSS}
  /* Preview only: the mail app around the email. */
  body { margin: 0; background: #f3f3f1; }
  .bar { padding: 12px 16px; background: #fff; border-bottom: 1px solid #e4e3de; font: 13px/1.4 -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif; color: #8a8a85; }
  .bar strong { display: block; font-size: 17px; color: #222; }
  main { max-width: 600px; margin: 16px auto; padding: 24px 20px; background: #fff; }
  main img { display: block; }
  .empty { color: #8a8a85; }
</style>
</head>
<body>
<div class="bar">${subject ? `Subject<strong>${escape(subject)}</strong>` : "Next weekly ingest"}</div>
<main>
${content}
</main>
</body>
</html>`;
}
