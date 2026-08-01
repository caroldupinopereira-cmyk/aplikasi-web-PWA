import { and, desc, eq, like, sql } from "drizzle-orm";
import { getDb } from "../../../db";
import {
  activityReports,
  auditLogs,
  budgetAllocations,
  documents,
  expenses,
  incomingLetters,
  outgoingLetters,
  residents,
} from "../../../db/schema";
import { READ_ROLES, requireRole } from "../../security";
import {
  buildMonthlyValues,
  calculateBudget,
  parseDashboardYear,
} from "./calculations";

function errorResponse(error: unknown) {
  const message = error instanceof Error ? error.message : "Terjadi kesalahan.";
  return Response.json({ error: message }, { status: 500 });
}

export async function GET(request: Request) {
  try {
    const auth = await requireRole(request, READ_ROLES);
    if ("response" in auth) return auth.response;

    const db = await getDb();
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().toISOString().slice(0, 7);
    const requestedYear = new URL(request.url).searchParams.get("year");
    const selectedYear = parseDashboardYear(requestedYear, currentYear);
    if (selectedYear === null) {
      return Response.json(
        { error: "Tahun Dashboard tidak valid." },
        { status: 400 },
      );
    }

    const [
      [incomingSummary],
      [incomingUnfollowed],
      [outgoingSummary],
      [outgoingPending],
      [residentSummary],
      [householdHeadSummary],
      [documentSummary],
      [budgetSummary],
      [expenseSummary],
      recentLogs,
      budgetYears,
      expenseYears,
      activityYears,
      incomingByMonth,
      outgoingByMonth,
      expensesByMonth,
      [reportSummary],
      [reportsThisMonth],
      [unverifiedExpenseSummary],
      residentsByGender,
    ] = await Promise.all([
      db.select({ value: sql<number>`count(*)` }).from(incomingLetters),
      db
        .select({ value: sql<number>`count(*)` })
        .from(incomingLetters)
        .where(eq(incomingLetters.status, "Baru")),
      db.select({ value: sql<number>`count(*)` }).from(outgoingLetters),
      db
        .select({ value: sql<number>`count(*)` })
        .from(outgoingLetters)
        .where(eq(outgoingLetters.status, "Menunggu Persetujuan")),
      db.select({ value: sql<number>`count(*)` }).from(residents),
      db
        .select({ value: sql<number>`count(*)` })
        .from(residents)
        .where(eq(residents.isHouseholdHead, true)),
      db.select({ value: sql<number>`count(*)` }).from(documents),
      db
        .select({
          value: sql<number>`coalesce(sum(${budgetAllocations.amountCents}), 0)`,
        })
        .from(budgetAllocations)
        .where(eq(budgetAllocations.budgetYear, selectedYear)),
      db
        .select({
          value: sql<number>`coalesce(sum(${expenses.amountCents}), 0)`,
        })
        .from(expenses)
        .where(like(expenses.expenseDate, `${selectedYear}-%`)),
      db
        .select()
        .from(auditLogs)
        .where(like(auditLogs.createdAt, `${selectedYear}-%`))
        .orderBy(desc(auditLogs.createdAt), desc(auditLogs.id))
        .limit(30),
      db
        .selectDistinct({ value: budgetAllocations.budgetYear })
        .from(budgetAllocations),
      db
        .selectDistinct({
          value: sql<string>`substr(${expenses.expenseDate}, 1, 4)`,
        })
        .from(expenses),
      db
        .selectDistinct({
          value: sql<string>`substr(${auditLogs.createdAt}, 1, 4)`,
        })
        .from(auditLogs),
      db
        .select({
          month: sql<string>`substr(${incomingLetters.receivedDate}, 6, 2)`,
          value: sql<number>`count(*)`,
        })
        .from(incomingLetters)
        .where(like(incomingLetters.receivedDate, `${selectedYear}-%`))
        .groupBy(sql`substr(${incomingLetters.receivedDate}, 6, 2)`),
      db
        .select({
          month: sql<string>`substr(${outgoingLetters.letterDate}, 6, 2)`,
          value: sql<number>`count(*)`,
        })
        .from(outgoingLetters)
        .where(like(outgoingLetters.letterDate, `${selectedYear}-%`))
        .groupBy(sql`substr(${outgoingLetters.letterDate}, 6, 2)`),
      db
        .select({
          month: sql<string>`substr(${expenses.expenseDate}, 6, 2)`,
          value: sql<number>`coalesce(sum(${expenses.amountCents}), 0)`,
        })
        .from(expenses)
        .where(like(expenses.expenseDate, `${selectedYear}-%`))
        .groupBy(sql`substr(${expenses.expenseDate}, 6, 2)`),
      db
        .select({
          total: sql<number>`count(*)`,
          draft: sql<number>`sum(case when ${activityReports.status} = 'Draf' then 1 else 0 end)`,
          complete: sql<number>`sum(case when ${activityReports.status} = 'Selesai' then 1 else 0 end)`,
        })
        .from(activityReports)
        .where(like(activityReports.activityDate, `${selectedYear}-%`)),
      db
        .select({ value: sql<number>`count(*)` })
        .from(activityReports)
        .where(like(activityReports.activityDate, `${currentMonth}-%`)),
      db
        .select({
          count: sql<number>`count(*)`,
          amount: sql<number>`coalesce(sum(${expenses.amountCents}), 0)`,
        })
        .from(expenses)
        .where(
          and(
            like(expenses.expenseDate, `${selectedYear}-%`),
            eq(expenses.status, "Belum Diverifikasi"),
          ),
        ),
      db
        .select({
          gender: residents.gender,
          value: sql<number>`count(*)`,
        })
        .from(residents)
        .groupBy(residents.gender),
    ]);

    const totalBudget = Number(budgetSummary?.value ?? 0);
    const totalExpense = Number(expenseSummary?.value ?? 0);
    const { remainingBudget, budgetUsagePercent } = calculateBudget(
      totalBudget,
      totalExpense,
    );

    const activityType: Record<string, string> = {
      "Surat Masuk": "incoming",
      "Surat Keluar": "outgoing",
      "Data Penduduk": "resident",
      "Laporan Kegiatan": "report",
      Keuangan: "expense",
      "Arsip Dokumen": "document",
      Pengaturan: "settings",
      Keamanan: "settings",
    };

    const recentActivities = recentLogs.map((log) => ({
      title: log.action,
      meta: log.details || `Aktivitas oleh ${log.actorName}`,
      badge: log.module,
      type: activityType[log.module] ?? "activity",
      date: log.createdAt,
      actorName: log.actorName,
    }));
    const availableYears = Array.from(
      new Set([
        currentYear,
        ...budgetYears.map((row) => Number(row.value)),
        ...expenseYears.map((row) => Number(row.value)),
        ...activityYears.map((row) => Number(row.value)),
      ]),
    )
      .filter((year) => Number.isInteger(year) && year >= 2000 && year <= 2100)
      .sort((a, b) => b - a);
    return Response.json({
      currentUser: auth.user,
      filters: {
        selectedYear,
        availableYears,
      },
      stats: {
        incomingTotal: Number(incomingSummary?.value ?? 0),
        incomingUnfollowed: Number(incomingUnfollowed?.value ?? 0),
        outgoingTotal: Number(outgoingSummary?.value ?? 0),
        outgoingPending: Number(outgoingPending?.value ?? 0),
        residentTotal: Number(residentSummary?.value ?? 0),
        householdHeads: Number(householdHeadSummary?.value ?? 0),
        documentTotal: Number(documentSummary?.value ?? 0),
        budgetYear: selectedYear,
        totalBudget,
        totalExpense,
        remainingBudget,
        budgetUsagePercent,
        reportsTotal: Number(reportSummary?.total ?? 0),
        reportsDraft: Number(reportSummary?.draft ?? 0),
        reportsComplete: Number(reportSummary?.complete ?? 0),
        reportsThisMonth: Number(reportsThisMonth?.value ?? 0),
        unverifiedExpenseCount: Number(unverifiedExpenseSummary?.count ?? 0),
        unverifiedExpenseAmount: Number(unverifiedExpenseSummary?.amount ?? 0),
      },
      insights: {
        residentsByGender: residentsByGender.map((row) => ({
          label: row.gender,
          value: Number(row.value),
        })),
      },
      charts: {
        incomingByMonth: buildMonthlyValues(incomingByMonth),
        outgoingByMonth: buildMonthlyValues(outgoingByMonth),
        expensesByMonth: buildMonthlyValues(expensesByMonth),
      },
      recentActivities,
    });
  } catch (error) {
    return errorResponse(error);
  }
}
