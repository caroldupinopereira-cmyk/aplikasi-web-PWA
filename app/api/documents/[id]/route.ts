import { eq } from "drizzle-orm";
import { getDb } from "../../../../db";
import { documents } from "../../../../db/schema";
import { READ_ROLES, requireRole } from "../../../security";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireRole(request, READ_ROLES);
    if ("response" in auth) return auth.response;
    const { id } = await context.params;
    const db = await getDb();
    const [document] = await db.select().from(documents).where(eq(documents.id, Number(id))).limit(1);
    if (!document) return Response.json({ error: "Dokumen tidak ditemukan." }, { status: 404 });

    const { env } = await import("cloudflare:workers");
    const object = await env.BUCKET.get(document.storageKey);
    if (!object) return Response.json({ error: "File tidak ditemukan." }, { status: 404 });

    const safeDownloadName = document.fileName.replace(/["\r\n]/g, "_");
    return new Response(object.body, {
      headers: {
        "Content-Type": document.contentType,
        "Content-Disposition": `attachment; filename="${safeDownloadName}"`,
        "Content-Length": String(document.sizeBytes),
      },
    });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Gagal mengunduh dokumen." }, { status: 500 });
  }
}
