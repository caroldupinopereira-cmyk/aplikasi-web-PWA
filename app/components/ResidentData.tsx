"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

type Resident = {
  id: number;
  recordNumber: string;
  fullName: string;
  gender: string;
  birthDate: string;
  suco: string;
  aldeia: string;
  householdNumber: string;
  isHouseholdHead: boolean;
  maritalStatus: string;
  occupation: string;
};

const blankForm = {
  recordNumber: "", fullName: "", gender: "Laki-laki", birthDate: "2000-01-01",
  suco: "", aldeia: "", householdNumber: "", isHouseholdHead: false,
  maritalStatus: "Belum Menikah", occupation: "",
};

function ageFrom(date: string) {
  const birth = new Date(date);
  const now = new Date("2026-07-31");
  let age = now.getFullYear() - birth.getFullYear();
  if (now < new Date(now.getFullYear(), birth.getMonth(), birth.getDate())) age--;
  return age;
}

export default function ResidentData() {
  const [records, setRecords] = useState<Resident[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [query, setQuery] = useState("");
  const [sucoFilter, setSucoFilter] = useState("Semua");
  const [form, setForm] = useState(blankForm);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  async function loadRecords() {
    setLoading(true);
    try {
      const response = await fetch("/api/residents");
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Gagal memuat data.");
      setRecords(data.residents);
    } catch {
      setMessage("Database sedang disiapkan. Coba muat ulang beberapa saat lagi.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void loadRecords(); }, []);

  const sucos = useMemo(() => Array.from(new Set(records.map((r) => r.suco))).sort(), [records]);
  const filtered = useMemo(() => {
    const text = query.toLowerCase();
    return records.filter((r) =>
      [r.recordNumber, r.fullName, r.aldeia, r.householdNumber].some((v) => v.toLowerCase().includes(text)) &&
      (sucoFilter === "Semua" || r.suco === sucoFilter)
    );
  }, [records, query, sucoFilter]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    try {
      const response = await fetch("/api/residents", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Gagal menyimpan data.");
      setRecords((old) => [data.resident, ...old]);
      setForm(blankForm);
      setShowForm(false);
      setMessage("Data penduduk berhasil disimpan.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Gagal menyimpan data.");
    } finally {
      setSaving(false);
    }
  }

  const male = records.filter((r) => r.gender === "Laki-laki").length;
  const female = records.filter((r) => r.gender === "Perempuan").length;
  const households = new Set(records.map((r) => r.householdNumber)).size;

  return (
    <div className="page mail-page resident-page">
      <div className="page-heading">
        <div><p className="eyebrow">DATA WILAYAH</p><h1>Data Penduduk</h1><p>Kelola data penduduk berdasarkan suco, aldeia, dan keluarga.</p></div>
        <button className="primary-button mail-add" onClick={() => setShowForm(true)}><span>＋</span> Tambah Penduduk</button>
      </div>

      <section className="mail-stats resident-stats">
        <article><span>Total Penduduk</span><strong>{records.length}</strong><small>Data yang telah tercatat</small></article>
        <article><span>Laki-laki</span><strong>{male}</strong><small>{records.length ? Math.round(male / records.length * 100) : 0}% dari total</small></article>
        <article><span>Perempuan</span><strong>{female}</strong><small>{records.length ? Math.round(female / records.length * 100) : 0}% dari total</small></article>
        <article><span>Kepala Keluarga</span><strong>{households}</strong><small>Nomor keluarga unik</small></article>
      </section>

      <div className="privacy-note"><span>!</span><p><strong>Mode pembelajaran:</strong> gunakan data contoh. Jangan masukkan data pribadi penduduk asli sebelum aturan akses, persetujuan, dan backup disiapkan.</p></div>
      {message && <div className="mail-message">{message}<button onClick={() => setMessage("")}>×</button></div>}

      <section className="panel mail-table-panel">
        <div className="mail-toolbar">
          <label className="mail-search"><span>⌕</span><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Cari nama, nomor, aldeia, atau keluarga..." /></label>
          <label className="filter-label">Suco
            <select value={sucoFilter} onChange={(e) => setSucoFilter(e.target.value)}><option>Semua</option>{sucos.map((s) => <option key={s}>{s}</option>)}</select>
          </label>
          <button className="refresh-button" onClick={() => void loadRecords()}>↻ Muat Ulang</button>
        </div>
        <div className="table-wrap">
          <table className="mail-table resident-table">
            <thead><tr><th>No.</th><th>Penduduk</th><th>Jenis Kelamin/Umur</th><th>Wilayah</th><th>Keluarga</th><th>Pekerjaan</th></tr></thead>
            <tbody>
              {loading ? <tr><td colSpan={6} className="table-empty">Memuat data...</td></tr> :
                filtered.length === 0 ? <tr><td colSpan={6} className="table-empty">Belum ada data penduduk yang sesuai.</td></tr> :
                filtered.map((r, index) => <tr key={r.id}>
                  <td>{index + 1}</td>
                  <td><strong>{r.fullName}</strong><small>{r.recordNumber}</small></td>
                  <td><strong>{r.gender}</strong><small>{ageFrom(r.birthDate)} tahun • {r.maritalStatus}</small></td>
                  <td><strong>{r.suco}</strong><small>Aldeia {r.aldeia}</small></td>
                  <td><strong>{r.householdNumber}</strong><small>{r.isHouseholdHead ? "Kepala keluarga" : "Anggota keluarga"}</small></td>
                  <td>{r.occupation || "—"}</td>
                </tr>)}
            </tbody>
          </table>
        </div>
        <div className="table-footer">Menampilkan {filtered.length} dari {records.length} penduduk</div>
      </section>

      {showForm && <div className="modal-layer" role="presentation" onMouseDown={(e) => e.target === e.currentTarget && setShowForm(false)}>
        <section className="mail-modal" role="dialog" aria-modal="true" aria-labelledby="resident-form-title">
          <div className="modal-heading"><div><p className="eyebrow">FORMULIR PENDUDUK</p><h2 id="resident-form-title">Tambah Data Penduduk</h2></div><button aria-label="Tutup formulir" onClick={() => setShowForm(false)}>×</button></div>
          <form onSubmit={submit}><div className="form-grid">
            <label>Nomor Data *<input required value={form.recordNumber} onChange={(e) => setForm({ ...form, recordNumber: e.target.value })} placeholder="Contoh: PDT-2026-001" /></label>
            <label>Nomor Keluarga *<input required value={form.householdNumber} onChange={(e) => setForm({ ...form, householdNumber: e.target.value })} placeholder="Contoh: KK-2026-001" /></label>
            <label className="wide">Nama Lengkap *<input required value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} placeholder="Nama lengkap penduduk contoh" /></label>
            <label>Jenis Kelamin<select value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value })}><option>Laki-laki</option><option>Perempuan</option></select></label>
            <label>Tanggal Lahir *<input required type="date" value={form.birthDate} onChange={(e) => setForm({ ...form, birthDate: e.target.value })} /></label>
            <label>Suco *<input required value={form.suco} onChange={(e) => setForm({ ...form, suco: e.target.value })} placeholder="Nama suco" /></label>
            <label>Aldeia *<input required value={form.aldeia} onChange={(e) => setForm({ ...form, aldeia: e.target.value })} placeholder="Nama aldeia" /></label>
            <label>Status Perkawinan<select value={form.maritalStatus} onChange={(e) => setForm({ ...form, maritalStatus: e.target.value })}><option>Belum Menikah</option><option>Menikah</option><option>Cerai</option><option>Janda/Duda</option></select></label>
            <label>Pekerjaan<input value={form.occupation} onChange={(e) => setForm({ ...form, occupation: e.target.value })} placeholder="Pekerjaan (opsional)" /></label>
            <label className="wide checkbox-label"><input type="checkbox" checked={form.isHouseholdHead} onChange={(e) => setForm({ ...form, isHouseholdHead: e.target.checked })} /> Penduduk ini adalah kepala keluarga</label>
          </div><div className="form-actions"><button type="button" onClick={() => setShowForm(false)}>Batal</button><button className="save-button" disabled={saving}>{saving ? "Menyimpan..." : "Simpan Data"}</button></div></form>
        </section>
      </div>}
    </div>
  );
}
