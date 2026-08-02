import assert from "node:assert/strict";
import test from "node:test";
import {
  PASSWORD_ITERATIONS,
  createPasswordHash,
  createSessionToken,
  hashSessionToken,
  passwordValidationError,
  verifyPassword,
} from "../app/auth/password.ts";

test("rejects passwords that are too short", () => {
  assert.match(passwordValidationError("pendek"), /minimal 12 karakter/);
});

test("requires uppercase, lowercase, number, and symbol", () => {
  assert.match(
    passwordValidationError("semuanyahurufkecil"),
    /huruf besar/,
  );
  assert.equal(passwordValidationError("AmanSekali123!"), null);
});

test("creates a salted PBKDF2 password hash", async () => {
  const record = await createPasswordHash("Password-Aman-2026");
  assert.equal(record.iterations, PASSWORD_ITERATIONS);
  assert.equal(record.salt.length, 32);
  assert.equal(record.hash.length, 64);
  assert.notEqual(record.hash, "Password-Aman-2026");
});

test("accepts the correct password and rejects the wrong password", async () => {
  const record = await createPasswordHash("Password-Aman-2026");
  assert.equal(
    await verifyPassword(
      "Password-Aman-2026",
      record.hash,
      record.salt,
      record.iterations,
    ),
    true,
  );
  assert.equal(
    await verifyPassword(
      "Password-Salah-2026",
      record.hash,
      record.salt,
      record.iterations,
    ),
    false,
  );
});

test("creates random session tokens and stores only their hash", async () => {
  const first = await createSessionToken();
  const second = await createSessionToken();
  assert.notEqual(first.token, second.token);
  assert.notEqual(first.token, first.tokenHash);
  assert.equal(await hashSessionToken(first.token), first.tokenHash);
});
