import { and, desc, eq, ne } from "drizzle-orm";
import { getDb } from "../../../../db";
import { authSessions } from "../../../../db/schema";
import {
  getPasswordSession,
  requestHasValidOrigin,
} from "../../../auth/session";
import { addAudit } from "../../../security";

export async function GET(request: Request) {
  try {
    const auth = await getPasswordSession(request);
    if (!auth) {
      return Response.json(
        { error: "Silakan login terlebih dahulu." },
        { status: 401 },
      );
    }
    const db = await getDb();
    const sessions = await db
      .select({
        id: authSessions.id,
        userAgent: authSessions.userAgent,
        expiresAt: authSessions.expiresAt,
        lastSeenAt: authSessions.lastSeenAt,
        createdAt: authSessions.createdAt,
      })
      .from(authSessions)
      .where(eq(authSessions.staffUserId, auth.user.id))
      .orderBy(desc(authSessions.lastSeenAt));

    return Response.json({
      currentSessionId: auth.session.id,
      sessions,
    });
  } catch {
    return Response.json(
      { error: "Daftar session belum dapat dimuat." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    if (!requestHasValidOrigin(request)) {
      return Response.json(
        { error: "Permintaan tidak valid." },
        { status: 403 },
      );
    }
    const auth = await getPasswordSession(request);
    if (!auth) {
      return Response.json(
        { error: "Silakan login terlebih dahulu." },
        { status: 401 },
      );
    }
    const payload = (await request.json()) as {
      action?: string;
      sessionId?: number;
    };
    const db = await getDb();
    if (payload.action === "revoke-others") {
      await db
        .delete(authSessions)
        .where(
          and(
            eq(authSessions.staffUserId, auth.user.id),
            ne(authSessions.id, auth.session.id),
          ),
        );
      await addAudit(
        {
          email: auth.user.email,
          displayName: auth.user.displayName,
          role: auth.user.role as "Administrator" | "Pimpinan" | "Staf" | "Viewer",
          active: auth.user.active,
        },
        "Hentikan session lain",
        "Keamanan",
        "Semua session selain perangkat saat ini dihentikan.",
      );
      return Response.json({ success: true });
    }
    if (
      payload.action === "revoke-one" &&
      Number.isInteger(payload.sessionId) &&
      payload.sessionId !== auth.session.id
    ) {
      await db
        .delete(authSessions)
        .where(
          and(
            eq(authSessions.id, Number(payload.sessionId)),
            eq(authSessions.staffUserId, auth.user.id),
          ),
        );
      return Response.json({ success: true });
    }
    return Response.json(
      { error: "Tindakan session tidak valid." },
      { status: 400 },
    );
  } catch {
    return Response.json(
      { error: "Session belum dapat dihentikan." },
      { status: 500 },
    );
  }
}
