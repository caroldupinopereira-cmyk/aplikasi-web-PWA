import { and, eq, ne } from "drizzle-orm";
import { getDb } from "../../../../db";
import {
  auditLogs,
  authCredentials,
  authSessions,
} from "../../../../db/schema";
import {
  createPasswordHash,
  verifyPassword,
} from "../../../auth/password";
import {
  getPasswordSession,
  requestHasValidOrigin,
} from "../../../auth/session";

export async function POST(request: Request) {
  try {
    if (!requestHasValidOrigin(request)) {
      return Response.json({ error: "Permintaan tidak valid." }, { status: 403 });
    }
    const auth = await getPasswordSession(request);
    if (!auth) {
      return Response.json({ error: "Session tidak valid." }, { status: 401 });
    }
    const payload = (await request.json()) as Record<string, unknown>;
    const currentPassword =
      typeof payload.currentPassword === "string"
        ? payload.currentPassword
        : "";
    const newPassword =
      typeof payload.newPassword === "string" ? payload.newPassword : "";
    const currentMatches = await verifyPassword(
      currentPassword,
      auth.credential.passwordHash,
      auth.credential.passwordSalt,
      auth.credential.passwordIterations,
    );
    if (!currentMatches) {
      return Response.json(
        { error: "Password saat ini tidak benar." },
        { status: 400 },
      );
    }
    if (currentPassword === newPassword) {
      return Response.json(
        { error: "Password baru harus berbeda dari password saat ini." },
        { status: 400 },
      );
    }

    const passwordRecord = await createPasswordHash(newPassword);
    const db = await getDb();
    await db
      .update(authCredentials)
      .set({
        passwordHash: passwordRecord.hash,
        passwordSalt: passwordRecord.salt,
        passwordIterations: passwordRecord.iterations,
        failedLoginAttempts: 0,
        lockedUntil: null,
        mustChangePassword: false,
        passwordChangedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
      .where(eq(authCredentials.id, auth.credential.id));
    await db
      .delete(authSessions)
      .where(
        and(
          eq(authSessions.staffUserId, auth.user.id),
          ne(authSessions.tokenHash, auth.tokenHash),
        ),
      );
    await db.insert(auditLogs).values({
      actorEmail: auth.user.email,
      actorName: auth.user.displayName,
      action: "Ubah password",
      module: "Keamanan",
      details: "Password diperbarui dan session lain dicabut.",
    });
    return Response.json({ success: true });
  } catch (error) {
    const message =
      error instanceof Error && error.message.startsWith("Password")
        ? error.message
        : "Password belum dapat diperbarui.";
    return Response.json({ error: message }, { status: 400 });
  }
}
