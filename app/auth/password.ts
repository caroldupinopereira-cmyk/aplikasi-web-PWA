export const PASSWORD_MIN_LENGTH = 12;
export const PASSWORD_MAX_LENGTH = 128;
export const PASSWORD_ITERATIONS = 600_000;

const encoder = new TextEncoder();
const SALT_BYTES = 16;
const HASH_BYTES = 32;
const SESSION_TOKEN_BYTES = 32;

function bytesToHex(bytes: Uint8Array) {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function hexToBytes(value: string) {
  if (!/^[0-9a-f]+$/i.test(value) || value.length % 2 !== 0) {
    throw new Error("Format nilai hexadecimal tidak valid.");
  }
  const bytes = new Uint8Array(value.length / 2);
  for (let index = 0; index < bytes.length; index += 1) {
    bytes[index] = Number.parseInt(value.slice(index * 2, index * 2 + 2), 16);
  }
  return bytes;
}

function randomHex(length: number) {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return bytesToHex(bytes);
}

async function derivePasswordHash(
  password: string,
  salt: Uint8Array,
  iterations: number,
) {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      hash: "SHA-256",
      salt,
      iterations,
    },
    key,
    HASH_BYTES * 8,
  );
  return new Uint8Array(bits);
}

function constantTimeEqual(left: Uint8Array, right: Uint8Array) {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) {
    difference |= left[index] ^ right[index];
  }
  return difference === 0;
}

export function passwordValidationError(password: string) {
  const length = Array.from(password).length;
  if (length < PASSWORD_MIN_LENGTH) {
    return `Password minimal ${PASSWORD_MIN_LENGTH} karakter.`;
  }
  if (length > PASSWORD_MAX_LENGTH) {
    return `Password maksimal ${PASSWORD_MAX_LENGTH} karakter.`;
  }
  if (
    !/[a-z]/.test(password) ||
    !/[A-Z]/.test(password) ||
    !/[0-9]/.test(password) ||
    !/[^A-Za-z0-9]/.test(password)
  ) {
    return "Password harus berisi huruf besar, huruf kecil, angka, dan simbol.";
  }
  return null;
}

export async function createPasswordHash(password: string) {
  const validationError = passwordValidationError(password);
  if (validationError) throw new Error(validationError);

  const salt = randomHex(SALT_BYTES);
  const hash = await derivePasswordHash(
    password,
    hexToBytes(salt),
    PASSWORD_ITERATIONS,
  );
  return {
    hash: bytesToHex(hash),
    salt,
    iterations: PASSWORD_ITERATIONS,
  };
}

export async function verifyPassword(
  password: string,
  expectedHash: string,
  salt: string,
  iterations: number,
) {
  if (
    !Number.isInteger(iterations) ||
    iterations < 1 ||
    Array.from(password).length > PASSWORD_MAX_LENGTH
  ) {
    return false;
  }
  try {
    const actual = await derivePasswordHash(
      password,
      hexToBytes(salt),
      iterations,
    );
    return constantTimeEqual(actual, hexToBytes(expectedHash));
  } catch {
    return false;
  }
}

export async function hashSessionToken(token: string) {
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(token));
  return bytesToHex(new Uint8Array(digest));
}

export async function createSessionToken() {
  const token = randomHex(SESSION_TOKEN_BYTES);
  return {
    token,
    tokenHash: await hashSessionToken(token),
  };
}
