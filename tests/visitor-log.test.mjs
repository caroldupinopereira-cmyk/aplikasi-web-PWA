import assert from "node:assert/strict";
import test from "node:test";
import { validVisitTimes } from "../app/visitor-log.ts";

test("accepts an entry time before the exit time", () => {
  assert.equal(validVisitTimes("08:30", "10:15"), true);
  assert.equal(validVisitTimes("08:30", ""), true);
});

test("rejects malformed time or exit before entry", () => {
  assert.equal(validVisitTimes("8:30", "10:00"), false);
  assert.equal(validVisitTimes("10:00", "09:59"), false);
});
