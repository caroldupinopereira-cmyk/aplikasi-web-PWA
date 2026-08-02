export const DOCUMENT_NUMBER_TYPES = {
  incoming: { prefix: "SM", label: "Surat Masuk" },
  outgoing: { prefix: "SK", label: "Surat Keluar" },
  report: { prefix: "LPK", label: "Laporan Kegiatan" },
} as const;

export type DocumentNumberType = keyof typeof DOCUMENT_NUMBER_TYPES;

export function formatDocumentNumber(
  type: DocumentNumberType,
  year: number,
  month: number,
  sequence: number,
) {
  if (
    !Number.isInteger(year) ||
    !Number.isInteger(month) ||
    month < 1 ||
    month > 12 ||
    !Number.isInteger(sequence) ||
    sequence < 1
  ) {
    throw new Error("Data urutan nomor dokumen tidak valid.");
  }
  return `${DOCUMENT_NUMBER_TYPES[type].prefix}-${year}-${String(month).padStart(2, "0")}-${String(sequence).padStart(4, "0")}`;
}
