import assert from "node:assert/strict";
import test from "node:test";
import { isAssetInspectionOverdue } from "../app/office-assets.ts";

test("active assets with a past inspection date need attention", () => {
  assert.equal(isAssetInspectionOverdue("2026-08-03", "Aktif", "2026-08-04"), true);
  assert.equal(isAssetInspectionOverdue("", "Aktif", "2026-08-04"), false);
});

test("lost or retired assets do not create inspection reminders", () => {
  assert.equal(isAssetInspectionOverdue("2026-08-01", "Hilang", "2026-08-04"), false);
  assert.equal(isAssetInspectionOverdue("2026-08-01", "Dihapuskan", "2026-08-04"), false);
});
