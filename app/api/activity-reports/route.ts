import { desc, eq } from "drizzle-orm";
import { getDb } from "../../../db";
import { activityReports } from "../../../db/schema";
import { addAudit, getRequestUser } from "../../security";

function errorResponse(error: unknown) {
  const message = error instanceof Error ? error.message : "Terjadi kesalahan.";
  return Response.json({ error: message }, { status: 500 });
}

export async function GET() {
  try {
    const db = await getDb();
    const rows = await db.select().from(activityReports).orderBy(desc(activityReports.activityDate), desc(activityReports.id));
    return Response.json({ reports: rows });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as Record<string, string | number>;
    const required = ["reportNumber", "title", "activityDate", "location", "responsiblePerson", "summary"];
    const missing = required.find((key) => !String(payload[key] ?? "").trim());
    if (missing) return Response.json({ error: `Kolom ${missing} wajib diisi.` }, { status: 400 });

    const db = await getDb();
    const [report] = await db.insert(activityReports).values({
      reportNumber: String(payload.reportNumber).trim(),
      title: String(payload.title).trim(),
      activityDate: String(payload.activityDate),
      location: String(payload.location).trim(),
      activityType: String(payload.activityType || "Rapat"),
      responsiblePerson: String(payload.responsiblePerson).trim(),
      participantCount: Number(payload.participantCount) || 0,
      summary: String(payload.summary).trim(),
      obstacles: String(payload.obstacles || "").trim(),
      recommendations: String(payload.recommendations || "").trim(),
      status: "Draf",
    }).returning();
    return Response.json({ report }, { status: 201 });

    const user = await getRequestUser(request);
    if (user) await addAudit(user, "Tambah laporan kegiatan", "Laporan Kegiatan", `${report.reportNumber} — ${report.title}`);
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
    const [report] = await db.update(activityReports).set(updates).where(eq(activityReports.id, payload.id as number)).returning();
    return Response.json({ report });

    const user = await getRequestUser(request);
    if (user) await addAudit(user, "Perbarui laporan kegiatan", "Laporan Kegiatan", `ID ${payload.id}`);
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
    const [deleted] = await db.delete(activityReports).where(eq(activityReports.id, payload.id)).returning();
    if (!deleted) {
      return Response.json({ error: "Laporan tidak ditemukan." }, { status: 404 });
    }

    const user = await getRequestUser(request);
    if (user) await addAudit(user, "Hapus laporan kegiatan", "Laporan Kegiatan", `${deleted.reportNumber}`);

    return Response.json({ success: true });
  } catch (error) {
    return errorResponse(error);
  }
}
