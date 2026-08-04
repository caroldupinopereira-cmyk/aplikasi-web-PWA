export function canSeeAllOfficeTasks(role: string | null | undefined) {
  return role === "Administrator" || role === "Pimpinan" || role === "Viewer";
}

export function isOfficeTaskOverdue(
  dueDate: string,
  status: string,
  today = new Date().toISOString().slice(0, 10),
) {
  return status !== "Selesai" && dueDate < today;
}
