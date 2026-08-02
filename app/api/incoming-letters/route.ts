import { and, desc, eq, like, or, sql } from "drizzle-orm";
import { getDb } from "../../../db";
import { incomingLetters } from "../../../db/schema";
import { addAudit, ADMIN_ROLES, auditDifference, READ_ROLES, requireRole, WRITE_ROLES } from "../../security";
import { cleanText, parsePositiveId, requiredText, serverError, validDateFields } from "../validation";
import { readListQuery } from "../list-query";

export async function GET(request: Request) {
  try {
    const auth = await requireRole(request, READ_ROLES);
    if ("response" in auth) return auth.response;
    const { page, perPage, offset, query, params } = readListQuery(request);
    const status = (params.get("status") ?? "").trim();
    const conditions = [];
    if (query) {
      const pattern = `%${query}%`;
      conditions.push(or(
        like(incomingLetters.letterNumber, pattern),
        like(incomingLetters.sender, pattern),
        like(incomingLetters.subject, pattern),
      ));
    }
    if (status && status !== "Semua") conditions.push(eq(incomingLetters.status, status));
    const where = conditions.length ? and(...conditions) : undefined;
    const db = await getDb();
    const [rows, [totalRow], [summary]] = await Promise.all([
      db.select().from(incomingLetters).where(where).orderBy(desc(incomingLetters.receivedDate), desc(incomingLetters.id)).limit(perPage).offset(offset),
      db.select({ value: sql<number>`count(*)` }).from(incomingLetters).where(where),
      db.select({
        total: sql<number>`count(*)`,
        fresh: sql<number>`sum(case when ${incomingLetters.status} = 'Baru' then 1 else 0 end)`,
        processing: sql<number>`sum(case when ${incomingLetters.status} = 'Diproses' then 1 else 0 end)`,
        completed: sql<number>`sum(case when ${incomingLetters.status} = 'Selesai' then 1 else 0 end)`,
      }).from(incomingLetters),
    ]);
    return Response.json({
      letters: rows,
      pagination: { page, perPage, total: Number(totalRow?.value ?? 0) },
      summary: {
        total: Number(summary?.total ?? 0),
        fresh: Number(summary?.fresh ?? 0),
        processing: Number(summary?.processing ?? 0),
        completed: Number(summary?.completed ?? 0),
      },
      currentUser: auth.user,
    });
  } catch (error) {
    return serverError(error);
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireRole(request, WRITE_ROLES);
    if ("response" in auth) return auth.response;
    const payload = (await request.json()) as Record<string, unknown>;
    const required = ["letterNumber", "receivedDate", "letterDate", "sender", "subject"];
    const validationError = requiredText(payload, required) || validDateFields(payload, ["receivedDate", "letterDate"]);
    if (validationError) return Response.json({ error: validationError }, { status: 400 });

    const db = await getDb();
    const [before] = await db.select().from(incomingLetters).where(eq(incomingLetters.id, id)).limit(1);
    if (!before) return Response.json({ error: "Surat tidak ditemukan." }, { status: 404 });
    const [letter] = await db
      .insert(incomingLetters)
      .values({
        letterNumber: cleanText(payload.letterNumber, 100),
        receivedDate: String(payload.receivedDate),
        letterDate: String(payload.letterDate),
        sender: cleanText(payload.sender, 200),
        subject: cleanText(payload.subject, 300),
        category: cleanText(payload.category, 100) || "Umum",
        status: "Baru",
        notes: cleanText(payload.notes, 2000),
      })
      .returning();

    await addAudit(auth.user, "Tambah surat masuk", "Surat Masuk", `${letter.letterNumber} — ${letter.sender}`);

    return Response.json({ letter }, { status: 201 });
  } catch (error) {
    return serverError(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const auth = await requireRole(request, WRITE_ROLES);
    if ("response" in auth) return auth.response;
    const payload = (await request.json()) as Record<string, unknown>;
    const id = parsePositiveId(payload.id);
    if (!id) {
      return Response.json({ error: "ID wajib disertakan." }, { status: 400 });
    }
    const dateError = validDateFields(payload, ["receivedDate", "letterDate"]);
    if (dateError) return Response.json({ error: dateError }, { status: 400 });

    const updates: Record<string, unknown> = {};
    if (payload.status) {
      const allowed = ["Baru", "Diproses", "Selesai"];
      if (!allowed.includes(payload.status as string)) {
        return Response.json({ error: "Data status tidak valid." }, { status: 400 });
      }
      updates.status = payload.status;
    }
    for (const key of ["letterNumber", "receivedDate", "letterDate", "sender", "subject", "category", "notes"]) {
      if (payload[key] !== undefined) updates[key] = String(payload[key]).trim();
    }
    if (Object.keys(updates).length === 0) {
      return Response.json({ error: "Tidak ada data yang diperbarui." }, { status: 400 });
    }

    const db = await getDb();
    const [letter] = await db
      .update(incomingLetters)
      .set(updates)
      .where(eq(incomingLetters.id, id))
      .returning();
    await addAudit(auth.user, "Perbarui surat masuk", "Surat Masuk", `ID ${id}`, {
      entityId: id,
      ...auditDifference(before, letter, Object.keys(updates), ["letterNumber", "receivedDate", "letterDate", "sender", "subject", "category", "status"]),
    });
    return Response.json({ letter });
  } catch (error) {
    return serverError(error);
  }
}

export async function DELETE(request: Request) {
  try {
    const auth = await requireRole(request, ADMIN_ROLES);
    if ("response" in auth) return auth.response;
    const payload = (await request.json()) as { id?: number };
    const id = parsePositiveId(payload.id);
    if (!id) {
      return Response.json({ error: "ID wajib disertakan." }, { status: 400 });
    }

    const db = await getDb();
    const [deleted] = await db
      .delete(incomingLetters)
      .where(eq(incomingLetters.id, id))
      .returning();

    if (!deleted) {
      return Response.json({ error: "Surat tidak ditemukan." }, { status: 404 });
    }

    await addAudit(auth.user, "Hapus surat masuk", "Surat Masuk", `${deleted.letterNumber}`);

    return Response.json({ success: true });
  } catch (error) {
    return serverError(error);
  }
}
