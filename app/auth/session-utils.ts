const PRODUCTION_COOKIE = "__Host-sap_session";
const DEVELOPMENT_COOKIE = "sap_session";
export const SESSION_DURATION_MS = 8 * 60 * 60 * 1000;

export function requestUsesHttps(request: Request) {
  return new URL(request.url).protocol === "https:";
}

export function sessionCookieName(request: Request) {
  return requestUsesHttps(request) ? PRODUCTION_COOKIE : DEVELOPMENT_COOKIE;
}

function cookieValue(request: Request, name: string) {
  const cookies = request.headers.get("cookie") ?? "";
  for (const item of cookies.split(";")) {
    const separator = item.indexOf("=");
    if (separator < 0) continue;
    if (item.slice(0, separator).trim() === name) {
      return decodeURIComponent(item.slice(separator + 1).trim());
    }
  }
  return null;
}

export function requestSessionToken(request: Request) {
  return (
    cookieValue(request, PRODUCTION_COOKIE) ??
    cookieValue(request, DEVELOPMENT_COOKIE)
  );
}

export function createSessionCookie(request: Request, token: string) {
  const secure = requestUsesHttps(request) ? "; Secure" : "";
  return `${sessionCookieName(request)}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${Math.floor(SESSION_DURATION_MS / 1000)}${secure}`;
}

export function clearSessionCookies(headers: Headers) {
  const attributes = "Path=/; HttpOnly; SameSite=Strict; Max-Age=0";
  headers.append("Set-Cookie", `${PRODUCTION_COOKIE}=; ${attributes}; Secure`);
  headers.append("Set-Cookie", `${DEVELOPMENT_COOKIE}=; ${attributes}`);
}

export function requestHasValidOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  try {
    return new URL(origin).origin === new URL(request.url).origin;
  } catch {
    return false;
  }
}

export async function safeTextEqual(left: string, right: string) {
  const encoder = new TextEncoder();
  const [leftHash, rightHash] = await Promise.all([
    crypto.subtle.digest("SHA-256", encoder.encode(left)),
    crypto.subtle.digest("SHA-256", encoder.encode(right)),
  ]);
  const first = new Uint8Array(leftHash);
  const second = new Uint8Array(rightHash);
  let difference = 0;
  for (let index = 0; index < first.length; index += 1) {
    difference |= first[index] ^ second[index];
  }
  return difference === 0;
}
