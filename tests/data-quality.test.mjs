import assert from "node:assert/strict";
import test from "node:test";
import { residentCompleteness } from "../app/data-quality.ts";
import { fileSignatureMatches } from "../app/file-security.ts";

const resident = {
  recordNumber: "PDT-001", fullName: "Penduduk Contoh", gender: "Laki-laki",
  birthDate: "2000-01-01", suco: "Suco Contoh", aldeia: "Aldeia Contoh",
  householdNumber: "KK-001", maritalStatus: "Belum Menikah", occupation: "Petani",
};

test("marks complete and incomplete resident records", () => {
  assert.equal(residentCompleteness(resident).percent, 100);
  const incomplete = residentCompleteness({ ...resident, occupation: "" });
  assert.equal(incomplete.complete, false);
  assert.deepEqual(incomplete.missingFields, ["Pekerjaan"]);
});

test("accepts a PDF signature and rejects executable bytes", () => {
  assert.equal(fileSignatureMatches("application/pdf", new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d])), true);
  assert.equal(fileSignatureMatches("application/pdf", new Uint8Array([0x4d, 0x5a, 0x90])), false);
});
