import { desc, eq } from "drizzle-orm";
import { getDb } from "../../../db";
import { activityReports } from "../../../db/schema";
import { addAudit, MANAGE_ROLES, READ_ROLES, requireRole, WRITE_ROLES } from "../../security";
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
    const rows = await db.select().from(activityReports).orderBy(desc(activityReports.activityDate), desc(activityReports.id));
    return Response.json({ reports: rows });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireRole(request, WRITE_ROLES);
    if ("response" in auth) return auth.response;
    const payload = (await request.json()) as Record<string, string | number>;
    const required = ["reportNumber", "title", "activityDate", "location", "responsiblePerson", "summary"];
    const missing = required.find((key) => !String(payload[key] ?? "").trim());
    if (missing) return Response.json({ error: `Kolom ${missing} wajib diisi.` }, { status: 400 });
    const dateError = validDateFields(payload, ["activityDate"]);
    if (dateError) return Response.json({ error: dateError }, { status: 400 });
    const participantCount = Number(payload.participantCount) || 0;
    if (!Number.isInteger(participantCount) || participantCount < 0) {
      return Response.json({ error: "Jumlah peserta tidak valid." }, { status: 400 });
    }

    const db = await getDb();
    const [report] = await db.insert(activityReports).values({
      reportNumber: String(payload.reportNumber).trim(),
      title: String(payload.title).trim(),
      activityDate: String(payload.activityDate),
      location: String(payload.location).trim(),
      activityType: String(payload.activityType || "Rapat"),
      responsiblePerson: String(payload.responsiblePerson).trim(),
      participantCount,
      summary: String(payload.summary).trim(),
      obstacles: String(payload.obstacles || "").trim(),
      recommendations: String(payload.recommendations || "").trim(),
      status: "Draf",
    }).returning();
    await addAudit(auth.user, "Tambah laporan kegiatan", "Laporan Kegiatan", `${report.reportNumber} — ${report.title}`);
    return Response.json({ report }, { status: 201 });
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
    const dateError = validDateFields(payload, ["activityDate"]);
    if (dateError) return Response.json({ error: dateError }, { status: 400 });

    const updates: Record<string, unknown> = {};
    if (payload.status) {
      const allowed = ["Draf", "Diperiksa", "Selesai"];
      if (!allowed.includes(payload.status as string)) {
        return Response.json({ error: "Data status tidak valid." }, { status: 400 });
      }
      updates.status = payload.status;
    }
    for (const key of ["reportNumber", "title", "activityDate", "location", "activityType", "responsiblePerson", "summary", "obstacles", "recommendations"]) {
      if (payload[key] !== undefined) updates[key] = String(payload[key]).trim();
    }
    if (payload.participantCount !== undefined) {
      updates.participantCount = Number(payload.participantCount) || 0;
    }
    if (Object.keys(updates).length === 0) {
      return Response.json({ error: "Tidak ada data yang diperbarui." }, { status: 400 });
    }

    const db = await getDb();
    const [report] = await db.update(activityReports).set(updates).where(eq(activityReports.id, id)).returning();
    if (!report) return Response.json({ error: "Laporan tidak ditemukan." }, { status: 404 });
    await addAudit(auth.user, "Perbarui laporan kegiatan", "Laporan Kegiatan", `ID ${id}`);
    return Response.json({ report });
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
    const [deleted] = await db.delete(activityReports).where(eq(activityReports.id, id)).returning();
    if (!deleted) {
      return Response.json({ error: "Laporan tidak ditemukan." }, { status: 404 });
    }

    await addAudit(auth.user, "Hapus laporan kegiatan", "Laporan Kegiatan", `${deleted.reportNumber}`);

    return Response.json({ success: true });
  } catch (error) {
    return errorResponse(error);
  }
}
