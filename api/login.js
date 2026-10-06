import { checkPassword, COOKIE_MAX_AGE, COOKIE_NAME, isLoggedIn, sessionToken } from "../lib/session.js";

function cookie(value, maxAge) {
  const secure = process.env.VERCEL ? "; Secure" : "";
  return `${COOKIE_NAME}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure}`;
}

export default async function handler(req, res) {
  if (req.method === "GET") {
    res.setHeader("Cache-Control", "no-store");
    res.status(200).json({ loggedIn: isLoggedIn(req) });
    return;
  }

  if (req.method === "POST") {
    const password = process.env.ADMIN_PASSWORD;
    if (!checkPassword(req.body?.password, password)) {
      res.status(401).json({ error: "wrong password" });
      return;
    }
    res.setHeader("Set-Cookie", cookie(sessionToken(password), COOKIE_MAX_AGE));
    res.status(200).json({ loggedIn: true });
    return;
  }

  if (req.method === "DELETE") {
    res.setHeader("Set-Cookie", cookie("", 0));
    res.status(200).json({ loggedIn: false });
    return;
  }

  res.setHeader("Allow", "GET, POST, DELETE");
  res.status(405).json({ error: "method not allowed" });
}
