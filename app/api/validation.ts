export function parsePositiveId(value: unknown): number | null {
  const id = typeof value === "number" ? value : Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

export function requiredText(payload: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    if (typeof payload[key] !== "string" || !payload[key].trim()) {
      return `Kolom ${key} wajib diisi.`;
    }
  }
  return null;
}

export function isIsoDate(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value;
}

export function validDateFields(payload: Record<string, unknown>, keys: string[]) {
  const invalid = keys.find((key) => payload[key] !== undefined && !isIsoDate(payload[key]));
  return invalid ? `Tanggal pada kolom ${invalid} tidak valid.` : null;
}

export function cleanText(value: unknown, maxLength = 500): string {
  return String(value ?? "").trim().slice(0, maxLength);
}

export function serverError(error: unknown) {
  console.error(error);
  return Response.json({ error: "Terjadi kesalahan pada server." }, { status: 500 });
}
