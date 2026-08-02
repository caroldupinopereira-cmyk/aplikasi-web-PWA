import { sql } from "drizzle-orm";
import { getDb } from "../../../db";
import { documentSequences } from "../../../db/schema";
import { addAudit, requireRole, WRITE_ROLES } from "../../security";
import {
  DOCUMENT_NUMBER_TYPES,
  formatDocumentNumber,
  type DocumentNumberType,
} from "../../document-number";
import { isIsoDate } from "../validation";

export async function POST(request: Request) {
  try {
    const auth = await requireRole(request, WRITE_ROLES);
    if ("response" in auth) return auth.response;
    const payload = (await request.json()) as {
      documentType?: string;
      date?: string;
    };
    const type =
      payload.documentType && payload.documentType in DOCUMENT_NUMBER_TYPES
        ? (payload.documentType as DocumentNumberType)
        : null;
    if (!type || !payload.date || !isIsoDate(payload.date)) {
      return Response.json(
        { error: "Jenis dokumen atau tanggal belum valid." },
        { status: 400 },
      );
    }
    const [yearText, monthText] = payload.date.split("-");
    const year = Number(yearText);
    const month = Number(monthText);
    const db = await getDb();
    const [sequence] = await db
      .insert(documentSequences)
      .values({ documentType: type, year, month, lastNumber: 1 })
      .onConflictDoUpdate({
        target: [
          documentSequences.documentType,
          documentSequences.year,
          documentSequences.month,
        ],
        set: {
          lastNumber: sql`${documentSequences.lastNumber} + 1`,
          updatedAt: new Date().toISOString(),
        },
      })
      .returning();
    const number = formatDocumentNumber(type, year, month, sequence.lastNumber);
    await addAudit(
      auth.user,
      "Buat nomor otomatis",
      DOCUMENT_NUMBER_TYPES[type].label,
      number,
      {
        entityId: number,
        changedFields: ["documentNumber"],
        after: { documentNumber: number },
      },
    );
    return Response.json({ number });
  } catch {
    return Response.json(
      { error: "Nomor otomatis belum dapat dibuat." },
      { status: 500 },
    );
  }
}
