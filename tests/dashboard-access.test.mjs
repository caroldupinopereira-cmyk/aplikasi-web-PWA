import assert from "node:assert/strict";
import test from "node:test";
import {
  canUseDashboardQuickAction,
  dashboardRoleMessage,
} from "../app/dashboard-access.ts";

test("Administrator and Pimpinan can use finance quick actions", () => {
  assert.equal(canUseDashboardQuickAction("Administrator", "Anggaran"), true);
  assert.equal(canUseDashboardQuickAction("Pimpinan", "Anggaran"), true);
});

test("Staf can edit operational modules but not finance", () => {
  assert.equal(canUseDashboardQuickAction("Staf", "Surat Masuk"), true);
  assert.equal(canUseDashboardQuickAction("Staf", "Arsip Dokumen"), true);
  assert.equal(canUseDashboardQuickAction("Staf", "Anggaran"), false);
});

test("Viewer cannot use any quick action", () => {
  assert.equal(canUseDashboardQuickAction("Viewer", "Surat Masuk"), false);
  assert.equal(canUseDashboardQuickAction("Viewer", "Anggaran"), false);
});

test("unknown or missing roles cannot use quick actions", () => {
  assert.equal(canUseDashboardQuickAction(undefined, "Surat Masuk"), false);
  assert.equal(canUseDashboardQuickAction("Peran Tidak Dikenal", "Surat Masuk"), false);
});

test("every supported role receives a readable access explanation", () => {
  for (const role of ["Administrator", "Pimpinan", "Staf", "Viewer"]) {
    assert.notEqual(dashboardRoleMessage(role), "Hak akses sedang dimuat.");
  }
});
