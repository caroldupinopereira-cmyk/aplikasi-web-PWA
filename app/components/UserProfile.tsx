"use client";

import { useCallback, useEffect, useState } from "react";
import { useLanguage } from "./LanguageProvider";
import Icon from "./Icon";

type Profile = {
  email: string;
  displayName: string;
  role: string;
  username: string;
};

type Session = {
  id: number;
  userAgent: string;
  expiresAt: string;
  lastSeenAt: string;
  createdAt: string;
};

function deviceName(userAgent: string) {
  const browser = userAgent.includes("Edg/")
    ? "Microsoft Edge"
    : userAgent.includes("Chrome/")
      ? "Google Chrome"
      : userAgent.includes("Firefox/")
        ? "Mozilla Firefox"
        : userAgent.includes("Safari/")
          ? "Safari"
          : "Browser";
  const system = userAgent.includes("Windows")
    ? "Windows"
    : userAgent.includes("Android")
      ? "Android"
      : userAgent.includes("iPhone") || userAgent.includes("iPad")
        ? "iOS"
        : userAgent.includes("Mac OS")
          ? "macOS"
          : "Perangkat";
  return `${browser} · ${system}`;
}

export default function UserProfile() {
  const { locale, t } = useLanguage();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [profileResponse, sessionsResponse] = await Promise.all([
        fetch("/api/auth/session"),
        fetch("/api/auth/sessions"),
      ]);
      if (profileResponse.status === 401 || sessionsResponse.status === 401) {
        window.location.assign("/login");
        return;
      }
      const profileData = await profileResponse.json();
      const sessionData = await sessionsResponse.json();
      if (!profileResponse.ok || !sessionsResponse.ok) {
        throw new Error(
          profileData.error ||
            sessionData.error ||
            "Profil belum dapat dimuat.",
        );
      }
      setProfile(profileData.user);
      setSessions(sessionData.sessions);
      setCurrentSessionId(sessionData.currentSessionId);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Profil belum dapat dimuat.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  async function revoke(action: "revoke-one" | "revoke-others", sessionId?: number) {
    const response = await fetch("/api/auth/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, sessionId }),
    });
    const result = await response.json();
    if (!response.ok) {
      setError(result.error || "Session belum dapat dihentikan.");
      return;
    }
    await load();
  }

  return (
    <div className="page profile-page">
      <div className="page-heading">
        <div>
          <p className="eyebrow">{t("AKUN SAYA")}</p>
          <h1>{t("Profil & Session")}</h1>
          <p>{t("Periksa identitas akun dan perangkat yang masih memiliki akses.")}</p>
        </div>
        <a className="primary-button profile-password-link" href="/change-password">
          {t("Ganti Kata Sandi")}
        </a>
      </div>

      {error && <div className="dashboard-error" role="alert"><div><strong>{t("Profil belum dapat dimuat")}</strong><p>{t(error)}</p></div><button onClick={load}>{t("Coba Lagi")}</button></div>}

      <section className="profile-grid">
        <article className="panel profile-card">
          <div className="profile-avatar">
            {profile?.displayName
              .split(/\s+/)
              .slice(0, 2)
              .map((part) => part[0])
              .join("")
              .toUpperCase() || "PA"}
          </div>
          <h2>{profile?.displayName ?? (loading ? t("Memuat...") : t("Pengguna"))}</h2>
          <span>{t(profile?.role ?? "—")}</span>
          <dl>
            <div><dt>Username</dt><dd>{profile?.username ?? "—"}</dd></div>
            <div><dt>Email</dt><dd>{profile?.email ?? "—"}</dd></div>
          </dl>
        </article>

        <article className="panel session-panel">
          <div className="panel-title">
            <div><h2>{t("Session Aktif")}</h2><p>{t("Perangkat yang masih dapat membuka akun Anda")}</p></div>
            {sessions.some((session) => session.id !== currentSessionId) && (
              <button onClick={() => void revoke("revoke-others")}>{t("Hentikan Semua Lainnya")}</button>
            )}
          </div>
          <div className="session-list">
            {loading ? <p className="empty">{t("Memuat session...")}</p> : sessions.length === 0 ? <p className="empty">{t("Tidak ada session aktif.")}</p> : sessions.map((session) => (
              <div key={session.id} className="session-item">
                <span className="session-device"><Icon name="device" /></span>
                <div>
                  <strong>{deviceName(session.userAgent)}</strong>
                  <p>{t("Aktif terakhir")}: {new Date(session.lastSeenAt).toLocaleString(locale === "pt" ? "pt-PT" : locale === "tet" ? "tet-TL" : "id-ID")}</p>
                  <small>{t("Berakhir")}: {new Date(session.expiresAt).toLocaleString(locale === "pt" ? "pt-PT" : locale === "tet" ? "tet-TL" : "id-ID")}</small>
                </div>
                {session.id === currentSessionId
                  ? <em>{t("Perangkat ini")}</em>
                  : <button onClick={() => void revoke("revoke-one", session.id)}>{t("Hentikan")}</button>}
              </div>
            ))}
          </div>
        </article>
      </section>
    </div>
  );
}
