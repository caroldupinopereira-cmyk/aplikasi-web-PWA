import { eq } from "drizzle-orm";
import { getDb } from "../../../../db";
import {
  authCredentials,
  authSessions,
  staffUsers,
} from "../../../../db/schema";
import { createPasswordHash } from "../../../auth/password";
import { addAudit, requireRole } from "../../../security";

function errorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : "Kata sandi belum dapat direset.";
}

export async function POST(request: Request) {
  try {
    const auth = await requireRole(request, ["Administrator"]);
    if ("response" in auth) return auth.response;

    const payload = (await request.json()) as {
      staffUserId?: number;
      temporaryPassword?: string;
    };
    if (
      !Number.isInteger(payload.staffUserId) ||
      Number(payload.staffUserId) < 1
    ) {
      return Response.json(
        { error: "Akun staf belum dipilih." },
        { status: 400 },
      );
    }

    const db = await getDb();
    const [target] = await db
      .select()
      .from(staffUsers)
      .where(eq(staffUsers.id, Number(payload.staffUserId)))
      .limit(1);
    if (!target) {
      return Response.json(
        { error: "Akun staf tidak ditemukan." },
        { status: 404 },
      );
    }
    if (target.email === auth.user.email) {
      return Response.json(
        {
          error:
            "Gunakan halaman Ganti Kata Sandi untuk akun Administrator sendiri.",
        },
        { status: 400 },
      );
    }

    const [credential] = await db
      .select({ id: authCredentials.id })
      .from(authCredentials)
      .where(eq(authCredentials.staffUserId, target.id))
      .limit(1);
    if (!credential) {
      return Response.json(
        { error: "Akun ini belum memiliki kredensial login." },
        { status: 409 },
      );
    }

    const passwordRecord = await createPasswordHash(
      payload.temporaryPassword ?? "",
    );
    const now = new Date().toISOString();
    await db
      .update(authCredentials)
      .set({
        passwordHash: passwordRecord.hash,
        passwordSalt: passwordRecord.salt,
        passwordIterations: passwordRecord.iterations,
        failedLoginAttempts: 0,
        lockedUntil: null,
        mustChangePassword: true,
        passwordChangedAt: now,
        updatedAt: now,
      })
      .where(eq(authCredentials.id, credential.id));
    await db
      .delete(authSessions)
      .where(eq(authSessions.staffUserId, target.id));
    await addAudit(
      auth.user,
      "Reset kata sandi staf",
      "Keamanan",
      `${target.displayName} wajib mengganti kata sandi saat login berikutnya.`,
    );

    return Response.json({
      success: true,
      message: "Kata sandi sementara berhasil dibuat.",
    });
  } catch (error) {
    const message = errorMessage(error);
    return Response.json(
      { error: message },
      { status: message.startsWith("Password") ? 400 : 500 },
    );
  }
}
