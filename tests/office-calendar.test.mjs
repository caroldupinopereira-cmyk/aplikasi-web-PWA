import assert from "node:assert/strict";
import test from "node:test";
import { isOfficeEventOverdue, OFFICE_EVENT_TYPES } from "../app/office-calendar.ts";

test("calendar supports the main office agenda categories", () => {
  assert.deepEqual(OFFICE_EVENT_TYPES, ["Rapat", "Kegiatan", "Kunjungan", "Pelayanan", "Tenggat", "Lainnya"]);
});

test("unfinished past events become reminders", () => {
  assert.equal(isOfficeEventOverdue("2026-08-03", "Dijadwalkan", "2026-08-04"), true);
  assert.equal(isOfficeEventOverdue("2026-08-04", "Dijadwalkan", "2026-08-04"), false);
});

test("completed or cancelled events do not become overdue", () => {
  assert.equal(isOfficeEventOverdue("2026-08-01", "Selesai", "2026-08-04"), false);
  assert.equal(isOfficeEventOverdue("2026-08-01", "Dibatalkan", "2026-08-04"), false);
});
