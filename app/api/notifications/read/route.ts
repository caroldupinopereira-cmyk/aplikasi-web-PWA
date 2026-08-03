import { getDb } from "../../../../db";
import { notificationStates } from "../../../../db/schema";
import { READ_ROLES, requireRole } from "../../../security";

export async function POST(request: Request) {
  try {
    const auth = await requireRole(request, READ_ROLES);
    if ("response" in auth) return auth.response;
    const now = new Date().toISOString();
    const db = await getDb();
    await db
      .insert(notificationStates)
      .values({
        staffUserId: auth.user.id,
        lastSeenAt: now,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: notificationStates.staffUserId,
        set: { lastSeenAt: now, updatedAt: now },
      });
    return Response.json({ success: true, lastSeenAt: now });
  } catch {
    return Response.json(
      { error: "Notifikasi belum dapat ditandai sudah dilihat." },
      { status: 500 },
    );
  }
}
