import { eq } from "drizzle-orm";
import { getDb } from "../../../../db";
import {
  auditLogs,
  authCredentials,
  staffUsers,
} from "../../../../db/schema";
import { createPasswordHash } from "../../../auth/password";
import {
  readAuthEnvironment,
  requestHasValidOrigin,
  safeTextEqual,
} from "../../../auth/session";

const usernamePattern = /^[a-z0-9._-]{3,40}$/;

export async function POST(request: Request) {
  try {
    if (!requestHasValidOrigin(request)) {
      return Response.json({ error: "Permintaan tidak valid." }, { status: 403 });
    }

    const { setupCode } = await readAuthEnvironment();
    if (setupCode.length < 20) {
      return Response.json(
        { error: "Setup awal belum dikonfigurasi oleh pengelola sistem." },
        { status: 503 },
      );
    }

    const payload = (await request.json()) as Record<string, unknown>;
    const providedCode =
      typeof payload.setupCode === "string" ? payload.setupCode : "";
    if (!(await safeTextEqual(providedCode, setupCode))) {
      return Response.json({ error: "Setup awal tidak valid." }, { status: 403 });
    }

    const displayName =
      typeof payload.displayName === "string" ? payload.displayName.trim() : "";
    const email =
      typeof payload.email === "string"
        ? payload.email.trim().toLowerCase()
        : "";
    const username =
      typeof payload.username === "string"
        ? payload.username.trim().toLowerCase()
        : "";
    const password = typeof payload.password === "string" ? payload.password : "";
    if (
      displayName.length < 2 ||
      !email.includes("@") ||
      !usernamePattern.test(username)
    ) {
      return Response.json(
        { error: "Nama, email, atau username belum valid." },
        { status: 400 },
      );
    }

    const db = await getDb();
    const existingCredentials = await db
      .select({ id: authCredentials.id })
      .from(authCredentials)
      .limit(1);
    if (existingCredentials.length) {
      return Response.json(
        { error: "Setup awal sudah pernah diselesaikan." },
        { status: 409 },
      );
    }

    const passwordRecord = await createPasswordHash(password);
    const [knownUser] = await db
      .select()
      .from(staffUsers)
      .where(eq(staffUsers.email, email))
      .limit(1);
    const [user] = knownUser
      ? await db
          .update(staffUsers)
          .set({
            displayName,
            role: "Administrator",
            active: true,
            updatedAt: new Date().toISOString(),
          })
          .where(eq(staffUsers.id, knownUser.id))
          .returning()
      : await db
          .insert(staffUsers)
          .values({
            email,
            displayName,
            role: "Administrator",
            active: true,
          })
          .returning();

    await db.insert(authCredentials).values({
      staffUserId: user.id,
      username,
      passwordHash: passwordRecord.hash,
      passwordSalt: passwordRecord.salt,
      passwordIterations: passwordRecord.iterations,
      mustChangePassword: false,
    });
    await db.insert(auditLogs).values({
      actorEmail: user.email,
      actorName: user.displayName,
      action: "Setup autentikasi",
      module: "Keamanan",
      details: "Administrator pertama untuk login password telah dibuat.",
    });

    return Response.json(
      { success: true, message: "Administrator pertama berhasil dibuat." },
      { status: 201 },
    );
  } catch (error) {
    const message =
      error instanceof Error && error.message.startsWith("Password")
        ? error.message
        : "Setup awal tidak dapat diselesaikan.";
    return Response.json({ error: message }, { status: 400 });
  }
}
