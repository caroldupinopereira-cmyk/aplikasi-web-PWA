import { desc, eq } from "drizzle-orm";
import { getDb } from "../../../db";
import { incomingLetters } from "../../../db/schema";
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
      .from(incomingLetters)
      .orderBy(desc(incomingLetters.receivedDate), desc(incomingLetters.id));
    return Response.json({ letters: rows });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as Record<string, string>;
    const required = ["letterNumber", "receivedDate", "letterDate", "sender", "subject"];
    const missing = required.find((key) => !payload[key]?.trim());

    if (missing) {
      return Response.json({ error: `Kolom ${missing} wajib diisi.` }, { status: 400 });
    }

    const db = await getDb();
    const [letter] = await db
      .insert(incomingLetters)
      .values({
        letterNumber: payload.letterNumber.trim(),
        receivedDate: payload.receivedDate,
        letterDate: payload.letterDate,
        sender: payload.sender.trim(),
        subject: payload.subject.trim(),
        category: payload.category?.trim() || "Umum",
        status: "Baru",
        notes: payload.notes?.trim() || "",
      })
      .returning();

    const user = await getRequestUser(request);
    if (user) await addAudit(user, "Tambah surat masuk", "Surat Masuk", `${letter.letterNumber} — ${letter.sender}`);

    return Response.json({ letter }, { status: 201 });
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
      .where(eq(incomingLetters.id, payload.id as number))
      .returning();

    return Response.json({ letter });

    const user = await getRequestUser(request);
    if (user) await addAudit(user, "Perbarui surat masuk", "Surat Masuk", `ID ${payload.id}`);
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
      .delete(incomingLetters)
      .where(eq(incomingLetters.id, payload.id))
      .returning();

    if (!deleted) {
      return Response.json({ error: "Surat tidak ditemukan." }, { status: 404 });
    }

    const user = await getRequestUser(request);
    if (user) await addAudit(user, "Hapus surat masuk", "Surat Masuk", `${deleted.letterNumber}`);

    return Response.json({ success: true });
  } catch (error) {
    return errorResponse(error);
  }
}
