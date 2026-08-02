import type { Metadata } from "next";
import AuthShell from "../components/AuthShell";
import SetupForm from "./SetupForm";

export const metadata: Metadata = {
  title: "Setup Administrator",
  description: "Membuat administrator pertama.",
};

export default function SetupPage() {
  return (
    <AuthShell
      eyebrow="SETUP PERTAMA"
      title="Buat administrator"
      description="Halaman ini hanya digunakan satu kali untuk membuat akun administrator pertama."
      footer="Gunakan data contoh saat pengujian. Simpan kode setup hanya di file lokal .dev.vars."
    >
      <SetupForm />
    </AuthShell>
  );
}
