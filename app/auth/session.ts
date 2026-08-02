import { and, eq, gt } from "drizzle-orm";
import { getDb } from "../../db";
import {
  authCredentials,
  authSessions,
  staffUsers,
} from "../../db/schema";
import { hashSessionToken } from "./password";
import {
  requestSessionToken,
  SESSION_DURATION_MS,
} from "./session-utils";

export {
  clearSessionCookies,
  createSessionCookie,
  requestHasValidOrigin,
  safeTextEqual,
} from "./session-utils";

export async function getPasswordSession(request: Request) {
  const token = requestSessionToken(request);
  if (!token) return null;
  const tokenHash = await hashSessionToken(token);
  const db = await getDb();
  const [row] = await db
    .select({
      session: authSessions,
      user: staffUsers,
      credential: authCredentials,
    })
    .from(authSessions)
    .innerJoin(staffUsers, eq(authSessions.staffUserId, staffUsers.id))
    .innerJoin(
      authCredentials,
      eq(authCredentials.staffUserId, staffUsers.id),
    )
    .where(
      and(
        eq(authSessions.tokenHash, tokenHash),
        gt(authSessions.expiresAt, new Date().toISOString()),
      ),
    )
    .limit(1);
  if (!row || !row.user.active) return null;
  return { ...row, tokenHash };
}

export function sessionExpiry() {
  return new Date(Date.now() + SESSION_DURATION_MS).toISOString();
}

export async function readAuthEnvironment() {
  const { env } = await import("cloudflare:workers");
  const values = env as unknown as Record<string, unknown>;
  return {
    setupCode:
      typeof values.AUTH_INITIAL_SETUP_CODE === "string"
        ? values.AUTH_INITIAL_SETUP_CODE
        : "",
  };
}
