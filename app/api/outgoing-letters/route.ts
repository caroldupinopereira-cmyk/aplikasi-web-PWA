import { desc, eq } from "drizzle-orm";
import { getDb } from "../../../db";
import { outgoingLetters } from "../../../db/schema";
import { addAudit, getRequestUser } from "../../security";

function errorResponse(error: unknown) {
  const message = error instanceof Error ? error.message : "Terjadi kesalahan.";
  return Response.json({ error: message }, { status: 500 });
}

export async function GET() {
  try {
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
    const payload = (await request.json()) as Record<string, string>;
    const required = ["letterNumber", "letterDate", "recipient", "subject", "signatory"];
    const missing = required.find((key) => !payload[key]?.trim());

    if (missing) {
      return Response.json({ error: `Kolom ${missing} wajib diisi.` }, { status: 400 });
    }

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

    return Response.json({ letter }, { status: 201 });

    const user = await getRequestUser(request);
    if (user) await addAudit(user, "Tambah surat keluar", "Surat Keluar", `${letter.letterNumber} — ${letter.recipient}`);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const payload = (await request.json()) as Record<string, unknown>;
    if (!payload.id) {
      return Response.json({ error: "ID wajib disertakan." }, { status: 400 });
    }

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
      .where(eq(outgoingLetters.id, payload.id as number))
      .returning();

    return Response.json({ letter });

    const user = await getRequestUser(request);
    if (user) await addAudit(user, "Perbarui surat keluar", "Surat Keluar", `ID ${payload.id}`);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(request: Request) {
  try {
    const payload = (await request.json()) as { id?: number };
    if (!payload.id) {
      return Response.json({ error: "ID wajib disertakan." }, { status: 400 });
    }

    const db = await getDb();
    const [deleted] = await db
      .delete(outgoingLetters)
      .where(eq(outgoingLetters.id, payload.id))
      .returning();

    if (!deleted) {
      return Response.json({ error: "Surat tidak ditemukan." }, { status: 404 });
    }

    const user = await getRequestUser(request);
    if (user) await addAudit(user, "Hapus surat keluar", "Surat Keluar", `${deleted.letterNumber}`);

    return Response.json({ success: true });
  } catch (error) {
    return errorResponse(error);
  }
}
