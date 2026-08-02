import { eq, lte, or } from "drizzle-orm";
import { getDb } from "../../../../db";
import {
  auditLogs,
  authCredentials,
  authSessions,
  staffUsers,
} from "../../../../db/schema";
import {
  PASSWORD_ITERATIONS,
  createSessionToken,
  verifyPassword,
} from "../../../auth/password";
import {
  createSessionCookie,
  requestHasValidOrigin,
  sessionExpiry,
} from "../../../auth/session";

const MAX_FAILED_ATTEMPTS = 5;
const LOCK_DURATION_MS = 15 * 60 * 1000;
const DUMMY_HASH = "00".repeat(32);
const DUMMY_SALT = "00".repeat(16);
const genericError = "Username/email atau password tidak benar.";

export async function POST(request: Request) {
  try {
    if (!requestHasValidOrigin(request)) {
      return Response.json({ error: "Permintaan tidak valid." }, { status: 403 });
    }
    const payload = (await request.json()) as Record<string, unknown>;
    const identifier =
      typeof payload.identifier === "string"
        ? payload.identifier.trim().toLowerCase()
        : "";
    const suppliedPassword =
      typeof payload.password === "string" ? payload.password : "";
    const password = Array.from(suppliedPassword).slice(0, 128).join("");
    const db = await getDb();
    await db
      .delete(authSessions)
      .where(lte(authSessions.expiresAt, new Date().toISOString()));

    const [account] = await db
      .select({
        credential: authCredentials,
        user: staffUsers,
      })
      .from(authCredentials)
      .innerJoin(staffUsers, eq(authCredentials.staffUserId, staffUsers.id))
      .where(
        or(
          eq(authCredentials.username, identifier),
          eq(staffUsers.email, identifier),
        ),
      )
      .limit(1);

    if (!account) {
      await verifyPassword(
        password,
        DUMMY_HASH,
        DUMMY_SALT,
        PASSWORD_ITERATIONS,
      );
      return Response.json({ error: genericError }, { status: 401 });
    }

    const passwordMatches = await verifyPassword(
      password,
      account.credential.passwordHash,
      account.credential.passwordSalt,
      account.credential.passwordIterations,
    );
    const now = new Date();
    const locked =
      Boolean(account.credential.lockedUntil) &&
      new Date(account.credential.lockedUntil as string) > now;
    if (!passwordMatches || !account.user.active || locked) {
      if (!locked && account.user.active) {
        const failedLoginAttempts =
          account.credential.failedLoginAttempts + 1;
        const shouldLock = failedLoginAttempts >= MAX_FAILED_ATTEMPTS;
        await db
          .update(authCredentials)
          .set({
            failedLoginAttempts,
            lockedUntil: shouldLock
              ? new Date(Date.now() + LOCK_DURATION_MS).toISOString()
              : null,
            updatedAt: now.toISOString(),
          })
          .where(eq(authCredentials.id, account.credential.id));
        if (shouldLock) {
          await db.insert(auditLogs).values({
            actorEmail: account.user.email,
            actorName: account.user.displayName,
            action: "Akun dikunci sementara",
            module: "Keamanan",
            details: "Terlalu banyak percobaan login yang gagal.",
          });
        }
      }
      return Response.json({ error: genericError }, { status: 401 });
    }

    const { token, tokenHash } = await createSessionToken();
    await db.insert(authSessions).values({
      staffUserId: account.user.id,
      tokenHash,
      userAgent:
        request.headers.get("user-agent")?.slice(0, 300) ||
        "Perangkat tidak dikenal",
      expiresAt: sessionExpiry(),
    });
    await db
      .update(authCredentials)
      .set({
        failedLoginAttempts: 0,
        lockedUntil: null,
        updatedAt: now.toISOString(),
      })
      .where(eq(authCredentials.id, account.credential.id));
    await db.insert(auditLogs).values({
      actorEmail: account.user.email,
      actorName: account.user.displayName,
      action: "Login berhasil",
      module: "Keamanan",
      details: "Session login password dibuat.",
    });

    return Response.json(
      {
        success: true,
        mustChangePassword: account.credential.mustChangePassword,
      },
      {
        headers: {
          "Set-Cookie": createSessionCookie(request, token),
        },
      },
    );
  } catch {
    return Response.json(
      { error: "Layanan login belum dapat digunakan." },
      { status: 500 },
    );
  }
}
