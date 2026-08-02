"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { FormEvent, useState } from "react";
import { useLanguage } from "../components/LanguageProvider";

export default function LoginForm() {
  const { t } = useLanguage();
  const searchParams = useSearchParams();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const setupComplete = searchParams.get("setup") === "success";

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier, password }),
      });
      const result = (await response.json()) as {
        error?: string;
        mustChangePassword?: boolean;
      };
      if (!response.ok) {
        throw new Error(result.error || "Login belum berhasil.");
      }
      window.location.assign(
        result.mustChangePassword ? "/change-password" : "/",
      );
    } catch (loginError) {
      setError(
        loginError instanceof Error
          ? loginError.message
          : "Login belum berhasil.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="auth-form" onSubmit={submit}>
      {setupComplete && (
        <p className="auth-message success" role="status">
          {t("Administrator berhasil dibuat. Silakan login.")}
        </p>
      )}
      {error && (
        <p className="auth-message error" role="alert">
          {t(error)}
        </p>
      )}
      <label>
        <span>{t("Username atau email")}</span>
        <input
          autoComplete="username"
          value={identifier}
          onChange={(event) => setIdentifier(event.target.value)}
          placeholder={t("contoh: administrador")}
          required
        />
      </label>
      <label>
        <span>{t("Kata sandi")}</span>
        <div className="auth-password">
          <input
            autoComplete="current-password"
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
          <button
            type="button"
            onClick={() => setShowPassword((shown) => !shown)}
          >
            {t(showPassword ? "Sembunyikan" : "Lihat")}
          </button>
        </div>
      </label>
      <button className="auth-submit" disabled={loading} type="submit">
        {t(loading ? "Memeriksa..." : "Masuk ke Dashboard")}
      </button>
      <p className="auth-help">
        {t("Belum ada administrator?")} <Link href="/setup">{t("Lakukan setup awal")}</Link>
      </p>
    </form>
  );
}
