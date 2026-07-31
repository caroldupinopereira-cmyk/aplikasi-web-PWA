import { desc, eq } from "drizzle-orm";
import { getDb } from "../../../db";
import { staffUsers } from "../../../db/schema";
import { addAudit, getRequestUser, recentAudit, requireRole, ROLES } from "../../security";

function message(error: unknown) {
  return error instanceof Error ? error.message : "Terjadi kesalahan.";
}

export async function GET(request: Request) {
  try {
    const currentUser = await getRequestUser(request);
    if (!currentUser) return Response.json({ error: "Akun belum terdaftar." }, { status: 401 });
    const db = await getDb();
    const users = currentUser.role === "Administrator"
      ? await db.select().from(staffUsers).orderBy(desc(staffUsers.active), staffUsers.displayName)
      : [await db.select().from(staffUsers).where(eq(staffUsers.email, currentUser.email)).limit(1).then((rows) => rows[0])];
    const logs = await recentAudit(30);
    return Response.json({ currentUser, users: users.filter(Boolean), logs });
  } catch (error) {
    return Response.json({ error: message(error) }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireRole(request, ["Administrator"]);
    if ("response" in auth) return auth.response;
    const payload = await request.json() as { email?: string; displayName?: string; role?: string };
    const email = payload.email?.trim().toLowerCase();
    const displayName = payload.displayName?.trim();
    if (!email || !displayName || !ROLES.includes(payload.role as typeof ROLES[number])) {
      return Response.json({ error: "Nama, email, dan peran yang benar wajib diisi." }, { status: 400 });
    }
    const db = await getDb();
    const [user] = await db.insert(staffUsers).values({
      email,
      displayName,
      role: payload.role!,
    }).onConflictDoUpdate({
      target: staffUsers.email,
      set: { displayName, role: payload.role!, active: true, updatedAt: new Date().toISOString() },
    }).returning();
    await addAudit(auth.user, "Tambah/perbarui staf", "Pengaturan", `${displayName} — ${payload.role}`);
    return Response.json({ user }, { status: 201 });
  } catch (error) {
    return Response.json({ error: message(error) }, { status: 500 });
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
    await addAudit(auth.user, "Ubah akses staf", "Pengaturan", `${user.displayName} — ${user.role} — ${user.active ? "Aktif" : "Nonaktif"}`);
    return Response.json({ user });
  } catch (error) {
    return Response.json({ error: message(error) }, { status: 500 });
  }
}
