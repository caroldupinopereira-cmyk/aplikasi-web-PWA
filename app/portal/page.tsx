import type { Metadata } from "next";
import PortalStatus from "./PortalStatus";

export const metadata: Metadata = {
  title: "Portal Akses Staf",
  description: "Portal masuk staf Sistema Administrasaun Postu.",
};

export default function PortalPage() {
  return (
    <main className="portal-shell">
      <section className="portal-intro">
        <div className="portal-brand">
          <div className="portal-logo" role="img" aria-label="Logo Posto Administrativo" />
          <div>
            <strong>Sistema Administrasaun</strong>
            <span>Postu Administrativo</span>
          </div>
        </div>
        <div className="portal-copy">
          <p className="eyebrow">PORTAL INTERNAL</p>
          <h1>Administrasi kantor dalam satu tempat yang aman.</h1>
          <p>
            Kelola surat, penduduk, kegiatan, keuangan, dan arsip sesuai
            tanggung jawab masing-masing staf.
          </p>
        </div>
        <div className="portal-security">
          <span>✓ Akses dibatasi untuk empat staf terdaftar</span>
          <span>✓ Masuk menggunakan kode sekali pakai melalui email</span>
          <span>✓ Setiap tindakan mengikuti peran pengguna</span>
        </div>
      </section>

      <section className="portal-access">
        <div className="portal-access-card">
          <p className="eyebrow">AKSES STAF</p>
          <h2>Selamat datang</h2>
          <p>
            Cloudflare Access memverifikasi email sebelum halaman ini dibuka.
            Sistem kemudian memeriksa status dan peran akun staf.
          </p>
          <PortalStatus />
        </div>
        <small>
          Jangan membagikan kode masuk melalui telepon, pesan, atau email
          kepada orang lain.
        </small>
      </section>
    </main>
  );
}
