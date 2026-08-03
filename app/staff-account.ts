export type DeletableStaffAccount = {
  email: string;
  displayName: string;
};

export function staffAccountDeletionError(
  administratorEmail: string,
  target: DeletableStaffAccount,
  confirmationName: string,
) {
  if (target.email.toLowerCase() === administratorEmail.toLowerCase()) {
    return "Administrator tidak dapat menghapus akunnya sendiri.";
  }
  if (confirmationName.trim() !== target.displayName) {
    return "Nama konfirmasi tidak sesuai.";
  }
  return null;
}
