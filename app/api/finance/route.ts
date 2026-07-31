import { desc, eq } from "drizzle-orm";
import { getDb } from "../../../db";
import { budgetAllocations, expenses } from "../../../db/schema";

function errorResponse(error: unknown) {
  const message = error instanceof Error ? error.message : "Terjadi kesalahan.";
  return Response.json({ error: message }, { status: 500 });
}

export async function GET() {
  try {
    const db = await getDb();
    const [budgets, transactions] = await Promise.all([
      db.select().from(budgetAllocations).orderBy(desc(budgetAllocations.id)),
      db.select().from(expenses).orderBy(desc(expenses.expenseDate), desc(expenses.id)),
    ]);
    return Response.json({ budgets, expenses: transactions });
  } catch (error) { return errorResponse(error); }
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as Record<string, string | number>;
    const db = await getDb();
    if (payload.kind === "budget") {
      if (!payload.programName || !payload.category || Number(payload.amount) <= 0) {
        return Response.json({ error: "Program, kategori, dan jumlah anggaran wajib diisi." }, { status: 400 });
      }
      const [budget] = await db.insert(budgetAllocations).values({
        budgetYear: Number(payload.budgetYear) || 2026,
        programName: String(payload.programName).trim(),
        category: String(payload.category),
        amountCents: Math.round(Number(payload.amount) * 100),
        notes: String(payload.notes || "").trim(),
      }).returning();
      return Response.json({ budget }, { status: 201 });
    }

    const required = ["receiptNumber", "expenseDate", "description", "category", "programName", "payee"];
    const missing = required.find((key) => !String(payload[key] ?? "").trim());
    if (missing || Number(payload.amount) <= 0) {
      return Response.json({ error: "Lengkapi data pengeluaran dan masukkan jumlah yang benar." }, { status: 400 });
    }
    const [expense] = await db.insert(expenses).values({
      receiptNumber: String(payload.receiptNumber).trim(),
      expenseDate: String(payload.expenseDate),
      description: String(payload.description).trim(),
      category: String(payload.category),
      programName: String(payload.programName).trim(),
      payee: String(payload.payee).trim(),
      paymentMethod: String(payload.paymentMethod || "Tunai"),
      amountCents: Math.round(Number(payload.amount) * 100),
      notes: String(payload.notes || "").trim(),
    }).returning();
    return Response.json({ expense }, { status: 201 });
  } catch (error) { return errorResponse(error); }
}

export async function PATCH(request: Request) {
  try {
    const payload = (await request.json()) as { id?: number; status?: string };
    const allowed = ["Belum Diverifikasi", "Diverifikasi"];
    if (!payload.id || !payload.status || !allowed.includes(payload.status)) {
      return Response.json({ error: "Status tidak valid." }, { status: 400 });
    }
    const db = await getDb();
    const [expense] = await db.update(expenses).set({ status: payload.status }).where(eq(expenses.id, payload.id)).returning();
    return Response.json({ expense });
  } catch (error) { return errorResponse(error); }
}
