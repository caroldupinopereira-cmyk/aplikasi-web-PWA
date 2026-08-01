export type DashboardRole =
  | "Administrator"
  | "Pimpinan"
  | "Staf"
  | "Viewer";

const writeRoles: DashboardRole[] = ["Administrator", "Pimpinan", "Staf"];
const financeRoles: DashboardRole[] = ["Administrator", "Pimpinan"];

export function canUseDashboardQuickAction(
  role: string | undefined,
  module: string,
) {
  if (!role || !writeRoles.includes(role as DashboardRole)) return false;
  if (module === "Anggaran") {
    return financeRoles.includes(role as DashboardRole);
  }
  return true;
}

export function dashboardRoleMessage(role: string | undefined) {
  if (role === "Administrator") {
    return "Akses penuh untuk data, keuangan, staf, dan keamanan.";
  }
  if (role === "Pimpinan") {
    return "Dapat memeriksa seluruh data, persetujuan, dan keuangan.";
  }
  if (role === "Staf") {
    return "Dapat mengelola administrasi operasional; keuangan bersifat baca-saja.";
  }
  if (role === "Viewer") {
    return "Akses baca-saja; perubahan data tidak diizinkan.";
  }
  return "Hak akses sedang dimuat.";
}
