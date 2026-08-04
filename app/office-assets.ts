export const ASSET_CATEGORIES = ["Elektronik", "Perabot", "Kendaraan", "Peralatan Kantor", "Peralatan Kegiatan", "Lainnya"] as const;
export const ASSET_CONDITIONS = ["Baik", "Perlu Perbaikan", "Rusak"] as const;
export const ASSET_STATUSES = ["Aktif", "Dipinjam", "Hilang", "Dihapuskan"] as const;

export function isAssetInspectionOverdue(nextDate: string, status: string, today = new Date().toISOString().slice(0, 10)) {
  return Boolean(nextDate) && nextDate < today && !["Hilang", "Dihapuskan"].includes(status);
}
