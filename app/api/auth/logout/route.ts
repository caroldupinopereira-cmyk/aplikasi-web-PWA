import { eq } from "drizzle-orm";
import { getDb } from "../../../../db";
import { auditLogs, authSessions } from "../../../../db/schema";
import {
  clearSessionCookies,
  getPasswordSession,
  requestHasValidOrigin,
} from "../../../auth/session";

export async function POST(request: Request) {
  const headers = new Headers();
  clearSessionCookies(headers);
  try {
    if (!requestHasValidOrigin(request)) {
      return Response.json(
        { error: "Permintaan tidak valid." },
        { status: 403, headers },
      );
    }
    const auth = await getPasswordSession(request);
    if (auth) {
      const db = await getDb();
      await db
        .delete(authSessions)
        .where(eq(authSessions.tokenHash, auth.tokenHash));
      await db.insert(auditLogs).values({
        actorEmail: auth.user.email,
        actorName: auth.user.displayName,
        action: "Logout",
        module: "Keamanan",
        details: "Session login password diakhiri.",
      });
    }
    return Response.json({ success: true }, { headers });
  } catch {
    return Response.json({ success: true }, { headers });
  }
}
