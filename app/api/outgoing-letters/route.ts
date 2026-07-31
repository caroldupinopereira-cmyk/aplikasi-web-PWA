import { desc, eq } from "drizzle-orm";
import { getDb } from "../../../db";
import { outgoingLetters } from "../../../db/schema";
import { addAudit, MANAGE_ROLES, READ_ROLES, requireRole, WRITE_ROLES } from "../../security";
import { parsePositiveId, serverError, validDateFields } from "../validation";

function errorResponse(error: unknown) {
  const message = error instanceof Error ? error.message : "Terjadi kesalahan.";
  return Response.json({ error: message }, { status: 500 });
}

export async function GET(request: Request) {
  try {
    const auth = await requireRole(request, READ_ROLES);
    if ("response" in auth) return auth.response;
    const db = await getDb();
    const rows = await db
      .select()
      .from(outgoingLetters)
      .orderBy(desc(outgoingLetters.letterDate), desc(outgoingLetters.id));
    return Response.json({ letters: rows });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireRole(request, WRITE_ROLES);
    if ("response" in auth) return auth.response;
    const payload = (await request.json()) as Record<string, string>;
    const required = ["letterNumber", "letterDate", "recipient", "subject", "signatory"];
    const missing = required.find((key) => !payload[key]?.trim());

    if (missing) {
      return Response.json({ error: `Kolom ${missing} wajib diisi.` }, { status: 400 });
    }
    const dateError = validDateFields(payload, ["letterDate"]);
    if (dateError) return Response.json({ error: dateError }, { status: 400 });

    const db = await getDb();
    const [letter] = await db
      .insert(outgoingLetters)
      .values({
        letterNumber: payload.letterNumber.trim(),
        letterDate: payload.letterDate,
        recipient: payload.recipient.trim(),
        subject: payload.subject.trim(),
        category: payload.category?.trim() || "Umum",
        signatory: payload.signatory.trim(),
        deliveryMethod: payload.deliveryMethod?.trim() || "Diantar",
        status: "Draf",
        notes: payload.notes?.trim() || "",
      })
      .returning();

    await addAudit(auth.user, "Tambah surat keluar", "Surat Keluar", `${letter.letterNumber} — ${letter.recipient}`);
    return Response.json({ letter }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
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
    const dateError = validDateFields(payload, ["letterDate"]);
    if (dateError) return Response.json({ error: dateError }, { status: 400 });

    const updates: Record<string, unknown> = {};
    if (payload.status) {
      const allowed = ["Draf", "Menunggu Persetujuan", "Disetujui", "Terkirim"];
      if (!allowed.includes(payload.status as string)) {
        return Response.json({ error: "Data status tidak valid." }, { status: 400 });
      }
      updates.status = payload.status;
    }
    for (const key of ["letterNumber", "letterDate", "recipient", "subject", "category", "signatory", "deliveryMethod", "notes"]) {
      if (payload[key] !== undefined) updates[key] = String(payload[key]).trim();
    }
    if (Object.keys(updates).length === 0) {
      return Response.json({ error: "Tidak ada data yang diperbarui." }, { status: 400 });
    }

    const db = await getDb();
    const [letter] = await db
      .update(outgoingLetters)
      .set(updates)
      .where(eq(outgoingLetters.id, id))
      .returning();
    if (!letter) return Response.json({ error: "Surat tidak ditemukan." }, { status: 404 });
    await addAudit(auth.user, "Perbarui surat keluar", "Surat Keluar", `ID ${id}`);
    return Response.json({ letter });
  } catch (error) {
    return errorResponse(error);
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
      .delete(outgoingLetters)
      .where(eq(outgoingLetters.id, id))
      .returning();

    if (!deleted) {
      return Response.json({ error: "Surat tidak ditemukan." }, { status: 404 });
    }

    await addAudit(auth.user, "Hapus surat keluar", "Surat Keluar", `${deleted.letterNumber}`);

    return Response.json({ success: true });
  } catch (error) {
    return serverError(error);
  }
}
