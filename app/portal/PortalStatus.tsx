"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type AccessState = {
  status: "loading" | "active" | "inactive" | "unregistered" | "error";
  message?: string;
  user?: {
    email: string;
    displayName: string;
    role: string;
  };
};

export default function PortalStatus() {
  const [access, setAccess] = useState<AccessState>({ status: "loading" });

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      fetch("/api/access-status", { signal: controller.signal })
        .then(async (response) => {
          const result = await response.json();
          if (!response.ok) {
            setAccess({
              status:
                result.status === "unregistered" ? "unregistered" : "error",
              message: result.message,
            });
            return;
          }
          setAccess(result as AccessState);
        })
        .catch((error: unknown) => {
          if (error instanceof DOMException && error.name === "AbortError") return;
          setAccess({
            status: "error",
            message: "Portal tidak dapat menghubungi layanan akses.",
          });
        });
    }, 0);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, []);

  if (access.status === "loading") {
    return <div className="portal-status loading">Memeriksa akun staf...</div>;
  }

  if (access.status === "active" && access.user) {
    return (
      <div className="portal-status active">
        <span className="portal-status-icon">✓</span>
        <p>Akun aktif</p>
        <h2>{access.user.displayName}</h2>
        <span>{access.user.email}</span>
        <strong>{access.user.role}</strong>
        <Link className="portal-primary" href="/">Buka Dashboard</Link>
        <a className="portal-signout" href="/cdn-cgi/access/logout">Keluar dari sesi</a>
      </div>
    );
  }

  return (
    <div className={`portal-status ${access.status}`}>
      <span className="portal-status-icon">!</span>
      <h2>
        {access.status === "inactive"
          ? "Akun dinonaktifkan"
          : access.status === "unregistered"
            ? "Akun belum terdaftar"
            : "Pemeriksaan akses gagal"}
      </h2>
      <p>{access.message ?? "Hubungi Administrator untuk memeriksa akses Anda."}</p>
      <a className="portal-signout" href="/cdn-cgi/access/logout">Gunakan email lain</a>
    </div>
  );
}
