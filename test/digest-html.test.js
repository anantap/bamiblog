import { describe, expect, it } from "vitest";
import { emailPage } from "../lib/digest-html.js";

describe("emailPage", () => {
  it("renders the email body as HTML under its subject", () => {
    const html = emailPage({ subject: "weekly ingest", body: "## 007 · Indomie\n\n![Indomie](https://x.test/7.jpg)\n\nSo [good](https://bami.blog).\n\n---\n\nEnd" });
    expect(html).toContain("<strong>weekly ingest</strong>");
    expect(html).toContain("<h2>007 · Indomie</h2>");
    expect(html).toContain('<img src="https://x.test/7.jpg" alt="Indomie">');
    expect(html).toContain('<a href="https://bami.blog">good</a>');
    expect(html).toContain("<hr>");
  });

  it("escapes the subject and shows a note when there's nothing to send", () => {
    expect(emailPage({ subject: "<b>x</b>", body: "hi" })).toContain("&lt;b&gt;x&lt;/b&gt;");
    expect(emailPage({}, "Nothing new")).toContain('<p class="empty">Nothing new</p>');
  });
});

describe("email CSS", () => {
  it("is shared by the preview page", async () => {
    const { EMAIL_CSS } = await import("../lib/email-style.js");
    expect(emailPage({ subject: "s", body: "b" })).toContain(EMAIL_CSS);
    expect(EMAIL_CSS).toContain('"DM Mono"');
  });
});
