import assert from "node:assert/strict";
import test from "node:test";
import { formatDocumentNumber } from "../app/document-number.ts";

test("formats separate official document number prefixes", () => {
  assert.equal(formatDocumentNumber("incoming", 2026, 8, 1), "SM-2026-08-0001");
  assert.equal(formatDocumentNumber("outgoing", 2026, 12, 42), "SK-2026-12-0042");
  assert.equal(formatDocumentNumber("report", 2027, 1, 8), "LPK-2027-01-0008");
});

test("rejects invalid month and sequence", () => {
  assert.throws(() => formatDocumentNumber("incoming", 2026, 13, 1));
  assert.throws(() => formatDocumentNumber("report", 2026, 1, 0));
});
