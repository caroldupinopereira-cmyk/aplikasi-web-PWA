import type { Metadata } from "next";
import AuthShell from "../components/AuthShell";
import ChangePasswordForm from "./ChangePasswordForm";

export const metadata: Metadata = {
  title: "Ganti Kata Sandi",
};

export default function ChangePasswordPage() {
  return (
    <AuthShell
      eyebrow="KEAMANAN AKUN"
      title="Ganti kata sandi"
      description="Gunakan kata sandi baru yang berbeda dan sulit ditebak."
      footer="Setelah diperbarui, sesi akun yang terbuka pada perangkat lain akan dihentikan."
    >
      <ChangePasswordForm />
    </AuthShell>
  );
}
