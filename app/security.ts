import { desc, sql } from "drizzle-orm";
import { getDb } from "../db";
import { auditLogs } from "../db/schema";
import { auditRetentionCutoff } from "./audit-retention";
import { getPasswordSession, requestHasValidOrigin } from "./auth/session";
import {
  ROLES,
  rolesWith,
  type StaffRole,
} from "./roles";

export { ROLES, type StaffRole };
export const READ_ROLES = rolesWith("read");
export const WRITE_ROLES = rolesWith("writeOperational");
export const MANAGE_ROLES = rolesWith("approve");
export const ADMIN_ROLES = rolesWith("deletePermanent");

export type RequestUser = {
  id: number;
  email: string;
  displayName: string;
  role: StaffRole;
  active: boolean;
};

export async function getRequestUser(request: Request): Promise<RequestUser | null> {
  const auth = await getPasswordSession(request);
  if (!auth) return null;
  return {
    id: auth.user.id,
    email: auth.user.email,
    displayName: auth.user.displayName,
    role: auth.user.role as StaffRole,
    active: auth.user.active,
  };
}

export async function requireRole(request: Request, allowed: StaffRole[]) {
  if (request.method !== "GET" && !requestHasValidOrigin(request)) {
    return { response: Response.json({ error: "Permintaan tidak valid." }, { status: 403 }) };
  }
  const auth = await getPasswordSession(request);
  if (!auth) return { response: Response.json({ error: "Silakan login terlebih dahulu." }, { status: 401 }) };
  if (auth.credential.mustChangePassword) {
    return {
      response: Response.json(
        { error: "Kata sandi wajib diganti sebelum menggunakan sistem.", code: "PASSWORD_CHANGE_REQUIRED" },
        { status: 403 },
      ),
    };
  }
  const user: RequestUser = {
    id: auth.user.id,
    email: auth.user.email,
    displayName: auth.user.displayName,
    role: auth.user.role as StaffRole,
    active: auth.user.active,
  };
  if (!user.active) return { response: Response.json({ error: "Akun dinonaktifkan." }, { status: 403 }) };
  if (!allowed.includes(user.role)) return { response: Response.json({ error: "Anda tidak memiliki izin untuk tindakan ini." }, { status: 403 }) };
  return { user };
}

export type AuditChange = {
  entityId?: string | number;
  changedFields?: string[];
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
};

export async function pruneExpiredAuditLogs() {
  const db = await getDb();
  const cutoff = auditRetentionCutoff();
  await db
    .delete(auditLogs)
    .where(sql`datetime(${auditLogs.createdAt}) < datetime(${cutoff})`);
}

export async function addAudit(
  user: RequestUser,
  action: string,
  module: string,
  details: string,
  change: AuditChange = {},
) {
  const db = await getDb();
  await pruneExpiredAuditLogs();
  await db.insert(auditLogs).values({
    actorEmail: user.email,
    actorName: user.displayName,
    action,
    module,
    details,
    entityId:
      change.entityId === undefined ? null : String(change.entityId),
    changedFields: JSON.stringify(change.changedFields ?? []),
    beforeData: change.before ? JSON.stringify(change.before) : null,
    afterData: change.after ? JSON.stringify(change.after) : null,
  });
}

export function auditDifference(
  before: Record<string, unknown>,
  after: Record<string, unknown>,
  candidateFields: string[],
  snapshotFields: string[] = candidateFields,
): AuditChange {
  const changedFields = candidateFields.filter(
    (field) => before[field] !== after[field],
  );
  const select = (source: Record<string, unknown>) =>
    Object.fromEntries(
      changedFields
        .filter((field) => snapshotFields.includes(field))
        .map((field) => [field, source[field]]),
    );
  return {
    changedFields,
    before: select(before),
    after: select(after),
  };
}

export async function recentAudit(limit = 30) {
  const db = await getDb();
  await pruneExpiredAuditLogs();
  return db.select().from(auditLogs).orderBy(desc(auditLogs.id)).limit(limit);
}
