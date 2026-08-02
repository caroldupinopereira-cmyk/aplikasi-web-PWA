import { desc, like, or } from "drizzle-orm";
import { getDb } from "../../../db";
import {
  activityReports,
  documents,
  incomingLetters,
  outgoingLetters,
  residents,
} from "../../../db/schema";
import { READ_ROLES, requireRole } from "../../security";

type Row = { id: number; title: string; detail: string; date: string };

export async function GET(request: Request) {
  try {
    const auth = await requireRole(request, READ_ROLES);
    if ("response" in auth) return auth.response;
    const query = new URL(request.url).searchParams.get("q")?.trim() ?? "";
    if (query.length < 2) return Response.json({ results: [] });
    const pattern = `%${query.slice(0, 80)}%`;
    const db = await getDb();
    const [incoming, outgoing, residentRows, reports, documentRows] =
      await Promise.all([
        db.select({ id: incomingLetters.id, title: incomingLetters.letterNumber, detail: incomingLetters.subject, date: incomingLetters.receivedDate })
          .from(incomingLetters).where(or(like(incomingLetters.letterNumber, pattern), like(incomingLetters.sender, pattern), like(incomingLetters.subject, pattern))).orderBy(desc(incomingLetters.id)).limit(6),
        db.select({ id: outgoingLetters.id, title: outgoingLetters.letterNumber, detail: outgoingLetters.subject, date: outgoingLetters.letterDate })
          .from(outgoingLetters).where(or(like(outgoingLetters.letterNumber, pattern), like(outgoingLetters.recipient, pattern), like(outgoingLetters.subject, pattern))).orderBy(desc(outgoingLetters.id)).limit(6),
        db.select({ id: residents.id, title: residents.fullName, detail: residents.recordNumber, date: residents.createdAt })
          .from(residents).where(or(like(residents.fullName, pattern), like(residents.recordNumber, pattern), like(residents.householdNumber, pattern))).orderBy(desc(residents.id)).limit(6),
        db.select({ id: activityReports.id, title: activityReports.reportNumber, detail: activityReports.title, date: activityReports.activityDate })
          .from(activityReports).where(or(like(activityReports.reportNumber, pattern), like(activityReports.title, pattern), like(activityReports.location, pattern))).orderBy(desc(activityReports.id)).limit(6),
        db.select({ id: documents.id, title: documents.title, detail: documents.documentNumber, date: documents.documentDate })
          .from(documents).where(or(like(documents.title, pattern), like(documents.documentNumber, pattern), like(documents.category, pattern))).orderBy(desc(documents.id)).limit(6),
      ]);
    const tag = (module: string, rows: Row[]) =>
      rows.map((row) => ({ ...row, module }));
    return Response.json({
      results: [
        ...tag("Surat Masuk", incoming),
        ...tag("Surat Keluar", outgoing),
        ...tag("Data Penduduk", residentRows),
        ...tag("Laporan Kegiatan", reports),
        ...tag("Arsip Dokumen", documentRows),
      ].slice(0, 20),
    });
  } catch {
    return Response.json(
      { error: "Pencarian belum dapat digunakan." },
      { status: 500 },
    );
  }
}
