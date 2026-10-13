// CSS for the weekly email, matching the blog: DM Mono, anthracite text, thin grey rules, no rounded corners.
// Paste it into Buttondown's custom CSS setting; the /api/digest?mode=html preview uses the same rules.
// It only targets plain elements, since Buttondown's own class names aren't ours to rely on. Mail apps without
// web fonts (Gmail, Outlook) fall back to the next monospace font in the list.
export const EMAIL_CSS = `@import url("https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&display=swap");

body {
  background: #ffffff;
  color: #2e2e30;
  font-family: "DM Mono", ui-monospace, "SF Mono", Menlo, Consolas, "Courier New", monospace;
  font-size: 14px;
  line-height: 1.6;
}

h1, h2, h3 {
  font-family: "DM Mono", ui-monospace, "SF Mono", Menlo, Consolas, "Courier New", monospace;
  font-weight: 500;
  color: #2e2e30;
  letter-spacing: 0;
}

h2 {
  font-size: 15px;
  line-height: 1.4;
  margin: 0 0 4px;
}

p {
  font-size: 14px;
  line-height: 1.6;
  margin: 0 0 16px;
}

a {
  color: #2e2e30;
  text-decoration: underline;
}

img {
  max-width: 100%;
  height: auto;
  border-radius: 0;
}

hr {
  border: 0;
  border-top: 1px solid #e4e3de;
  margin: 28px 0;
}
`;
