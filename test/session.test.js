import { describe, expect, it } from "vitest";
import { checkPassword, isValidSession, readCookie, sessionToken } from "../lib/session.js";

describe("session", () => {
  it("checks the password", () => {
    expect(checkPassword("hunter2", "hunter2")).toBe(true);
    expect(checkPassword("hunter3", "hunter2")).toBe(false);
    expect(checkPassword("", "hunter2")).toBe(false);
    expect(checkPassword(undefined, "hunter2")).toBe(false);
  });

  it("never accepts anything when no password is configured", () => {
    expect(checkPassword("", "")).toBe(false);
    expect(isValidSession(sessionToken(""), "")).toBe(false);
  });

  it("validates a token signed with the same password only", () => {
    const token = sessionToken("hunter2");
    expect(isValidSession(token, "hunter2")).toBe(true);
    expect(isValidSession(token, "other")).toBe(false);
    expect(isValidSession("garbage", "hunter2")).toBe(false);
    expect(isValidSession(undefined, "hunter2")).toBe(false);
  });

  it("reads a cookie from a header", () => {
    expect(readCookie("a=1; bami_session=abc; b=2", "bami_session")).toBe("abc");
    expect(readCookie("a=1", "bami_session")).toBeUndefined();
    expect(readCookie(undefined, "bami_session")).toBeUndefined();
  });
});
