import { marked } from "marked";

const escape = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

// The weekly email as a page, roughly as a mail app shows it: subject on top, the body rendered from Markdown
// in a 600px column. Buttondown's own template adds its fonts, header and footer on top of this.
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
  body { margin: 0; background: #f3f3f1; color: #222; font: 16px/1.55 -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif; }
  .bar { padding: 12px 16px; background: #fff; border-bottom: 1px solid #e4e3de; font-size: 13px; color: #8a8a85; }
  .bar strong { display: block; font-size: 17px; color: #222; }
  main { max-width: 600px; margin: 16px auto; padding: 24px 20px; background: #fff; }
  h2 { font-size: 19px; margin: 0 0 4px; }
  p { margin: 0 0 16px; }
  img { max-width: 100%; height: auto; display: block; }
  hr { border: 0; border-top: 1px solid #e4e3de; margin: 28px 0; }
  a { color: #222; }
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
