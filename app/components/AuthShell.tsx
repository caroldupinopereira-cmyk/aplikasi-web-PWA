"use client";

import type { ReactNode } from "react";
import LanguageSwitcher from "./LanguageSwitcher";
import { useLanguage } from "./LanguageProvider";

type AuthShellProps = {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
  footer: string;
};

export default function AuthShell({
  eyebrow,
  title,
  description,
  children,
  footer,
}: AuthShellProps) {
  const { t } = useLanguage();
  return (
    <main className="portal-shell">
      <section className="portal-intro">
        <div className="portal-top">
          <div className="portal-brand">
            <div
              className="portal-logo"
              role="img"
              aria-label="Logo Posto Administrativo"
            />
            <div>
              <strong>Sistema Administrasaun</strong>
              <span>Postu Administrativo Uatu-Carbau</span>
            </div>
          </div>
          <LanguageSwitcher />
        </div>
        <div className="portal-copy">
          <p className="eyebrow">{t("PORTAL INTERNAL")}</p>
          <h1>{t("Administrasi kantor dalam satu tempat yang aman.")}</h1>
          <p>
            {t("Kelola surat, penduduk, kegiatan, keuangan, dan arsip sesuai tanggung jawab masing-masing staf.")}
          </p>
        </div>
        <div className="portal-security">
          <span>✓ {t("Akses hanya untuk staf yang terdaftar")}</span>
          <span>✓ {t("Kata sandi tidak disimpan sebagai teks biasa")}</span>
          <span>✓ {t("Setiap tindakan mengikuti peran pengguna")}</span>
        </div>
      </section>

      <section className="portal-access">
        <div className="portal-access-card">
          <p className="eyebrow">{t(eyebrow)}</p>
          <h2>{t(title)}</h2>
          <p>{t(description)}</p>
          {children}
        </div>
        <small>{t(footer)}</small>
      </section>
    </main>
  );
}
