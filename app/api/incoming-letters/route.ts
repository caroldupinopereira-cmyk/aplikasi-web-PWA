import { desc, eq } from "drizzle-orm";
import { getDb } from "../../../db";
import { incomingLetters } from "../../../db/schema";

function errorResponse(error: unknown) {
  const message = error instanceof Error ? error.message : "Terjadi kesalahan.";
  return Response.json({ error: message }, { status: 500 });
}

export async function GET() {
  try {
    const db = await getDb();
    const rows = await db
      .select()
      .from(incomingLetters)
      .orderBy(desc(incomingLetters.receivedDate), desc(incomingLetters.id));
    return Response.json({ letters: rows });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as Record<string, string>;
    const required = ["letterNumber", "receivedDate", "letterDate", "sender", "subject"];
    const missing = required.find((key) => !payload[key]?.trim());

    if (missing) {
      return Response.json({ error: `Kolom ${missing} wajib diisi.` }, { status: 400 });
    }

    const db = await getDb();
    const [letter] = await db
      .insert(incomingLetters)
      .values({
        letterNumber: payload.letterNumber.trim(),
        receivedDate: payload.receivedDate,
        letterDate: payload.letterDate,
        sender: payload.sender.trim(),
        subject: payload.subject.trim(),
        category: payload.category?.trim() || "Umum",
        status: "Baru",
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
    const allowed = ["Baru", "Diproses", "Selesai"];

    if (!payload.id || !payload.status || !allowed.includes(payload.status)) {
      return Response.json({ error: "Data status tidak valid." }, { status: 400 });
    }

    const db = await getDb();
    const [letter] = await db
      .update(incomingLetters)
      .set({ status: payload.status })
      .where(eq(incomingLetters.id, payload.id))
      .returning();

    return Response.json({ letter });
  } catch (error) {
    return errorResponse(error);
  }
}
