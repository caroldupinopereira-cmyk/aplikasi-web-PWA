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
  assert.equal(formatDocumentNumber("service", 2026, 8, 3), "SA-2026-08-0003");
  assert.equal(formatDocumentNumber("complaint", 2026, 8, 4), "KA-2026-08-0004");
  assert.equal(formatDocumentNumber("visitor", 2026, 8, 5), "LV-2026-08-0005");
  assert.equal(formatDocumentNumber("asset", 2026, 8, 6), "AS-2026-08-0006");
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
  assert.deepEqual(DOCUMENT_NUMBER_TYPES.service, {
    prefix: "SA",
    label: "Pelayanan Administrasi",
  });
  assert.deepEqual(DOCUMENT_NUMBER_TYPES.complaint, {
    prefix: "KA",
    label: "Pengaduan & Aspirasi",
  });
  assert.deepEqual(DOCUMENT_NUMBER_TYPES.visitor, {
    prefix: "LV",
    label: "Buku Tamu",
  });
  assert.deepEqual(DOCUMENT_NUMBER_TYPES.asset, {
    prefix: "AS",
    label: "Inventaris & Aset",
  });
});

test("rejects invalid month and sequence", () => {
  assert.throws(() => formatDocumentNumber("incoming", 2026, 13, 1));
  assert.throws(() => formatDocumentNumber("report", 2026, 1, 0));
});
