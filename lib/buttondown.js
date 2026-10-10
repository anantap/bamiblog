// Creates an email in Buttondown: status "draft" just saves it there, "about_to_send" sends it to every subscriber.
export async function createEmail({ subject, body, status }) {
  const key = process.env.BUTTONDOWN_API_KEY;
  if (!key) throw new Error("BUTTONDOWN_API_KEY is not set");
  const headers = {
    Authorization: `Token ${key}`,
    "Content-Type": "application/json",
    "X-API-Version": "2026-04-01",
  };
  // Buttondown makes API sends opt in, so a script can't email everyone by accident.
  if (status === "about_to_send") headers["X-Buttondown-Live-Dangerously"] = "true";
  const res = await fetch("https://api.buttondown.com/v1/emails", {
    method: "POST",
    headers,
    body: JSON.stringify({ subject, body, status }),
  });
  if (!res.ok) throw new Error(`Buttondown said ${res.status}: ${(await res.text()).slice(0, 300)}`);
  return res.json();
}
