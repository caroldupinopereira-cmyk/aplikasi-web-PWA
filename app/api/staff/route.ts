import { desc, eq } from "drizzle-orm";
import { getDb } from "../../../db";
import { authCredentials, authSessions, staffUsers } from "../../../db/schema";
import { createPasswordHash } from "../../auth/password";
import { addAudit, recentAudit, requireRole, ROLES } from "../../security";
import { staffAccountDeletionError } from "../../staff-account";

function message(error: unknown) {
  return error instanceof Error ? error.message : "Terjadi kesalahan.";
}

export async function GET(request: Request) {
  try {
    const auth = await requireRole(request, ["Administrator"]);
    if ("response" in auth) return auth.response;
    const currentUser = auth.user;
    const db = await getDb();
    const users = await db.select().from(staffUsers).orderBy(desc(staffUsers.active), staffUsers.displayName);
    const logs = await recentAudit(30);
    return Response.json({ currentUser, users, logs });
  } catch (error) {
    return Response.json({ error: message(error) }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireRole(request, ["Administrator"]);
    if ("response" in auth) return auth.response;
    const payload = await request.json() as {
      email?: string;
      displayName?: string;
      role?: string;
      username?: string;
      temporaryPassword?: string;
    };
    const email = payload.email?.trim().toLowerCase();
    const displayName = payload.displayName?.trim();
    const username = payload.username?.trim().toLowerCase();
    const temporaryPassword = payload.temporaryPassword ?? "";
    if (
      !email ||
      !displayName ||
      !username ||
      !/^[a-z0-9._-]{3,40}$/.test(username) ||
      !ROLES.includes(payload.role as typeof ROLES[number])
    ) {
      return Response.json({ error: "Nama, email, username, dan peran yang benar wajib diisi." }, { status: 400 });
    }
    const db = await getDb();
    const [usernameOwner] = await db
      .select({ staffUserId: authCredentials.staffUserId })
      .from(authCredentials)
      .where(eq(authCredentials.username, username))
      .limit(1);
    const [knownUser] = await db
      .select()
      .from(staffUsers)
      .where(eq(staffUsers.email, email))
      .limit(1);
    if (usernameOwner && usernameOwner.staffUserId !== knownUser?.id) {
      return Response.json({ error: "Username sudah digunakan oleh akun lain." }, { status: 409 });
    }
    const passwordRecord = await createPasswordHash(temporaryPassword);
    const [user] = await db.insert(staffUsers).values({
      email,
      displayName,
      role: payload.role!,
    }).onConflictDoUpdate({
      target: staffUsers.email,
      set: { displayName, role: payload.role!, active: true, updatedAt: new Date().toISOString() },
    }).returning();
    await db
      .insert(authCredentials)
      .values({
        staffUserId: user.id,
        username,
        passwordHash: passwordRecord.hash,
        passwordSalt: passwordRecord.salt,
        passwordIterations: passwordRecord.iterations,
        mustChangePassword: true,
      })
      .onConflictDoUpdate({
        target: authCredentials.staffUserId,
        set: {
          username,
          passwordHash: passwordRecord.hash,
          passwordSalt: passwordRecord.salt,
          passwordIterations: passwordRecord.iterations,
          failedLoginAttempts: 0,
          lockedUntil: null,
          mustChangePassword: true,
          updatedAt: new Date().toISOString(),
        },
      });
    await db.delete(authSessions).where(eq(authSessions.staffUserId, user.id));
    await addAudit(auth.user, "Tambah/perbarui staf", "Pengaturan", `${displayName} — ${payload.role}`);
    return Response.json({ user }, { status: 201 });
  } catch (error) {
    const errorMessage = message(error);
    return Response.json(
      { error: errorMessage },
      { status: errorMessage.startsWith("Password") ? 400 : 500 },
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const auth = await requireRole(request, ["Administrator"]);
    if ("response" in auth) return auth.response;
    const payload = await request.json() as { id?: number; role?: string; active?: boolean };
    if (!payload.id || !ROLES.includes(payload.role as typeof ROLES[number]) || typeof payload.active !== "boolean") {
      return Response.json({ error: "Perubahan akun tidak valid." }, { status: 400 });
    }
    const db = await getDb();
    const [target] = await db.select().from(staffUsers).where(eq(staffUsers.id, payload.id)).limit(1);
    if (!target) return Response.json({ error: "Akun tidak ditemukan." }, { status: 404 });
    if (target.email === auth.user.email && (!payload.active || payload.role !== "Administrator")) {
      return Response.json({ error: "Administrator tidak dapat menurunkan atau menonaktifkan akunnya sendiri." }, { status: 400 });
    }
    const [user] = await db.update(staffUsers).set({
      role: payload.role!,
      active: payload.active,
      updatedAt: new Date().toISOString(),
    }).where(eq(staffUsers.id, payload.id)).returning();
    if (!user.active) {
      await db.delete(authSessions).where(eq(authSessions.staffUserId, user.id));
    }
    await addAudit(auth.user, "Ubah akses staf", "Pengaturan", `${user.displayName} — ${user.role} — ${user.active ? "Aktif" : "Nonaktif"}`);
    return Response.json({ user });
  } catch (error) {
    return Response.json({ error: message(error) }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const auth = await requireRole(request, ["Administrator"]);
    if ("response" in auth) return auth.response;
    const payload = await request.json() as {
      id?: number;
      confirmationName?: string;
    };
    if (!Number.isInteger(payload.id) || Number(payload.id) <= 0) {
      return Response.json({ error: "Akun yang akan dihapus tidak valid." }, { status: 400 });
    }

    const db = await getDb();
    const [target] = await db
      .select()
      .from(staffUsers)
      .where(eq(staffUsers.id, Number(payload.id)))
      .limit(1);
    if (!target) {
      return Response.json({ error: "Akun tidak ditemukan." }, { status: 404 });
    }

    const deletionError = staffAccountDeletionError(
      auth.user.email,
      target,
      payload.confirmationName ?? "",
    );
    if (deletionError) {
      return Response.json({ error: deletionError }, { status: 400 });
    }

    await db.delete(staffUsers).where(eq(staffUsers.id, target.id));
    await addAudit(
      auth.user,
      "Hapus akun staf",
      "Pengaturan",
      `${target.displayName} — ${target.role} — ${target.email}`,
      {
        entityId: target.id,
        before: {
          displayName: target.displayName,
          email: target.email,
          role: target.role,
          active: target.active,
        },
      },
    );
    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: message(error) }, { status: 500 });
  }
}
