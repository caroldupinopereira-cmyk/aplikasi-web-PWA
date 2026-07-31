import { desc, eq } from "drizzle-orm";
import { getDb } from "../../../db";
import { budgetAllocations, expenses } from "../../../db/schema";
import { addAudit, getRequestUser } from "../../security";

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

      const user = await getRequestUser(request);
      if (user) await addAudit(user, "Tambah anggaran", "Keuangan", `${budget.programName} — $${(budget.amountCents / 100).toFixed(2)}`);
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

    const user = await getRequestUser(request);
    if (user) await addAudit(user, "Catat pengeluaran", "Keuangan", `${expense.receiptNumber} — ${expense.description}`);
  } catch (error) { return errorResponse(error); }
}

export async function PATCH(request: Request) {
  try {
    const payload = (await request.json()) as Record<string, unknown>;
    if (!payload.id) {
      return Response.json({ error: "ID wajib disertakan." }, { status: 400 });
    }

    const updates: Record<string, unknown> = {};
    if (payload.status) {
      const allowed = ["Belum Diverifikasi", "Diverifikasi"];
      if (!allowed.includes(payload.status as string)) {
        return Response.json({ error: "Status tidak valid." }, { status: 400 });
      }
      updates.status = payload.status;
    }
    for (const key of ["receiptNumber", "expenseDate", "description", "category", "programName", "payee", "paymentMethod", "notes"]) {
      if (payload[key] !== undefined) updates[key] = String(payload[key]).trim();
    }
    if (payload.amountCents !== undefined) {
      updates.amountCents = Number(payload.amountCents) || 0;
    }
    if (Object.keys(updates).length === 0) {
      return Response.json({ error: "Tidak ada data yang diperbarui." }, { status: 400 });
    }

    const db = await getDb();
    const [expense] = await db.update(expenses).set(updates).where(eq(expenses.id, payload.id as number)).returning();
    return Response.json({ expense });

    const user = await getRequestUser(request);
    if (user) await addAudit(user, "Perbarui pengeluaran", "Keuangan", `ID ${payload.id}`);
  } catch (error) { return errorResponse(error); }
}

export async function DELETE(request: Request) {
  try {
    const payload = (await request.json()) as { id?: number; kind?: string };
    if (!payload.id) {
      return Response.json({ error: "ID wajib disertakan." }, { status: 400 });
    }

    const db = await getDb();
    if (payload.kind === "budget") {
      const [deleted] = await db.delete(budgetAllocations).where(eq(budgetAllocations.id, payload.id)).returning();
      if (!deleted) return Response.json({ error: "Anggaran tidak ditemukan." }, { status: 404 });
      const user = await getRequestUser(request);
      if (user) await addAudit(user, "Hapus anggaran", "Keuangan", `${deleted.programName}`);
    } else {
      const [deleted] = await db.delete(expenses).where(eq(expenses.id, payload.id)).returning();
      if (!deleted) return Response.json({ error: "Pengeluaran tidak ditemukan." }, { status: 404 });
      const user = await getRequestUser(request);
      if (user) await addAudit(user, "Hapus pengeluaran", "Keuangan", `${deleted.receiptNumber}`);
    }

    return Response.json({ success: true });
  } catch (error) { return errorResponse(error); }
}
