export const COMPLAINT_CATEGORIES = ["Pelayanan Publik", "Infrastruktur", "Lingkungan", "Keamanan", "Sosial", "Aspirasi", "Lainnya"] as const;
export const COMPLAINT_STATUSES = ["Baru", "Diproses", "Menunggu", "Selesai", "Ditutup"] as const;
export const COMPLAINT_PRIORITIES = ["Rendah", "Normal", "Penting", "Mendesak"] as const;

export function isComplaintOverdue(dueDate: string, status: string, today = new Date().toISOString().slice(0, 10)) {
  return dueDate < today && !["Selesai", "Ditutup"].includes(status);
}

export function canReadAllComplaints(role: string | null | undefined) {
  return role === "Administrator" || role === "Pimpinan";
}
