import { desc, eq } from "drizzle-orm";
import { getDb } from "../../../db";
import { incomingLetters } from "../../../db/schema";
import { addAudit, MANAGE_ROLES, READ_ROLES, requireRole, WRITE_ROLES } from "../../security";
import { cleanText, parsePositiveId, requiredText, serverError, validDateFields } from "../validation";

export async function GET(request: Request) {
  try {
    const auth = await requireRole(request, READ_ROLES);
    if ("response" in auth) return auth.response;
    const db = await getDb();
    const rows = await db
      .select()
      .from(incomingLetters)
      .orderBy(desc(incomingLetters.receivedDate), desc(incomingLetters.id));
    return Response.json({ letters: rows });
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
    if (!letter) return Response.json({ error: "Surat tidak ditemukan." }, { status: 404 });
    await addAudit(auth.user, "Perbarui surat masuk", "Surat Masuk", `ID ${id}`);
    return Response.json({ letter });
  } catch (error) {
    return serverError(error);
  }
}

export async function DELETE(request: Request) {
  try {
    const auth = await requireRole(request, MANAGE_ROLES);
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
