import { desc, eq } from "drizzle-orm";
import { getDb } from "../../../db";
import { documents } from "../../../db/schema";
import { addAudit, MANAGE_ROLES, READ_ROLES, requireRole, WRITE_ROLES } from "../../security";
import { isIsoDate, parsePositiveId } from "../validation";

const allowedTypes = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "image/jpeg",
  "image/png",
]);

function errorResponse(error: unknown) {
  const message = error instanceof Error ? error.message : "Terjadi kesalahan.";
  return Response.json({ error: message }, { status: 500 });
}

export async function GET(request: Request) {
  try {
    const auth = await requireRole(request, READ_ROLES);
    if ("response" in auth) return auth.response;
    const db = await getDb();
    const rows = await db.select().from(documents).orderBy(desc(documents.documentDate), desc(documents.id));
    return Response.json({ documents: rows });
  } catch (error) { return errorResponse(error); }
}

export async function POST(request: Request) {
  try {
    const auth = await requireRole(request, WRITE_ROLES);
    if ("response" in auth) return auth.response;
    const form = await request.formData();
    const file = form.get("file");
    const title = String(form.get("title") || "").trim();
    const category = String(form.get("category") || "").trim();
    const documentDate = String(form.get("documentDate") || "");

    if (!(file instanceof File) || !title || !category || !documentDate) {
      return Response.json({ error: "Judul, kategori, tanggal, dan file wajib diisi." }, { status: 400 });
    }
    if (!isIsoDate(documentDate)) {
      return Response.json({ error: "Tanggal dokumen tidak valid." }, { status: 400 });
    }
    if (!allowedTypes.has(file.type)) {
      return Response.json({ error: "Jenis file tidak didukung. Gunakan PDF, Word, Excel, JPG, atau PNG." }, { status: 400 });
    }
    if (file.size > 10 * 1024 * 1024) {
      return Response.json({ error: "Ukuran file maksimal 10 MB." }, { status: 400 });
    }

    const { env } = await import("cloudflare:workers");
    if (!env.BUCKET) throw new Error("Penyimpanan dokumen belum tersedia.");
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const storageKey = `archives/${documentDate.slice(0, 4)}/${crypto.randomUUID()}-${safeName}`;
    await env.BUCKET.put(storageKey, file.stream(), { httpMetadata: { contentType: file.type } });

    const db = await getDb();
    const [document] = await db.insert(documents).values({
      title,
      referenceNumber: String(form.get("referenceNumber") || "").trim(),
      documentDate,
      category,
      archiveYear: Number(form.get("archiveYear")) || Number(documentDate.slice(0, 4)),
      fileName: file.name,
      storageKey,
      contentType: file.type,
      sizeBytes: file.size,
      description: String(form.get("description") || "").trim(),
    }).returning();
    await addAudit(auth.user, "Unggah dokumen", "Arsip Dokumen", `${document.title} — ${document.fileName}`);
    return Response.json({ document }, { status: 201 });
  } catch (error) { return errorResponse(error); }
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
    const [doc] = await db.select().from(documents).where(eq(documents.id, id)).limit(1);
    if (!doc) return Response.json({ error: "Dokumen tidak ditemukan." }, { status: 404 });

    try {
      const { env } = await import("cloudflare:workers");
      if (env.BUCKET) await env.BUCKET.delete(doc.storageKey);
    } catch { /* storage mungkin tidak tersedia */ }

    await db.delete(documents).where(eq(documents.id, id));

    await addAudit(auth.user, "Hapus dokumen", "Arsip Dokumen", `${doc.title}`);

    return Response.json({ success: true });
  } catch (error) { return errorResponse(error); }
}
