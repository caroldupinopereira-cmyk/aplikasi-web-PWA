"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useLanguage } from "../components/LanguageProvider";

export default function SetupForm() {
  const { t } = useLanguage();
  const [form, setForm] = useState({
    setupCode: "",
    displayName: "",
    email: "",
    username: "",
    password: "",
    confirmation: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function update(field: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (form.password !== form.confirmation) {
      setError("Konfirmasi kata sandi belum sama.");
      return;
    }
    setLoading(true);
    try {
      const response = await fetch("/api/auth/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          setupCode: form.setupCode,
          displayName: form.displayName,
          email: form.email,
          username: form.username,
          password: form.password,
        }),
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(result.error || "Setup belum berhasil.");
      }
      window.location.assign("/login?setup=success");
    } catch (setupError) {
      setError(
        setupError instanceof Error
          ? setupError.message
          : "Setup belum berhasil.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="auth-form" onSubmit={submit}>
      {error && <p className="auth-message error" role="alert">{t(error)}</p>}
      <label>
        <span>{t("Kode setup dari .dev.vars")}</span>
        <input
          autoComplete="off"
          type="password"
          value={form.setupCode}
          onChange={(event) => update("setupCode", event.target.value)}
          required
        />
      </label>
      <div className="auth-two-columns">
        <label>
          <span>{t("Nama lengkap")}</span>
          <input
            autoComplete="name"
            value={form.displayName}
            onChange={(event) => update("displayName", event.target.value)}
            required
          />
        </label>
        <label>
          <span>Username</span>
          <input
            autoComplete="username"
            pattern="[a-z0-9._-]{3,40}"
            value={form.username}
            onChange={(event) => update("username", event.target.value.toLowerCase())}
            required
          />
        </label>
      </div>
      <label>
        <span>{t("Email staf")}</span>
        <input
          autoComplete="email"
          type="email"
          value={form.email}
          onChange={(event) => update("email", event.target.value)}
          required
        />
      </label>
      <div className="auth-two-columns">
        <label>
          <span>{t("Kata sandi")}</span>
          <input
            autoComplete="new-password"
            minLength={12}
            type="password"
            value={form.password}
            onChange={(event) => update("password", event.target.value)}
            required
          />
        </label>
        <label>
          <span>{t("Ulangi kata sandi")}</span>
          <input
            autoComplete="new-password"
            minLength={12}
            type="password"
            value={form.confirmation}
            onChange={(event) => update("confirmation", event.target.value)}
            required
          />
        </label>
      </div>
      <small className="auth-rule">
        {t("Minimal 12 karakter, berisi huruf besar, huruf kecil, angka, dan simbol.")}
      </small>
      <button className="auth-submit" disabled={loading} type="submit">
        {t(loading ? "Membuat akun..." : "Buat Administrator")}
      </button>
      <p className="auth-help">{t("Sudah punya akun?")} <Link href="/login">{t("Kembali ke login")}</Link></p>
    </form>
  );
}
