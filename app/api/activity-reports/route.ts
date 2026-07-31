import { desc, eq } from "drizzle-orm";
import { getDb } from "../../../db";
import { activityReports } from "../../../db/schema";

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
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const payload = (await request.json()) as { id?: number; status?: string };
    const allowed = ["Draf", "Diperiksa", "Selesai"];
    if (!payload.id || !payload.status || !allowed.includes(payload.status)) {
      return Response.json({ error: "Data status tidak valid." }, { status: 400 });
    }
    const db = await getDb();
    const [report] = await db.update(activityReports).set({ status: payload.status }).where(eq(activityReports.id, payload.id)).returning();
    return Response.json({ report });
  } catch (error) {
    return errorResponse(error);
  }
}
