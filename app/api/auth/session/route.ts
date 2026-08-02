import { eq } from "drizzle-orm";
import { getDb } from "../../../../db";
import { authSessions } from "../../../../db/schema";
import { getPasswordSession } from "../../../auth/session";

export async function GET(request: Request) {
  try {
    const auth = await getPasswordSession(request);
    if (!auth) {
      return Response.json({ authenticated: false }, { status: 401 });
    }
    const db = await getDb();
    await db
      .update(authSessions)
      .set({ lastSeenAt: new Date().toISOString() })
      .where(eq(authSessions.id, auth.session.id));
    return Response.json({
      authenticated: true,
      user: {
        email: auth.user.email,
        displayName: auth.user.displayName,
        role: auth.user.role,
        username: auth.credential.username,
      },
      mustChangePassword: auth.credential.mustChangePassword,
      expiresAt: auth.session.expiresAt,
    });
  } catch {
    return Response.json(
      { authenticated: false, error: "Session tidak dapat diperiksa." },
      { status: 500 },
    );
  }
}
