import assert from "node:assert/strict";
import test from "node:test";
import {
  DOCUMENT_NUMBER_TYPES,
  formatDocumentNumber,
} from "../app/document-number.ts";

test("formats separate official document number prefixes", () => {
  assert.equal(formatDocumentNumber("incoming", 2026, 8, 1), "KT-2026-08-0001");
  assert.equal(formatDocumentNumber("outgoing", 2026, 12, 42), "KS-2026-12-0042");
  assert.equal(formatDocumentNumber("report", 2027, 1, 8), "RA-2027-01-0008");
});

test("keeps official prefixes linked to translatable module labels", () => {
  assert.deepEqual(DOCUMENT_NUMBER_TYPES.incoming, {
    prefix: "KT",
    label: "Surat Masuk",
  });
  assert.deepEqual(DOCUMENT_NUMBER_TYPES.outgoing, {
    prefix: "KS",
    label: "Surat Keluar",
  });
  assert.deepEqual(DOCUMENT_NUMBER_TYPES.report, {
    prefix: "RA",
    label: "Laporan Kegiatan",
  });
});

test("rejects invalid month and sequence", () => {
  assert.throws(() => formatDocumentNumber("incoming", 2026, 13, 1));
  assert.throws(() => formatDocumentNumber("report", 2026, 1, 0));
});
