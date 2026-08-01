export type MonthlyRow = {
  month: string;
  value: number;
};

export type BudgetLevel = "neutral" | "safe" | "warning" | "danger";

export function parseDashboardYear(
  requestedYear: string | null,
  currentYear: number,
) {
  if (!requestedYear) return currentYear;
  const year = Number(requestedYear);
  if (!Number.isInteger(year) || year < 2000 || year > 2100) return null;
  return year;
}

export function calculateBudget(totalBudget: number, totalExpense: number) {
  return {
    remainingBudget: totalBudget - totalExpense,
    budgetUsagePercent:
      totalBudget > 0 ? Math.round((totalExpense / totalBudget) * 100) : 0,
  };
}

export function classifyBudget(
  totalBudget: number,
  totalExpense: number,
  budgetUsagePercent: number,
): BudgetLevel {
  if (totalBudget === 0) return "neutral";
  if (totalExpense > totalBudget) return "danger";
  if (budgetUsagePercent >= 80) return "warning";
  return "safe";
}

export function buildMonthlyValues(rows: MonthlyRow[]) {
  return Array.from({ length: 12 }, (_, index) => {
    const month = String(index + 1).padStart(2, "0");
    const row = rows.find((item) => item.month === month);
    return Number(row?.value ?? 0);
  });
}
