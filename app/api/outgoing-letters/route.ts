import { desc, eq } from "drizzle-orm";
import { getDb } from "../../../db";
import { outgoingLetters } from "../../../db/schema";

function errorResponse(error: unknown) {
  const message = error instanceof Error ? error.message : "Terjadi kesalahan.";
  return Response.json({ error: message }, { status: 500 });
}

export async function GET() {
  try {
    const db = await getDb();
    const rows = await db
      .select()
      .from(outgoingLetters)
      .orderBy(desc(outgoingLetters.letterDate), desc(outgoingLetters.id));
    return Response.json({ letters: rows });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as Record<string, string>;
    const required = ["letterNumber", "letterDate", "recipient", "subject", "signatory"];
    const missing = required.find((key) => !payload[key]?.trim());

    if (missing) {
      return Response.json({ error: `Kolom ${missing} wajib diisi.` }, { status: 400 });
    }

    const db = await getDb();
    const [letter] = await db
      .insert(outgoingLetters)
      .values({
        letterNumber: payload.letterNumber.trim(),
        letterDate: payload.letterDate,
        recipient: payload.recipient.trim(),
        subject: payload.subject.trim(),
        category: payload.category?.trim() || "Umum",
        signatory: payload.signatory.trim(),
        deliveryMethod: payload.deliveryMethod?.trim() || "Diantar",
        status: "Draf",
        notes: payload.notes?.trim() || "",
      })
      .returning();

    return Response.json({ letter }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const payload = (await request.json()) as { id?: number; status?: string };
    const allowed = ["Draf", "Menunggu Persetujuan", "Disetujui", "Terkirim"];

    if (!payload.id || !payload.status || !allowed.includes(payload.status)) {
      return Response.json({ error: "Data status tidak valid." }, { status: 400 });
    }

    const db = await getDb();
    const [letter] = await db
      .update(outgoingLetters)
      .set({ status: payload.status })
      .where(eq(outgoingLetters.id, payload.id))
      .returning();

    return Response.json({ letter });
  } catch (error) {
    return errorResponse(error);
  }
}
