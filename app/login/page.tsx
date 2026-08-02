import type { Metadata } from "next";
import AuthShell from "../components/AuthShell";
import LoginForm from "./LoginForm";

export const metadata: Metadata = {
  title: "Login Staf",
  description: "Masuk ke Sistema Administrasaun Postu.",
};

export default function LoginPage() {
  return (
    <AuthShell
      eyebrow="AKSES STAF"
      title="Selamat datang"
      description="Masuk menggunakan username atau email dan kata sandi akun staf."
      footer="Jangan membagikan username, kata sandi, atau perangkat yang sedang login kepada orang lain."
    >
      <LoginForm />
    </AuthShell>
  );
}
