export const OFFICE_EVENT_TYPES = ["Rapat", "Kegiatan", "Kunjungan", "Pelayanan", "Tenggat", "Lainnya"] as const;
export const OFFICE_EVENT_STATUSES = ["Dijadwalkan", "Berlangsung", "Selesai", "Dibatalkan"] as const;
export const OFFICE_EVENT_PRIORITIES = ["Rendah", "Normal", "Penting", "Mendesak"] as const;

export function isOfficeEventOverdue(eventDate: string, status: string, today = new Date().toISOString().slice(0, 10)) {
  return eventDate < today && !["Selesai", "Dibatalkan"].includes(status);
}
