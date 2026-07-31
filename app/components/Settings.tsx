"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { useToast, ToastContainer } from "./Toast";

type Staff = { id: number; email: string; displayName: string; role: string; active: boolean };
type Log = { id: number; actorName: string; action: string; module: string; details: string; createdAt: string };
type Current = { email: string; displayName: string; role: string };

const permissions = [
  ["Administrator", "Semua modul", "Tambah, ubah, verifikasi", "Kelola akun & riwayat"],
  ["Pimpinan", "Semua modul", "Lihat dan verifikasi", "Tidak dapat kelola akun"],
  ["Staf", "Modul operasional", "Tambah dan ubah data", "Tidak dapat kelola akun"],
  ["Viewer", "Semua modul", "Hanya melihat", "Tidak dapat mengubah data"],
];

export default function Settings() {
  const [staff, setStaff] = useState<Staff[]>([]);
  const [logs, setLogs] = useState<Log[]>([]);
  const [current, setCurrent] = useState<Current | null>(null);
  const { toasts, addToast, dismiss } = useToast();
  const [showForm, setShowForm] = useState(false);

  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/staff");
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setStaff(data.users); setLogs(data.logs); setCurrent(data.currentUser);
    } catch (error) { addToast(error instanceof Error ? error.message : "Gagal memuat pengaturan.", "error"); }
  }, [addToast]);

  useEffect(() => { void load(); }, [load]);

  async function addStaff(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/staff", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(Object.fromEntries(form)),
    });
    const data = await response.json();
    if (!response.ok) return addToast(data.error, "error");
    setShowForm(false); addToast("Akun staf berhasil disimpan.", "success"); await load();
  }

  async function update(user: Staff, changes: Partial<Staff>) {
    const response = await fetch("/api/staff", {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: user.id, role: changes.role ?? user.role, active: changes.active ?? user.active }),
    });
    const data = await response.json();
    if (!response.ok) return addToast(data.error, "error");
    addToast("Hak akses berhasil diperbarui.", "success"); await load();
  }

  return <div className="page settings-page">
    <div className="page-heading">
      <div><p className="eyebrow">KEAMANAN SISTEM</p><h1>Pengaturan & Akses Staf</h1><p>Atur siapa yang dapat melihat, mencatat, dan memverifikasi data kantor.</p></div>
      {current?.role === "Administrator" && <button className="primary-button settings-add" onClick={() => setShowForm(true)}>＋ Tambah Staf</button>}
    </div>

    <section className="security-summary">
      <article><span>◉</span><div><strong>{current?.displayName ?? "Pengguna"}</strong><small>Akun aktif saat ini</small></div><em>{current?.role ?? "—"}</em></article>
      <article><span>♙</span><div><strong>{staff.filter((item) => item.active).length} akun aktif</strong><small>Staf yang terdaftar</small></div><em>Aman</em></article>
      <article><span>▤</span><div><strong>{logs.length} aktivitas</strong><small>Riwayat terbaru sistem</small></div><em>Tercatat</em></article>
    </section>

    <section className="panel settings-panel">
      <div className="panel-title"><div><h2>Daftar Pengguna</h2><p>Akun hanya dapat memakai sistem setelah diberi akses ke situs dan didaftarkan di sini.</p></div></div>
      <div className="table-wrap"><table className="mail-table settings-table"><thead><tr><th>Nama</th><th>Email</th><th>Peran</th><th>Status</th></tr></thead>
        <tbody>{staff.map((user) => <tr key={user.id}>
          <td><strong>{user.displayName}</strong></td><td>{user.email}</td>
          <td>{current?.role === "Administrator" ? <select className="role-select" value={user.role} onChange={(e) => void update(user, { role: e.target.value })}>{permissions.map(([role]) => <option key={role}>{role}</option>)}</select> : <span className="category-pill">{user.role}</span>}</td>
          <td>{current?.role === "Administrator" ? <button className={user.active ? "account-status active" : "account-status"} onClick={() => void update(user, { active: !user.active })}>{user.active ? "Aktif" : "Nonaktif"}</button> : user.active ? "Aktif" : "Nonaktif"}</td>
        </tr>)}</tbody>
      </table></div>
    </section>

    <section className="settings-grid">
      <article className="panel"><div className="panel-title"><div><h2>Matriks Hak Akses</h2><p>Pembagian tanggung jawab untuk setiap peran</p></div></div>
        <div className="permission-list">{permissions.map(([role, scope, action, admin]) => <div key={role}><strong>{role}</strong><span>{scope}</span><span>{action}</span><small>{admin}</small></div>)}</div>
      </article>
      <article className="panel"><div className="panel-title"><div><h2>Riwayat Aktivitas</h2><p>Perubahan akun dan keamanan terbaru</p></div></div>
        <div className="audit-list">{logs.length ? logs.map((log) => <div key={log.id}><span className="audit-dot">✓</span><div><strong>{log.action}</strong><p>{log.actorName} • {log.module}</p><small>{log.details}</small></div><time>{new Date(log.createdAt).toLocaleDateString("id-ID")}</time></div>) : <p className="empty">Belum ada aktivitas.</p>}</div>
      </article>
    </section>

    <div className="privacy-note"><span>!</span><p><strong>Penting:</strong> Menambahkan akun di halaman ini belum otomatis membuka situs. Alamat email staf juga harus ditambahkan ke akses situs oleh pemilik.</p></div>

    {showForm && <div className="modal-layer"><div className="mail-modal"><div className="modal-heading"><div><p className="eyebrow">AKUN BARU</p><h2>Tambah Staf</h2></div><button onClick={() => setShowForm(false)}>×</button></div>
      <form onSubmit={addStaff}><div className="form-grid"><label>Nama lengkap<input name="displayName" required /></label><label>Email ChatGPT<input name="email" type="email" required /></label><label className="wide">Peran<select name="role" defaultValue="Staf">{permissions.map(([role]) => <option key={role}>{role}</option>)}</select></label></div><div className="form-actions"><button type="button" onClick={() => setShowForm(false)}>Batal</button><button className="save-button">Simpan Akun</button></div></form>
    </div></div>}
    <ToastContainer toasts={toasts} dismiss={dismiss} />
  </div>;
}
