import { createRemoteJWKSet, jwtVerify } from "jose";

export type VerifiedIdentity = {
  email: string;
  displayName: string;
  provider: "cloudflare-access" | "transition";
  canBootstrapAdmin: boolean;
};

type AccessConfig = {
  teamDomain: string;
  audience: string;
  initialAdminEmail: string;
};

const jwksByDomain = new Map<string, ReturnType<typeof createRemoteJWKSet>>();

async function environmentValues() {
  const { env } = await import("cloudflare:workers");
  return env as unknown as Record<string, unknown>;
}

function textValue(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

async function accessConfig(): Promise<AccessConfig | null> {
  const values = await environmentValues();
  const rawDomain = textValue(values.CF_ACCESS_TEAM_DOMAIN);
  const audience = textValue(values.CF_ACCESS_AUD);
  const initialAdminEmail = textValue(
    values.CF_ACCESS_INITIAL_ADMIN_EMAIL,
  ).toLowerCase();
  if (!rawDomain || !audience) return null;

  const teamDomain = rawDomain.replace(/\/+$/, "");
  let parsed: URL;
  try {
    parsed = new URL(teamDomain);
  } catch {
    return null;
  }
  if (parsed.protocol !== "https:") return null;
  return { teamDomain, audience, initialAdminEmail };
}

async function cloudflareIdentity(
  request: Request,
  config: AccessConfig,
): Promise<VerifiedIdentity | null> {
  const token = request.headers.get("cf-access-jwt-assertion");
  if (!token) return null;

  try {
    let jwks = jwksByDomain.get(config.teamDomain);
    if (!jwks) {
      jwks = createRemoteJWKSet(
        new URL(`${config.teamDomain}/cdn-cgi/access/certs`),
      );
      jwksByDomain.set(config.teamDomain, jwks);
    }
    const { payload } = await jwtVerify(token, jwks, {
      issuer: config.teamDomain,
      audience: config.audience,
    });
    const email =
      typeof payload.email === "string"
        ? payload.email.trim().toLowerCase()
        : "";
    if (!email) return null;
    return {
      email,
      displayName: email,
      provider: "cloudflare-access",
      canBootstrapAdmin:
        Boolean(config.initialAdminEmail) &&
        email === config.initialAdminEmail,
    };
  } catch {
    return null;
  }
}

function transitionIdentity(request: Request): VerifiedIdentity | null {
  const email = request.headers
    .get("oai-authenticated-user-email")
    ?.trim()
    .toLowerCase();
  if (!email) return null;
  const encodedName = request.headers.get(
    "oai-authenticated-user-full-name",
  );
  const nameEncoding = request.headers.get(
    "oai-authenticated-user-full-name-encoding",
  );
  let displayName = email;
  if (encodedName && nameEncoding === "percent-encoded-utf-8") {
    try {
      displayName = decodeURIComponent(encodedName);
    } catch {
      // Gunakan email jika nama transisi tidak dapat dibaca.
    }
  }
  return {
    email,
    displayName,
    provider: "transition",
    canBootstrapAdmin: true,
  };
}

export async function getVerifiedIdentity(request: Request) {
  const config = await accessConfig();
  if (config) return cloudflareIdentity(request, config);

  // Mode transisi menjaga preview lokal tetap dapat digunakan. Fallback ini
  // berhenti dipakai otomatis ketika TEAM_DOMAIN dan AUD sudah dikonfigurasi.
  return transitionIdentity(request);
}
