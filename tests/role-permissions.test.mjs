import assert from "node:assert/strict";
import test from "node:test";
import {
  ROLE_CAPABILITIES,
  roleHasCapability,
  rolesWith,
} from "../app/roles.ts";
import { staffAccountDeletionError } from "../app/staff-account.ts";
import {
  hasUnreadNotifications,
  notificationModulesForRole,
} from "../app/notification-status.ts";

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

test("operational, approval, and finance role groups stay explicit", () => {
  assert.deepEqual(
    rolesWith("writeOperational"),
    ["Administrator", "Pimpinan", "Staf"],
  );
  assert.deepEqual(rolesWith("approve"), ["Administrator", "Pimpinan"]);
  assert.deepEqual(
    rolesWith("manageFinance"),
    ["Administrator", "Pimpinan"],
  );
});

test("unknown roles receive no capability", () => {
  assert.equal(roleHasCapability("Tidak Dikenal", "read"), false);
  assert.equal(roleHasCapability(undefined, "read"), false);
});

test("staff account deletion blocks self-deletion and requires the exact name", () => {
  const target = {
    email: "admin@example.test",
    displayName: "Admin Kantor",
  };
  assert.equal(
    staffAccountDeletionError("admin@example.test", target, "Admin Kantor"),
    "Administrator tidak dapat menghapus akunnya sendiri.",
  );
  assert.equal(
    staffAccountDeletionError(
      "other-admin@example.test",
      target,
      "Nama Salah",
    ),
    "Nama konfirmasi tidak sesuai.",
  );
  assert.equal(
    staffAccountDeletionError(
      "other-admin@example.test",
      target,
      "Admin Kantor",
    ),
    null,
  );
});

test("notification modules follow each role", () => {
  assert.deepEqual(notificationModulesForRole("Administrator"), [
    "Surat Masuk",
    "Surat Keluar",
    "Keuangan",
  ]);
  assert.deepEqual(notificationModulesForRole("Pimpinan"), [
    "Surat Masuk",
    "Surat Keluar",
    "Keuangan",
  ]);
  assert.deepEqual(notificationModulesForRole("Staf"), ["Surat Masuk"]);
  assert.deepEqual(notificationModulesForRole("Viewer"), []);
});

test("notification becomes unread only for newer pending work", () => {
  assert.equal(hasUnreadNotifications(2, null, null), true);
  assert.equal(
    hasUnreadNotifications(
      2,
      "2026-08-03T10:00:00.000Z",
      "2026-08-03 10:01:00",
    ),
    true,
  );
  assert.equal(
    hasUnreadNotifications(
      2,
      "2026-08-03T10:02:00.000Z",
      "2026-08-03 10:01:00",
    ),
    false,
  );
  assert.equal(hasUnreadNotifications(0, null, null), false);
});
