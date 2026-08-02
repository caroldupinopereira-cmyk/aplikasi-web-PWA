"use client";

import { FormEvent, useState } from "react";
import { useLanguage } from "../components/LanguageProvider";

export default function ChangePasswordForm() {
  const { t } = useLanguage();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (newPassword !== confirmation) {
      setError("Konfirmasi kata sandi baru belum sama.");
      return;
    }
    setLoading(true);
    try {
      const response = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const result = (await response.json()) as { error?: string };
      if (response.status === 401) {
        window.location.assign("/login");
        return;
      }
      if (!response.ok) {
        throw new Error(result.error || "Kata sandi belum dapat diperbarui.");
      }
      window.location.assign("/");
    } catch (changeError) {
      setError(
        changeError instanceof Error
          ? changeError.message
          : "Kata sandi belum dapat diperbarui.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.assign("/login");
  }

  return (
    <form className="auth-form" onSubmit={submit}>
      {error && <p className="auth-message error" role="alert">{t(error)}</p>}
      <label>
        <span>{t("Kata sandi saat ini")}</span>
        <input
          autoComplete="current-password"
          type="password"
          value={currentPassword}
          onChange={(event) => setCurrentPassword(event.target.value)}
          required
        />
      </label>
      <label>
        <span>{t("Kata sandi baru")}</span>
        <input
          autoComplete="new-password"
          minLength={12}
          type="password"
          value={newPassword}
          onChange={(event) => setNewPassword(event.target.value)}
          required
        />
      </label>
      <label>
        <span>{t("Ulangi kata sandi baru")}</span>
        <input
          autoComplete="new-password"
          minLength={12}
          type="password"
          value={confirmation}
          onChange={(event) => setConfirmation(event.target.value)}
          required
        />
      </label>
      <small className="auth-rule">
        {t("Minimal 12 karakter, berisi huruf besar, huruf kecil, angka, dan simbol.")}
      </small>
      <button className="auth-submit" disabled={loading} type="submit">
        {t(loading ? "Menyimpan..." : "Simpan Kata Sandi Baru")}
      </button>
      <button className="auth-secondary" type="button" onClick={logout}>
        {t("Keluar dari akun")}
      </button>
    </form>
  );
}
