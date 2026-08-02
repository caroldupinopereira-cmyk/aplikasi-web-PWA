"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { useToast, ToastContainer } from "./Toast";
import { useLanguage } from "./LanguageProvider";
import Icon from "./Icon";

type Staff = { id: number; email: string; displayName: string; role: string; active: boolean };
type Log = { id: number; actorName: string; action: string; module: string; details: string; changedFields: string; createdAt: string };
type Current = { email: string; displayName: string; role: string };

const permissions = [
  ["Administrator", "Semua modul", "Tambah, ubah, verifikasi", "Kelola akun & riwayat"],
  ["Pimpinan", "Semua modul", "Lihat dan verifikasi", "Tidak dapat kelola akun"],
  ["Staf", "Modul operasional", "Tambah dan ubah data", "Tidak dapat kelola akun"],
  ["Viewer", "Semua modul", "Hanya melihat", "Tidak dapat mengubah data"],
];

export default function Settings() {
  const { locale, t } = useLanguage();
  const [staff, setStaff] = useState<Staff[]>([]);
  const [logs, setLogs] = useState<Log[]>([]);
  const [current, setCurrent] = useState<Current | null>(null);
  const { toasts, addToast, dismiss } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [resetTarget, setResetTarget] = useState<Staff | null>(null);
  const [resetting, setResetting] = useState(false);

  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/staff");
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setStaff(data.users); setLogs(data.logs); setCurrent(data.currentUser);
    } catch (error) { addToast(t(error instanceof Error ? error.message : "Gagal memuat pengaturan."), "error"); }
  }, [addToast, t]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  async function addStaff(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/staff", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(Object.fromEntries(form)),
    });
    const data = await response.json();
    if (!response.ok) return addToast(t(data.error), "error");
    setShowForm(false); addToast(t("Akun staf berhasil disimpan."), "success"); await load();
  }

  async function update(user: Staff, changes: Partial<Staff>) {
    const response = await fetch("/api/staff", {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: user.id, role: changes.role ?? user.role, active: changes.active ?? user.active }),
    });
    const data = await response.json();
    if (!response.ok) return addToast(t(data.error), "error");
    addToast(t("Hak akses berhasil diperbarui."), "success"); await load();
  }

  async function resetPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!resetTarget) return;
    const form = new FormData(event.currentTarget);
    const temporaryPassword = String(form.get("temporaryPassword") ?? "");
    const confirmation = String(form.get("confirmation") ?? "");
    if (temporaryPassword !== confirmation) {
      addToast(t("Konfirmasi kata sandi belum sama."), "error");
      return;
    }
    setResetting(true);
    try {
      const response = await fetch("/api/staff/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          staffUserId: resetTarget.id,
          temporaryPassword,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        addToast(t(data.error || "Kata sandi belum dapat direset."), "error");
        return;
      }
      setResetTarget(null);
      addToast(
        t("Kata sandi sementara berhasil dibuat. Session lama sudah dihentikan."),
        "success",
      );
      await load();
    } catch {
      addToast(t("Koneksi gagal saat mereset kata sandi."), "error");
    } finally {
      setResetting(false);
    }
  }

  return <div className="page settings-page">
    <div className="page-heading">
      <div><p className="eyebrow">{t("KEAMANAN SISTEM")}</p><h1>{t("Pengaturan & Akses Staf")}</h1><p>{t("Atur siapa yang dapat melihat, mencatat, dan memverifikasi data kantor.")}</p></div>
      {current?.role === "Administrator" && <button className="primary-button settings-add" onClick={() => setShowForm(true)}><Icon name="plus" /> {t("Tambah Staf")}</button>}
    </div>

    <section className="security-summary">
      <article><span><Icon name="shield" /></span><div><strong>{current?.displayName ?? t("Pengguna")}</strong><small>{t("Akun aktif saat ini")}</small></div><em>{t(current?.role ?? "—")}</em></article>
      <article><span><Icon name="users" /></span><div><strong>{staff.filter((item) => item.active).length} {t("akun aktif")}</strong><small>{t("Staf yang terdaftar")}</small></div><em>{t("Aman")}</em></article>
      <article><span><Icon name="activity" /></span><div><strong>{logs.length} {t("aktivitas")}</strong><small>{t("Riwayat terbaru sistem")}</small></div><em>{t("Tercatat")}</em></article>
    </section>

    <section className="panel settings-panel">
      <div className="panel-title"><div><h2>{t("Daftar Pengguna")}</h2><p>{t("Administrator mengatur akun, peran, dan status staf dari halaman ini.")}</p></div></div>
      <div className="table-wrap"><table className="mail-table settings-table"><thead><tr><th>{t("Nama")}</th><th>Email</th><th>{t("Peran")}</th><th>{t("Status")}</th><th>{t("Keamanan")}</th></tr></thead>
        <tbody>{staff.map((user) => <tr key={user.id}>
          <td><strong>{user.displayName}</strong></td><td>{user.email}</td>
          <td>{current?.role === "Administrator" ? <select className="role-select" value={user.role} onChange={(e) => void update(user, { role: e.target.value })}>{permissions.map(([role]) => <option key={role} value={role}>{t(role)}</option>)}</select> : <span className="category-pill">{t(user.role)}</span>}</td>
          <td>{current?.role === "Administrator" ? <button className={user.active ? "account-status active" : "account-status"} onClick={() => void update(user, { active: !user.active })}>{t(user.active ? "Aktif" : "Nonaktif")}</button> : t(user.active ? "Aktif" : "Nonaktif")}</td>
          <td>{current?.role === "Administrator" && user.email !== current.email
            ? <button className="reset-password-button" onClick={() => setResetTarget(user)}>{t("Reset kata sandi")}</button>
            : <span className="settings-self-label">{user.email === current?.email ? t("Akun saat ini") : "—"}</span>}
          </td>
        </tr>)}</tbody>
      </table></div>
    </section>

    <section className="settings-grid">
      <article className="panel"><div className="panel-title"><div><h2>{t("Matriks Hak Akses")}</h2><p>{t("Pembagian tanggung jawab untuk setiap peran")}</p></div></div>
        <div className="permission-list">{permissions.map(([role, scope, action, admin]) => <div key={role}><strong>{t(role)}</strong><span>{t(scope)}</span><span>{t(action)}</span><small>{t(admin)}</small></div>)}</div>
      </article>
      <article className="panel"><div className="panel-title"><div><h2>{t("Riwayat Aktivitas")}</h2><p>{t("Perubahan akun dan keamanan terbaru")}</p></div></div>
        <div className="audit-list">{logs.length ? logs.map((log) => <div key={log.id}><span className="audit-dot">✓</span><div><strong>{t(log.action)}</strong><p>{log.actorName} • {t(log.module)}</p><small>{log.details}</small>{log.changedFields !== "[]" && <small>{t("Bidang berubah")}: {JSON.parse(log.changedFields).join(", ")}</small>}</div><time>{new Date(log.createdAt).toLocaleDateString(locale === "pt" ? "pt-PT" : locale === "tet" ? "tet-TL" : "id-ID")}</time></div>) : <p className="empty">{t("Belum ada aktivitas.")}</p>}</div>
      </article>
    </section>

    <div className="privacy-note"><span>!</span><p><strong>{t("Penting")}:</strong> {t("Berikan kata sandi sementara langsung kepada staf. Sistem akan meminta staf menggantinya saat login pertama.")}</p></div>

    {showForm && <div className="modal-layer"><div className="mail-modal"><div className="modal-heading"><div><p className="eyebrow">{t("AKUN BARU")}</p><h2>{t("Tambah Staf")}</h2></div><button onClick={() => setShowForm(false)}>×</button></div>
      <form onSubmit={addStaff}><div className="form-grid"><label>{t("Nama lengkap")}<input name="displayName" required /></label><label>{t("Email staf")}<input name="email" type="email" required /></label><label>Username<input name="username" pattern="[a-z0-9._-]{3,40}" placeholder={t("contoh: staf.surat")} required /></label><label>{t("Kata sandi sementara")}<input name="temporaryPassword" type="password" minLength={12} autoComplete="new-password" required /><small className="field-help">{t("Minimal 12 karakter dengan huruf besar, kecil, angka, dan simbol.")}</small></label><label className="wide">{t("Peran")}<select name="role" defaultValue="Staf">{permissions.map(([role]) => <option key={role} value={role}>{t(role)}</option>)}</select></label></div><div className="form-actions"><button type="button" onClick={() => setShowForm(false)}>{t("Batal")}</button><button className="save-button">{t("Simpan Akun")}</button></div></form>
    </div></div>}
    {resetTarget && <div className="modal-layer"><div className="mail-modal"><div className="modal-heading"><div><p className="eyebrow">{t("KEAMANAN AKUN")}</p><h2>{t("Reset Kata Sandi")}</h2><p>{resetTarget.displayName} · {resetTarget.email}</p></div><button onClick={() => setResetTarget(null)} aria-label={t("Tutup")}>×</button></div>
      <form onSubmit={resetPassword}><div className="form-grid">
        <label className="wide">{t("Kata sandi sementara")}<input name="temporaryPassword" type="password" minLength={12} autoComplete="new-password" required /><small className="field-help">{t("Minimal 12 karakter dengan huruf besar, kecil, angka, dan simbol.")}</small></label>
        <label className="wide">{t("Ulangi kata sandi sementara")}<input name="confirmation" type="password" minLength={12} autoComplete="new-password" required /></label>
      </div><div className="privacy-note"><span>!</span><p>{t("Semua session akun ini akan dihentikan. Staf wajib mengganti kata sandi setelah login.")}</p></div><div className="form-actions"><button type="button" onClick={() => setResetTarget(null)}>{t("Batal")}</button><button className="save-button" disabled={resetting}>{t(resetting ? "Mereset..." : "Reset Kata Sandi")}</button></div></form>
    </div></div>}
    <ToastContainer toasts={toasts} dismiss={dismiss} />
  </div>;
}
