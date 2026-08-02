import { getDb } from "../../../../db";
import { documents } from "../../../../db/schema";
import { MANAGE_ROLES, requireRole } from "../../../security";

type Issue = { id: number; title: string; issue: string; severity: "warning" | "error" };

export async function GET(request: Request) {
  try {
    const auth = await requireRole(request, MANAGE_ROLES);
    if ("response" in auth) return auth.response;
    const { env } = await import("cloudflare:workers");
    if (!env.BUCKET) return Response.json({ error: "Penyimpanan R2 belum tersedia." }, { status: 503 });
    const db = await getDb();
    const rows = await db.select().from(documents).limit(500);
    const issues: Issue[] = [];
    for (let start = 0; start < rows.length; start += 20) {
      const chunk = rows.slice(start, start + 20);
      const objects = await Promise.all(chunk.map((document) => env.BUCKET.head(document.storageKey)));
      objects.forEach((object, index) => {
        const document = chunk[index];
        if (!object) issues.push({ id: document.id, title: document.title, issue: "File tidak ditemukan di R2.", severity: "error" });
        else if (object.size !== document.sizeBytes) issues.push({ id: document.id, title: document.title, issue: "Ukuran file R2 berbeda dari metadata D1.", severity: "error" });
        if (!document.checksumSha256) issues.push({ id: document.id, title: document.title, issue: "Dokumen lama belum memiliki checksum SHA-256.", severity: "warning" });
      });
    }
    const brokenIds = new Set(issues.filter((issue) => issue.severity === "error").map((issue) => issue.id));
    return Response.json({ checked: rows.length, healthy: rows.length - brokenIds.size, issues, limited: rows.length === 500 });
  } catch {
    return Response.json({ error: "Pemeriksaan integritas belum dapat diselesaikan." }, { status: 500 });
  }
}
