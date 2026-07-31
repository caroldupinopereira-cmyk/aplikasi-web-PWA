"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

type Report = {
  id: number; reportNumber: string; title: string; activityDate: string; location: string;
  activityType: string; responsiblePerson: string; participantCount: number; summary: string;
  obstacles: string; recommendations: string; status: string;
};

const blankForm = {
  reportNumber: "", title: "", activityDate: "2026-07-31", location: "", activityType: "Rapat",
  responsiblePerson: "", participantCount: 0, summary: "", obstacles: "", recommendations: "",
};

const statusOptions = ["Draf", "Diperiksa", "Selesai"];

export default function ActivityReports() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [query, setQuery] = useState("");
  const [month, setMonth] = useState("Semua");
  const [form, setForm] = useState(blankForm);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  async function loadReports() {
    setLoading(true);
    try {
      const response = await fetch("/api/activity-reports");
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Gagal memuat laporan.");
      setReports(data.reports);
    } catch {
      setMessage("Database sedang disiapkan. Coba muat ulang beberapa saat lagi.");
    } finally { setLoading(false); }
  }

  useEffect(() => { void loadReports(); }, []);

  const months = useMemo(() => Array.from(new Set(reports.map((r) => r.activityDate.slice(0, 7)))).sort().reverse(), [reports]);
  const filtered = useMemo(() => {
    const text = query.toLowerCase();
    return reports.filter((r) =>
      [r.reportNumber, r.title, r.location, r.responsiblePerson].some((v) => v.toLowerCase().includes(text)) &&
      (month === "Semua" || r.activityDate.startsWith(month))
    );
  }, [reports, query, month]);

  async function submit(event: FormEvent) {
    event.preventDefault(); setSaving(true); setMessage("");
    try {
      const response = await fetch("/api/activity-reports", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Gagal menyimpan laporan.");
      setReports((old) => [data.report, ...old]); setForm(blankForm); setShowForm(false); setMessage("Laporan kegiatan berhasil disimpan sebagai draf.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Gagal menyimpan laporan."); }
    finally { setSaving(false); }
  }

  async function updateStatus(id: number, status: string) {
    const response = await fetch("/api/activity-reports", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, status }) });
    if (response.ok) setReports((old) => old.map((r) => r.id === id ? { ...r, status } : r));
  }

  const totalParticipants = reports.reduce((sum, r) => sum + r.participantCount, 0);
  const complete = reports.filter((r) => r.status === "Selesai").length;
  const thisMonth = reports.filter((r) => r.activityDate.startsWith("2026-07")).length;

  return <div className="page mail-page report-page">
    <div className="page-heading"><div><p className="eyebrow">PELAPORAN PROGRAM</p><h1>Laporan Kegiatan</h1><p>Catat pelaksanaan kegiatan dan siapkan laporan bulanan kantor.</p></div><button className="primary-button mail-add" onClick={() => setShowForm(true)}><span>＋</span> Buat Laporan</button></div>

    <section className="mail-stats report-stats">
      <article><span>Total Laporan</span><strong>{reports.length}</strong><small>Semua laporan kegiatan</small></article>
      <article><span>Kegiatan Bulan Ini</span><strong>{thisMonth}</strong><small>Juli 2026</small></article>
      <article><span>Total Peserta</span><strong>{totalParticipants}</strong><small>Dari seluruh kegiatan</small></article>
      <article><span>Laporan Selesai</span><strong>{complete}</strong><small>Telah diselesaikan</small></article>
    </section>

    {message && <div className="mail-message">{message}<button onClick={() => setMessage("")}>×</button></div>}
    <section className="panel mail-table-panel">
      <div className="mail-toolbar">
        <label className="mail-search"><span>⌕</span><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Cari nomor, kegiatan, lokasi, atau penanggung jawab..." /></label>
        <label className="filter-label">Bulan<select value={month} onChange={(e) => setMonth(e.target.value)}><option>Semua</option>{months.map((m) => <option key={m} value={m}>{m}</option>)}</select></label>
        <button className="refresh-button" onClick={() => void loadReports()}>↻ Muat Ulang</button>
      </div>
      <div className="table-wrap"><table className="mail-table report-table">
        <thead><tr><th>No.</th><th>Kegiatan</th><th>Tanggal & Lokasi</th><th>Penanggung Jawab</th><th>Peserta</th><th>Status</th></tr></thead>
        <tbody>{loading ? <tr><td colSpan={6} className="table-empty">Memuat laporan...</td></tr> : filtered.length === 0 ? <tr><td colSpan={6} className="table-empty">Belum ada laporan kegiatan yang sesuai.</td></tr> : filtered.map((r, i) => <tr key={r.id}>
          <td>{i + 1}</td><td><strong>{r.title}</strong><small>{r.reportNumber} • {r.activityType}</small></td><td><strong>{r.activityDate}</strong><small>{r.location}</small></td><td>{r.responsiblePerson}</td><td>{r.participantCount}</td>
          <td><select aria-label={`Status ${r.reportNumber}`} className={`status-select status-${r.status.toLowerCase()}`} value={r.status} onChange={(e) => void updateStatus(r.id, e.target.value)}>{statusOptions.map((s) => <option key={s}>{s}</option>)}</select></td>
        </tr>)}</tbody>
      </table></div><div className="table-footer">Menampilkan {filtered.length} dari {reports.length} laporan</div>
    </section>

    {showForm && <div className="modal-layer" role="presentation" onMouseDown={(e) => e.target === e.currentTarget && setShowForm(false)}>
      <section className="mail-modal report-modal" role="dialog" aria-modal="true" aria-labelledby="report-form-title">
        <div className="modal-heading"><div><p className="eyebrow">FORMULIR KEGIATAN</p><h2 id="report-form-title">Buat Laporan Kegiatan</h2></div><button aria-label="Tutup formulir" onClick={() => setShowForm(false)}>×</button></div>
        <form onSubmit={submit}><div className="form-grid">
          <label>Nomor Laporan *<input required value={form.reportNumber} onChange={(e) => setForm({ ...form, reportNumber: e.target.value })} placeholder="Contoh: LPK-07-2026-01" /></label>
          <label>Tanggal Kegiatan *<input required type="date" value={form.activityDate} onChange={(e) => setForm({ ...form, activityDate: e.target.value })} /></label>
          <label className="wide">Nama Kegiatan *<input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Nama kegiatan" /></label>
          <label>Jenis Kegiatan<select value={form.activityType} onChange={(e) => setForm({ ...form, activityType: e.target.value })}><option>Rapat</option><option>Sosialisasi</option><option>Monitoring</option><option>Pelatihan</option><option>Kegiatan Masyarakat</option></select></label>
          <label>Jumlah Peserta<input min="0" type="number" value={form.participantCount} onChange={(e) => setForm({ ...form, participantCount: Number(e.target.value) })} /></label>
          <label>Lokasi *<input required value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="Lokasi kegiatan" /></label>
          <label>Penanggung Jawab *<input required value={form.responsiblePerson} onChange={(e) => setForm({ ...form, responsiblePerson: e.target.value })} placeholder="Nama penanggung jawab" /></label>
          <label className="wide">Hasil Kegiatan *<textarea required rows={3} value={form.summary} onChange={(e) => setForm({ ...form, summary: e.target.value })} placeholder="Jelaskan hasil utama kegiatan" /></label>
          <label>Hambatan<textarea rows={3} value={form.obstacles} onChange={(e) => setForm({ ...form, obstacles: e.target.value })} placeholder="Hambatan yang ditemukan" /></label>
          <label>Rekomendasi<textarea rows={3} value={form.recommendations} onChange={(e) => setForm({ ...form, recommendations: e.target.value })} placeholder="Rekomendasi tindak lanjut" /></label>
        </div><div className="form-actions"><button type="button" onClick={() => setShowForm(false)}>Batal</button><button className="save-button" disabled={saving}>{saving ? "Menyimpan..." : "Simpan Laporan"}</button></div></form>
      </section>
    </div>}
  </div>;
}
