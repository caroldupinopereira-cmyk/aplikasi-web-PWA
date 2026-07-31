import { desc, eq } from "drizzle-orm";
import { getDb } from "../../../db";
import { budgetAllocations, expenses } from "../../../db/schema";
import { addAudit, MANAGE_ROLES, READ_ROLES, requireRole } from "../../security";
import { parsePositiveId, validDateFields } from "../validation";

function errorResponse(error: unknown) {
  const message = error instanceof Error ? error.message : "Terjadi kesalahan.";
  return Response.json({ error: message }, { status: 500 });
}

export async function GET(request: Request) {
  try {
    const auth = await requireRole(request, READ_ROLES);
    if ("response" in auth) return auth.response;
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
    const auth = await requireRole(request, MANAGE_ROLES);
    if ("response" in auth) return auth.response;
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
      await addAudit(auth.user, "Tambah anggaran", "Keuangan", `${budget.programName} — $${(budget.amountCents / 100).toFixed(2)}`);
      return Response.json({ budget }, { status: 201 });
    }

    const required = ["receiptNumber", "expenseDate", "description", "category", "programName", "payee"];
    const missing = required.find((key) => !String(payload[key] ?? "").trim());
    if (missing || Number(payload.amount) <= 0) {
      return Response.json({ error: "Lengkapi data pengeluaran dan masukkan jumlah yang benar." }, { status: 400 });
    }
    const dateError = validDateFields(payload, ["expenseDate"]);
    if (dateError) return Response.json({ error: dateError }, { status: 400 });
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
    await addAudit(auth.user, "Catat pengeluaran", "Keuangan", `${expense.receiptNumber} — ${expense.description}`);
    return Response.json({ expense }, { status: 201 });
  } catch (error) { return errorResponse(error); }
}

export async function PATCH(request: Request) {
  try {
    const auth = await requireRole(request, MANAGE_ROLES);
    if ("response" in auth) return auth.response;
    const payload = (await request.json()) as Record<string, unknown>;
    const id = parsePositiveId(payload.id);
    if (!id) {
      return Response.json({ error: "ID wajib disertakan." }, { status: 400 });
    }
    const dateError = validDateFields(payload, ["expenseDate"]);
    if (dateError) return Response.json({ error: dateError }, { status: 400 });

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
    const [expense] = await db.update(expenses).set(updates).where(eq(expenses.id, id)).returning();
    if (!expense) return Response.json({ error: "Pengeluaran tidak ditemukan." }, { status: 404 });
    await addAudit(auth.user, "Perbarui pengeluaran", "Keuangan", `ID ${id}`);
    return Response.json({ expense });
  } catch (error) { return errorResponse(error); }
}

export async function DELETE(request: Request) {
  try {
    const auth = await requireRole(request, ["Administrator"]);
    if ("response" in auth) return auth.response;
    const payload = (await request.json()) as { id?: number; kind?: string };
    const id = parsePositiveId(payload.id);
    if (!id) {
      return Response.json({ error: "ID wajib disertakan." }, { status: 400 });
    }

    const db = await getDb();
    if (payload.kind === "budget") {
      const [deleted] = await db.delete(budgetAllocations).where(eq(budgetAllocations.id, id)).returning();
      if (!deleted) return Response.json({ error: "Anggaran tidak ditemukan." }, { status: 404 });
      await addAudit(auth.user, "Hapus anggaran", "Keuangan", `${deleted.programName}`);
    } else {
      const [deleted] = await db.delete(expenses).where(eq(expenses.id, id)).returning();
      if (!deleted) return Response.json({ error: "Pengeluaran tidak ditemukan." }, { status: 404 });
      await addAudit(auth.user, "Hapus pengeluaran", "Keuangan", `${deleted.receiptNumber}`);
    }

    return Response.json({ success: true });
  } catch (error) { return errorResponse(error); }
}
