import { desc, eq } from "drizzle-orm";
import { getDb } from "../../../db";
import { residents } from "../../../db/schema";
import { addAudit, getRequestUser } from "../../security";

function errorResponse(error: unknown) {
  const message = error instanceof Error ? error.message : "Terjadi kesalahan.";
  return Response.json({ error: message }, { status: 500 });
}

export async function GET() {
  try {
    const db = await getDb();
    const rows = await db.select().from(residents).orderBy(desc(residents.id));
    return Response.json({ residents: rows });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as Record<string, string | boolean>;
    const required = ["recordNumber", "fullName", "gender", "birthDate", "suco", "aldeia", "householdNumber"];
    const missing = required.find((key) => !String(payload[key] ?? "").trim());
    if (missing) return Response.json({ error: `Kolom ${missing} wajib diisi.` }, { status: 400 });

    const db = await getDb();
    const [resident] = await db.insert(residents).values({
      recordNumber: String(payload.recordNumber).trim(),
      fullName: String(payload.fullName).trim(),
      gender: String(payload.gender),
      birthDate: String(payload.birthDate),
      suco: String(payload.suco).trim(),
      aldeia: String(payload.aldeia).trim(),
      householdNumber: String(payload.householdNumber).trim(),
      isHouseholdHead: Boolean(payload.isHouseholdHead),
      maritalStatus: String(payload.maritalStatus || "Belum Menikah"),
      occupation: String(payload.occupation || "").trim(),
    }).returning();

    return Response.json({ resident }, { status: 201 });

    const user = await getRequestUser(request);
    if (user) await addAudit(user, "Tambah penduduk", "Data Penduduk", `${resident.fullName} — ${resident.suco}`);
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
    for (const key of ["recordNumber", "fullName", "gender", "birthDate", "suco", "aldeia", "householdNumber", "maritalStatus", "occupation"]) {
      if (payload[key] !== undefined) updates[key] = String(payload[key]).trim();
    }
    if (payload.isHouseholdHead !== undefined) {
      updates.isHouseholdHead = Boolean(payload.isHouseholdHead);
    }
    if (Object.keys(updates).length === 0) {
      return Response.json({ error: "Tidak ada data yang diperbarui." }, { status: 400 });
    }

    const db = await getDb();
    const [resident] = await db.update(residents).set(updates).where(eq(residents.id, payload.id as number)).returning();
    return Response.json({ resident });

    const user = await getRequestUser(request);
    if (user) await addAudit(user, "Perbarui penduduk", "Data Penduduk", `ID ${payload.id}`);
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
    const [deleted] = await db.delete(residents).where(eq(residents.id, payload.id)).returning();
    if (!deleted) {
      return Response.json({ error: "Penduduk tidak ditemukan." }, { status: 404 });
    }

    const user = await getRequestUser(request);
    if (user) await addAudit(user, "Hapus penduduk", "Data Penduduk", `${deleted.fullName}`);

    return Response.json({ success: true });
  } catch (error) {
    return errorResponse(error);
  }
}
