export const VISIT_STATUSES = ["Di Kantor", "Selesai", "Dibatalkan"] as const;

export function validVisitTimes(checkIn: string, checkOut: string) {
  if (!/^\d{2}:\d{2}$/.test(checkIn)) return false;
  if (!checkOut) return true;
  return /^\d{2}:\d{2}$/.test(checkOut) && checkOut >= checkIn;
}
