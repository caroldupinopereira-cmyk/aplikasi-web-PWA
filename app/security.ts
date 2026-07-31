import { desc, eq } from "drizzle-orm";
import { getDb } from "../db";
import { auditLogs, staffUsers } from "../db/schema";

export const ROLES = ["Administrator", "Pimpinan", "Staf", "Viewer"] as const;
export type StaffRole = (typeof ROLES)[number];
export const READ_ROLES: StaffRole[] = ["Administrator", "Pimpinan", "Staf", "Viewer"];
export const WRITE_ROLES: StaffRole[] = ["Administrator", "Pimpinan", "Staf"];
export const MANAGE_ROLES: StaffRole[] = ["Administrator", "Pimpinan"];

export type RequestUser = {
  email: string;
  displayName: string;
  role: StaffRole;
  active: boolean;
};

function requestIdentity(request: Request) {
  const email = request.headers.get("oai-authenticated-user-email")?.trim().toLowerCase();
  if (!email) return null;
  const encodedName = request.headers.get("oai-authenticated-user-full-name");
  const nameEncoding = request.headers.get("oai-authenticated-user-full-name-encoding");
  let displayName = email;
  if (encodedName && nameEncoding === "percent-encoded-utf-8") {
    try { displayName = decodeURIComponent(encodedName); } catch { /* use email */ }
  }
  return { email, displayName };
}

export async function getRequestUser(request: Request): Promise<RequestUser | null> {
  const identity = requestIdentity(request);
  if (!identity) return null;
  const db = await getDb();
  const [known] = await db.select().from(staffUsers).where(eq(staffUsers.email, identity.email)).limit(1);
  if (known) {
    return { email: known.email, displayName: known.displayName, role: known.role as StaffRole, active: known.active };
  }

  const existing = await db.select({ id: staffUsers.id }).from(staffUsers).limit(1);
  if (existing.length) return null;
  const [first] = await db.insert(staffUsers).values({
    email: identity.email,
    displayName: identity.displayName,
    role: "Administrator",
  }).returning();
  await db.insert(auditLogs).values({
    actorEmail: identity.email,
    actorName: identity.displayName,
    action: "Inisialisasi akun",
    module: "Keamanan",
    details: "Akun pertama ditetapkan sebagai Administrator.",
  });
  return { email: first.email, displayName: first.displayName, role: "Administrator", active: true };
}

export async function requireRole(request: Request, allowed: StaffRole[]) {
  const user = await getRequestUser(request);
  if (!user) return { response: Response.json({ error: "Akun belum terdaftar." }, { status: 401 }) };
  if (!user.active) return { response: Response.json({ error: "Akun dinonaktifkan." }, { status: 403 }) };
  if (!allowed.includes(user.role)) return { response: Response.json({ error: "Anda tidak memiliki izin untuk tindakan ini." }, { status: 403 }) };
  return { user };
}

export async function addAudit(user: RequestUser, action: string, module: string, details: string) {
  const db = await getDb();
  await db.insert(auditLogs).values({
    actorEmail: user.email,
    actorName: user.displayName,
    action,
    module,
    details,
  });
}

export async function recentAudit(limit = 30) {
  const db = await getDb();
  return db.select().from(auditLogs).orderBy(desc(auditLogs.id)).limit(limit);
}
