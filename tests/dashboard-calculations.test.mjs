import assert from "node:assert/strict";
import test from "node:test";
import {
  buildMonthlyValues,
  calculateBudget,
  classifyBudget,
  parseDashboardYear,
} from "../app/api/dashboard/calculations.ts";
import {
  auditRetentionCutoff,
  dashboardActivityCutoff,
} from "../app/audit-retention.ts";

test("uses the current year when the filter is empty", () => {
  assert.equal(parseDashboardYear(null, 2026), 2026);
});

test("accepts a valid year and rejects an invalid year", () => {
  assert.equal(parseDashboardYear("2025", 2026), 2025);
  assert.equal(parseDashboardYear("abc", 2026), null);
  assert.equal(parseDashboardYear("1999", 2026), null);
  assert.equal(parseDashboardYear("2101", 2026), null);
});

test("returns twelve zero values when monthly data is empty", () => {
  assert.deepEqual(buildMonthlyValues([]), Array(12).fill(0));
});

test("places monthly values in the correct month", () => {
  assert.deepEqual(
    buildMonthlyValues([
      { month: "01", value: 3 },
      { month: "06", value: 7 },
      { month: "12", value: 2 },
    ]),
    [3, 0, 0, 0, 0, 7, 0, 0, 0, 0, 0, 2],
  );
});

test("calculates remaining budget and usage percentage", () => {
  assert.deepEqual(calculateBudget(100_000, 25_000), {
    remainingBudget: 75_000,
    budgetUsagePercent: 25,
  });
});

test("handles an empty budget without dividing by zero", () => {
  assert.deepEqual(calculateBudget(0, 0), {
    remainingBudget: 0,
    budgetUsagePercent: 0,
  });
});

test("allows a negative remaining value when spending exceeds budget", () => {
  assert.deepEqual(calculateBudget(100_000, 125_000), {
    remainingBudget: -25_000,
    budgetUsagePercent: 125,
  });
});

test("classifies budget warning levels", () => {
  assert.equal(classifyBudget(0, 0, 0), "neutral");
  assert.equal(classifyBudget(100_000, 50_000, 50), "safe");
  assert.equal(classifyBudget(100_000, 80_000, 80), "warning");
  assert.equal(classifyBudget(100_000, 110_000, 110), "danger");
});

test("keeps audit history for twelve calendar months", () => {
  assert.equal(
    auditRetentionCutoff(new Date("2026-08-03T12:00:00.000Z")),
    "2025-08-03T12:00:00.000Z",
  );
});

test("shows only the latest thirty days on the Dashboard", () => {
  assert.equal(
    dashboardActivityCutoff(new Date("2026-08-03T12:00:00.000Z")),
    "2026-07-04T12:00:00.000Z",
  );
});
