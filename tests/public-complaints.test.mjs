import assert from "node:assert/strict";
import test from "node:test";
import { canReadAllComplaints, isComplaintOverdue } from "../app/public-complaints.ts";

test("only Administrator and Pimpinan read every complaint", () => {
  assert.equal(canReadAllComplaints("Administrator"), true);
  assert.equal(canReadAllComplaints("Pimpinan"), true);
  assert.equal(canReadAllComplaints("Staf"), false);
  assert.equal(canReadAllComplaints("Viewer"), false);
});

test("open complaints become overdue but resolved complaints do not", () => {
  assert.equal(isComplaintOverdue("2026-08-03", "Diproses", "2026-08-04"), true);
  assert.equal(isComplaintOverdue("2026-08-03", "Selesai", "2026-08-04"), false);
  assert.equal(isComplaintOverdue("2026-08-03", "Ditutup", "2026-08-04"), false);
});
