import assert from "node:assert/strict";
import test from "node:test";
import {
  ROLE_CAPABILITIES,
  roleHasCapability,
  rolesWith,
} from "../app/roles.ts";

test("all four roles can read", () => {
  assert.deepEqual(rolesWith("read"), ["Administrator", "Pimpinan", "Staf", "Viewer"]);
});

test("Viewer is read-only and Staf can write operational data", () => {
  assert.deepEqual(ROLE_CAPABILITIES.Viewer, ["read"]);
  assert.equal(roleHasCapability("Staf", "writeOperational"), true);
  assert.equal(roleHasCapability("Staf", "approve"), false);
});

test("Pimpinan can approve but cannot delete permanently", () => {
  assert.equal(roleHasCapability("Pimpinan", "approve"), true);
  assert.equal(roleHasCapability("Pimpinan", "manageFinance"), true);
  assert.equal(roleHasCapability("Pimpinan", "deletePermanent"), false);
});

test("only Administrator manages accounts and permanent deletion", () => {
  assert.deepEqual(rolesWith("manageAccounts"), ["Administrator"]);
  assert.deepEqual(rolesWith("deletePermanent"), ["Administrator"]);
});

test("unknown roles receive no capability", () => {
  assert.equal(roleHasCapability("Tidak Dikenal", "read"), false);
  assert.equal(roleHasCapability(undefined, "read"), false);
});
