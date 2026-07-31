import { desc } from "drizzle-orm";
import { getDb } from "../../../db";
import {
  incomingLetters,
  outgoingLetters,
  residents,
  activityReports,
  budgetAllocations,
  expenses,
  documents,
} from "../../../db/schema";
import { READ_ROLES, requireRole } from "../../security";

function errorResponse(error: unknown) {
  const message = error instanceof Error ? error.message : "Terjadi kesalahan.";
  return Response.json({ error: message }, { status: 500 });
}

export async function GET(request: Request) {
  try {
    const auth = await requireRole(request, READ_ROLES);
    if ("response" in auth) return auth.response;
    const db = await getDb();

    const [
      allIncoming,
      allOutgoing,
      allResidents,
      allReports,
      allBudgets,
      allExpenses,
      allDocuments,
      recentIncoming,
      recentOutgoing,
      recentReports,
      recentExpenses,
    ] = await Promise.all([
      db.select().from(incomingLetters),
      db.select().from(outgoingLetters),
      db.select().from(residents),
      db.select().from(activityReports),
      db.select().from(budgetAllocations),
      db.select().from(expenses),
      db.select().from(documents),
      db.select().from(incomingLetters).orderBy(desc(incomingLetters.id)).limit(5),
      db.select().from(outgoingLetters).orderBy(desc(outgoingLetters.id)).limit(5),
      db.select().from(activityReports).orderBy(desc(activityReports.id)).limit(5),
      db.select().from(expenses).orderBy(desc(expenses.id)).limit(5),
    ]);

    const currentMonth = new Date().toISOString().slice(0, 7);

    const incomingNew = allIncoming.filter((l) => l.status === "Baru").length;
    const incomingProcessed = allIncoming.filter((l) => l.status === "Diproses").length;
    const outgoingPending = allOutgoing.filter((l) => l.status === "Menunggu Persetujuan").length;
    const outgoingDraft = allOutgoing.filter((l) => l.status === "Draf").length;
    const households = new Set(allResidents.map((r) => r.householdNumber)).size;
    const male = allResidents.filter((r) => r.gender === "Laki-laki").length;
    const female = allResidents.filter((r) => r.gender === "Perempuan").length;
    const reportsThisMonth = allReports.filter((r) => r.activityDate.startsWith(currentMonth)).length;
    const reportsComplete = allReports.filter((r) => r.status === "Selesai").length;
    const totalParticipants = allReports.reduce((sum, r) => sum + r.participantCount, 0);
    const totalBudget = allBudgets.reduce((sum, b) => sum + b.amountCents, 0);
    const totalExpense = allExpenses.reduce((sum, e) => sum + e.amountCents, 0);
    const verified = allExpenses.filter((e) => e.status === "Diverifikasi").reduce((sum, e) => sum + e.amountCents, 0);
    const storageUsed = allDocuments.reduce((sum, d) => sum + d.sizeBytes, 0);

    const recentActivities: Array<{
      title: string;
      meta: string;
      badge: string;
      type: string;
      date: string;
    }> = [];

    for (const l of recentIncoming) {
      recentActivities.push({
        title: l.sender,
        meta: `Surat masuk • ${l.letterNumber}`,
        badge: l.status,
        type: "incoming",
        date: l.receivedDate,
      });
    }
    for (const l of recentOutgoing) {
      recentActivities.push({
        title: `Kepada ${l.recipient}`,
        meta: `Surat keluar • ${l.letterNumber}`,
        badge: l.status,
        type: "outgoing",
        date: l.letterDate,
      });
    }
    for (const r of recentReports) {
      recentActivities.push({
        title: r.title,
        meta: `Laporan • ${r.location}`,
        badge: r.status,
        type: "report",
        date: r.activityDate,
      });
    }
    for (const e of recentExpenses) {
      recentActivities.push({
        title: e.description,
        meta: `Pengeluaran • ${e.payee}`,
        badge: `$${(e.amountCents / 100).toLocaleString("en-US", { minimumFractionDigits: 2 })}`,
        type: "expense",
        date: e.expenseDate,
      });
    }

    recentActivities.sort((a, b) => b.date.localeCompare(a.date));
    const topActivities = recentActivities.slice(0, 8);

    const pendingTasks: Array<{ label: string; done: boolean }> = [];
    for (const l of allIncoming.filter((l) => l.status === "Baru").slice(0, 3)) {
      pendingTasks.push({ label: `Tindak lanjuti surat ${l.letterNumber}`, done: false });
    }
    for (const l of allOutgoing.filter((l) => l.status === "Draf").slice(0, 2)) {
      pendingTasks.push({ label: `Selesaikan draf surat ${l.letterNumber}`, done: false });
    }
    for (const e of allExpenses.filter((e) => e.status === "Belum Diverifikasi").slice(0, 2)) {
      pendingTasks.push({ label: `Verifikasi bukti ${e.receiptNumber}`, done: false });
    }
    if (pendingTasks.length === 0) {
      pendingTasks.push({ label: "Semua tugas sudah selesai", done: true });
    }

    return Response.json({
      currentUser: auth.user,
      stats: {
        incomingTotal: allIncoming.length,
        incomingNew,
        incomingProcessed,
        outgoingTotal: allOutgoing.length,
        outgoingPending,
        outgoingDraft,
        residentTotal: allResidents.length,
        households,
        male,
        female,
        documentTotal: allDocuments.length,
        storageUsed,
        reportsTotal: allReports.length,
        reportsThisMonth,
        reportsComplete,
        totalParticipants,
        totalBudget,
        totalExpense,
        verified,
      },
      recentActivities: topActivities,
      pendingTasks,
    });
  } catch (error) {
    return errorResponse(error);
  }
}
