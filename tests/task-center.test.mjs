import assert from "node:assert/strict";
import test from "node:test";
import { canSeeAllOfficeTasks, isOfficeTaskOverdue } from "../app/task-center.ts";

test("Administrator, Pimpinan, and Viewer can read the office task overview", () => {
  assert.equal(canSeeAllOfficeTasks("Administrator"), true);
  assert.equal(canSeeAllOfficeTasks("Pimpinan"), true);
  assert.equal(canSeeAllOfficeTasks("Viewer"), true);
});

test("Staf is limited to personally assigned office tasks", () => {
  assert.equal(canSeeAllOfficeTasks("Staf"), false);
  assert.equal(canSeeAllOfficeTasks(undefined), false);
});

test("an unfinished task becomes overdue after its due date", () => {
  assert.equal(isOfficeTaskOverdue("2026-08-03", "Diproses", "2026-08-04"), true);
  assert.equal(isOfficeTaskOverdue("2026-08-04", "Diproses", "2026-08-04"), false);
});

test("a completed task is never marked overdue", () => {
  assert.equal(isOfficeTaskOverdue("2026-08-01", "Selesai", "2026-08-04"), false);
});
