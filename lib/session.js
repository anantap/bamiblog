import { createHash, createHmac, timingSafeEqual } from "node:crypto";

export const COOKIE_NAME = "bami_session";
export const COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

function sha256(value) {
  return createHash("sha256").update(String(value)).digest();
}

export function checkPassword(attempt, password) {
  if (!password || typeof attempt !== "string") return false;
  return timingSafeEqual(sha256(attempt), sha256(password));
}

// The token is derived from the password, so changing ADMIN_PASSWORD logs everyone out.
export function sessionToken(password) {
  return createHmac("sha256", String(password)).update("bami.blog admin").digest("hex");
}

export function isValidSession(token, password) {
  if (!password || typeof token !== "string") return false;
  return timingSafeEqual(sha256(token), sha256(sessionToken(password)));
}

export function isLoggedIn(req) {
  return isValidSession(readCookie(req.headers.cookie, COOKIE_NAME), process.env.ADMIN_PASSWORD);
}

export function readCookie(header, name) {
  if (!header) return undefined;
  for (const part of header.split(";")) {
    const [key, ...rest] = part.trim().split("=");
    if (key === name) return decodeURIComponent(rest.join("="));
  }
  return undefined;
}
