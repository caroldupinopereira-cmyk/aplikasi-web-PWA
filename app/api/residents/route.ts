import { and, asc, desc, eq, like, or, sql } from "drizzle-orm";
import { getDb } from "../../../db";
import { residents } from "../../../db/schema";
import { addAudit, ADMIN_ROLES, auditDifference, READ_ROLES, requireRole, WRITE_ROLES } from "../../security";
import { parsePositiveId, serverError, validDateFields } from "../validation";
import { readListQuery } from "../list-query";
import { residentCompleteness } from "../../data-quality";

function errorResponse(error: unknown) {
  const message = error instanceof Error ? error.message : "Terjadi kesalahan.";
  return Response.json({ error: message }, { status: 500 });
}

export async function GET(request: Request) {
  try {
    const auth = await requireRole(request, READ_ROLES);
    if ("response" in auth) return auth.response;
    const { page, perPage, offset, query, params } = readListQuery(request);
    const suco = (params.get("suco") ?? "").trim();
    const conditions = [];
    if (query) {
      const pattern = `%${query}%`;
      conditions.push(
        or(
          like(residents.recordNumber, pattern),
          like(residents.fullName, pattern),
          like(residents.aldeia, pattern),
          like(residents.householdNumber, pattern),
        ),
      );
    }
    if (suco && suco !== "Semua") conditions.push(eq(residents.suco, suco));
    const where = conditions.length ? and(...conditions) : undefined;
    const db = await getDb();
    const [rows, [totalRow], [summary], sucoRows] = await Promise.all([
      db.select().from(residents).where(where).orderBy(desc(residents.id)).limit(perPage).offset(offset),
      db.select({ value: sql<number>`count(*)` }).from(residents).where(where),
      db.select({
        total: sql<number>`count(*)`,
        male: sql<number>`sum(case when ${residents.gender} = 'Laki-laki' then 1 else 0 end)`,
        female: sql<number>`sum(case when ${residents.gender} = 'Perempuan' then 1 else 0 end)`,
        households: sql<number>`count(distinct ${residents.householdNumber})`,
      }).from(residents),
      db.selectDistinct({ suco: residents.suco }).from(residents).orderBy(asc(residents.suco)),
    ]);
    return Response.json({
      residents: rows.map((row) => ({
        ...row,
        dataQuality: residentCompleteness(row),
      })),
      pagination: { page, perPage, total: Number(totalRow?.value ?? 0) },
      summary: {
        total: Number(summary?.total ?? 0),
        male: Number(summary?.male ?? 0),
        female: Number(summary?.female ?? 0),
        households: Number(summary?.households ?? 0),
        incomplete: Number(
          (
            await db
              .select({ value: sql<number>`count(*)` })
              .from(residents)
              .where(eq(residents.occupation, ""))
          )[0]?.value ?? 0,
        ),
      },
      filters: { sucos: sucoRows.map((row) => row.suco) },
      currentUser: auth.user,
    });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireRole(request, WRITE_ROLES);
    if ("response" in auth) return auth.response;
    const payload = (await request.json()) as Record<string, string | boolean>;
    const required = ["recordNumber", "fullName", "gender", "birthDate", "suco", "aldeia", "householdNumber"];
    const missing = required.find((key) => !String(payload[key] ?? "").trim());
    if (missing) return Response.json({ error: `Kolom ${missing} wajib diisi.` }, { status: 400 });
    const dateError = validDateFields(payload, ["birthDate"]);
    if (dateError) return Response.json({ error: dateError }, { status: 400 });
    if (!["Laki-laki", "Perempuan"].includes(String(payload.gender))) {
      return Response.json({ error: "Jenis kelamin tidak valid." }, { status: 400 });
    }

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

    await addAudit(auth.user, "Tambah penduduk", "Data Penduduk", `${resident.fullName} — ${resident.suco}`);
    return Response.json({ resident }, { status: 201 });
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
    const dateError = validDateFields(payload, ["birthDate"]);
    if (dateError) return Response.json({ error: dateError }, { status: 400 });

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
    const [before] = await db.select().from(residents).where(eq(residents.id, id)).limit(1);
    if (!before) return Response.json({ error: "Penduduk tidak ditemukan." }, { status: 404 });
    const [resident] = await db.update(residents).set(updates).where(eq(residents.id, id)).returning();
    await addAudit(auth.user, "Perbarui penduduk", "Data Penduduk", `ID ${id}`, {
      entityId: id,
      ...auditDifference(
        before,
        resident,
        Object.keys(updates),
        ["recordNumber", "gender", "suco", "aldeia", "householdNumber", "isHouseholdHead", "maritalStatus"],
      ),
    });
    return Response.json({ resident });
  } catch (error) {
    return errorResponse(error);
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
    const [deleted] = await db.delete(residents).where(eq(residents.id, id)).returning();
    if (!deleted) {
      return Response.json({ error: "Penduduk tidak ditemukan." }, { status: 404 });
    }

    await addAudit(auth.user, "Hapus penduduk", "Data Penduduk", `${deleted.fullName}`);

    return Response.json({ success: true });
  } catch (error) {
    return serverError(error);
  }
}
