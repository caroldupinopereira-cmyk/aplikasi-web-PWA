export const notificationModulesForRole = (
  role: string | null | undefined,
) => {
  if (role === "Administrator" || role === "Pimpinan") {
    return ["Surat Masuk", "Surat Keluar", "Keuangan"];
  }
  if (role === "Staf") return ["Surat Masuk"];
  return [];
};

function timestamp(value: string | null | undefined) {
  if (!value) return Number.NaN;
  const normalized = value.includes("T") ? value : `${value.replace(" ", "T")}Z`;
  return new Date(normalized).getTime();
}

export function hasUnreadNotifications(
  taskCount: number,
  lastSeenAt: string | null | undefined,
  latestRelevantActivityAt: string | null | undefined,
) {
  if (taskCount <= 0) return false;
  if (!lastSeenAt) return true;
  const latest = timestamp(latestRelevantActivityAt);
  const lastSeen = timestamp(lastSeenAt);
  return Number.isFinite(latest) && Number.isFinite(lastSeen) && latest > lastSeen;
}
