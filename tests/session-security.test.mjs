import assert from "node:assert/strict";
import test from "node:test";
import {
  clearSessionCookies,
  createSessionCookie,
  requestHasValidOrigin,
  requestSessionToken,
  safeTextEqual,
} from "../app/auth/session-utils.ts";

test("creates a Secure HttpOnly production cookie", () => {
  const request = new Request("https://example.test/api/auth/login");
  const cookie = createSessionCookie(request, "token-acak");
  assert.match(cookie, /^__Host-sap_session=/);
  assert.match(cookie, /HttpOnly/);
  assert.match(cookie, /SameSite=Strict/);
  assert.match(cookie, /Secure/);
});

test("uses a development cookie for local HTTP only", () => {
  const request = new Request("http://localhost:5173/api/auth/login");
  const cookie = createSessionCookie(request, "token-lokal");
  assert.match(cookie, /^sap_session=/);
  assert.doesNotMatch(cookie, /; Secure/);
});

test("reads either production or development session cookies", () => {
  const request = new Request("https://example.test/", {
    headers: { cookie: "other=x; __Host-sap_session=abc123" },
  });
  assert.equal(requestSessionToken(request), "abc123");
});

test("requires the request Origin to match the application", () => {
  assert.equal(
    requestHasValidOrigin(
      new Request("https://example.test/api/auth/logout", {
        headers: { origin: "https://example.test" },
      }),
    ),
    true,
  );
  assert.equal(
    requestHasValidOrigin(
      new Request("https://example.test/api/auth/logout", {
        headers: { origin: "https://attacker.test" },
      }),
    ),
    false,
  );
});

test("compares setup secrets without returning their content", async () => {
  assert.equal(await safeTextEqual("kode-yang-sama", "kode-yang-sama"), true);
  assert.equal(await safeTextEqual("kode-salah", "kode-benar"), false);
});

test("clears both possible session cookie names", () => {
  const headers = new Headers();
  clearSessionCookies(headers);
  const value = headers.get("set-cookie") ?? "";
  assert.match(value, /__Host-sap_session=/);
  assert.match(value, /sap_session=/);
  assert.match(value, /Max-Age=0/);
});
