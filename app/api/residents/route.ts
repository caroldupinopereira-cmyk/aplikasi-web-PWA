import { desc } from "drizzle-orm";
import { getDb } from "../../../db";
import { residents } from "../../../db/schema";

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
  } catch (error) {
    return errorResponse(error);
  }
}
