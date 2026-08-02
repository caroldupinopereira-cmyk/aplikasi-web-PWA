"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import Pagination from "./Pagination";
import { exportAllPages, exportToCSV } from "../utils/export";
import { useToast, ToastContainer } from "./Toast";
import AutoNumberButton from "./AutoNumberButton";
import { useLanguage } from "./LanguageProvider";
import Icon from "./Icon";

type Report = {
  id: number; reportNumber: string; title: string; activityDate: string; location: string;
  activityType: string; responsiblePerson: string; participantCount: number; summary: string;
  obstacles: string; recommendations: string; status: string;
};

const blankForm = {
  reportNumber: "", title: "", activityDate: new Date().toISOString().slice(0, 10), location: "", activityType: "Rapat",
  responsiblePerson: "", participantCount: 0, summary: "", obstacles: "", recommendations: "",
};

const statusOptions = ["Draf", "Diperiksa", "Selesai"];

export default function ActivityReports({ initialOpenCreate = false }: { initialOpenCreate?: boolean }) {
  const { t } = useLanguage();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(initialOpenCreate);
  const [editing, setEditing] = useState<Report | null>(null);
  const [query, setQuery] = useState("");
  const [month, setMonth] = useState("Semua");
  const [form, setForm] = useState(blankForm);
  const [saving, setSaving] = useState(false);
  const { toasts, addToast, dismiss } = useToast();
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [months, setMonths] = useState<string[]>([]);
  const [stats, setStats] = useState({ total: 0, participants: 0, completed: 0, thisMonth: 0 });
  const [currentRole, setCurrentRole] = useState("");
  const perPage = 15;

  const loadReports = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page), perPage: String(perPage), q: query, month,
      });
      const response = await fetch(`/api/activity-reports?${params}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Gagal memuat laporan.");
      setReports(data.reports);
      setTotal(data.pagination.total);
      setMonths(data.filters.months);
      setStats(data.summary);
      setCurrentRole(data.currentUser?.role ?? "");
    } catch {
      addToast(t("Database sedang disiapkan. Coba muat ulang beberapa saat lagi."), "error");
    } finally { setLoading(false); }
  }, [addToast, month, page, query, t]);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadReports(), 300);
    return () => window.clearTimeout(timer);
  }, [loadReports]);

  function openCreate() {
    setEditing(null);
    setForm(blankForm);
    setPage(1);
    setShowForm(true);
  }

  function openEdit(report: Report) {
    setEditing(report);
    setForm({
      reportNumber: report.reportNumber,
      title: report.title,
      activityDate: report.activityDate,
      location: report.location,
      activityType: report.activityType,
      responsiblePerson: report.responsiblePerson,
      participantCount: report.participantCount,
      summary: report.summary,
      obstacles: report.obstacles,
      recommendations: report.recommendations,
    });
    setShowForm(true);
  }

  async function submit(event: FormEvent) {
    event.preventDefault(); setSaving(true);
    try {
      if (editing) {
        const response = await fetch("/api/activity-reports", {
          method: "PATCH", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: editing.id, ...form }),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Gagal memperbarui laporan.");
        await loadReports();
        addToast(t("Laporan kegiatan berhasil diperbarui."), "success");
      } else {
        const response = await fetch("/api/activity-reports", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Gagal menyimpan laporan.");
        setPage(1);
        await loadReports();
        addToast(t("Laporan kegiatan berhasil disimpan sebagai draf."), "success");
      }
      setForm(blankForm); setEditing(null); setShowForm(false);
    } catch (error) { addToast(t(error instanceof Error ? error.message : "Gagal menyimpan laporan."), "error"); }
    finally { setSaving(false); }
  }

  async function remove(id: number) {
    if (!confirm(t("Hapus laporan ini? Tindakan ini tidak dapat dibatalkan."))) return;
    try {
      const response = await fetch("/api/activity-reports", {
        method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }),
      });
      if (!response.ok) throw new Error("Gagal menghapus laporan.");
      await loadReports();
      addToast(t("Laporan berhasil dihapus."), "success");
    } catch (error) {
      addToast(t(error instanceof Error ? error.message : "Gagal menghapus laporan."), "error");
    }
  }

  async function updateStatus(id: number, status: string) {
    const response = await fetch("/api/activity-reports", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, status }) });
    if (response.ok) await loadReports();
  }

  return <div className="page mail-page report-page">
    <div className="page-heading"><div><p className="eyebrow">{t("PELAPORAN PROGRAM")}</p><h1>{t("Laporan Kegiatan")}</h1><p>{t("Catat pelaksanaan kegiatan dan siapkan laporan bulanan kantor.")}</p></div><button className="primary-button mail-add" onClick={openCreate}><Icon name="plus" /> {t("Buat Laporan")}</button></div>

    <section className="mail-stats report-stats">
      <article><span>{t("Total Laporan")}</span><strong>{stats.total}</strong><small>{t("Semua laporan kegiatan")}</small></article>
      <article><span>{t("Kegiatan Bulan Ini")}</span><strong>{stats.thisMonth}</strong><small>{t("Bulan berjalan")}</small></article>
      <article><span>{t("Total Peserta")}</span><strong>{stats.participants}</strong><small>{t("Dari seluruh kegiatan")}</small></article>
      <article><span>{t("Laporan Selesai")}</span><strong>{stats.completed}</strong><small>{t("Telah diselesaikan")}</small></article>
    </section>

    <section className="panel mail-table-panel">
      <div className="mail-toolbar">
        <label className="mail-search"><span><Icon name="search" /></span><input value={query} onChange={(e) => { setQuery(e.target.value); setPage(1); }} placeholder={t("Cari nomor, kegiatan, lokasi, atau penanggung jawab...")} /></label>
        <label className="filter-label">{t("Bulan")}<select value={month} onChange={(e) => { setMonth(e.target.value); setPage(1); }}><option value="Semua">{t("Semua")}</option>{months.map((m) => <option key={m} value={m}>{m}</option>)}</select></label>
        <button className="refresh-button" onClick={() => void loadReports()}><Icon name="refresh" /> {t("Muat Ulang")}</button>
        <button className="export-button" onClick={() => exportToCSV(reports.map((r, i) => ({ No: (page - 1) * perPage + i + 1, "Nomor Laporan": r.reportNumber, Kegiatan: r.title, Tanggal: r.activityDate, Lokasi: r.location, "Jenis Kegiatan": r.activityType, "Penanggung Jawab": r.responsiblePerson, Peserta: r.participantCount, Ringkasan: r.summary, Hambatan: r.obstacles, Rekomendasi: r.recommendations, Status: r.status })), "laporan_kegiatan_halaman")}>↓ {t("Export Halaman")}</button>
        <button className="export-button" onClick={() => void exportAllPages<Report>("/api/activity-reports", "reports", { q: query, month }, (r, i) => ({ No: i + 1, "Nomor Laporan": r.reportNumber, Kegiatan: r.title, Tanggal: r.activityDate, Lokasi: r.location, "Jenis Kegiatan": r.activityType, "Penanggung Jawab": r.responsiblePerson, Peserta: r.participantCount, Ringkasan: r.summary, Hambatan: r.obstacles, Rekomendasi: r.recommendations, Status: r.status }), "laporan_kegiatan_lengkap").catch((error) => addToast(error instanceof Error ? error.message : t("Export gagal."), "error"))}>⇩ {t("Export Semua")}</button>
        <button className="print-button" onClick={() => window.print()}><Icon name="printer" /> {t("Cetak/PDF")}</button>
      </div>
      <div className="table-wrap"><table className="mail-table report-table">
        <thead><tr><th>No.</th><th>{t("Kegiatan")}</th><th>{t("Tanggal & Lokasi")}</th><th>{t("Penanggung Jawab")}</th><th>{t("Peserta")}</th><th>{t("Status")}</th><th>{t("Aksi")}</th></tr></thead>
        <tbody>{loading ? <tr><td colSpan={7} className="table-empty">{t("Memuat laporan...")}</td></tr> : reports.length === 0 ? <tr><td colSpan={7} className="table-empty">{t("Belum ada laporan kegiatan yang sesuai.")}</td></tr> : reports.map((r, i) => <tr key={r.id}>
          <td>{(page - 1) * perPage + i + 1}</td><td><strong>{r.title}</strong><small>{r.reportNumber} • {t(r.activityType)}</small></td><td><strong>{r.activityDate}</strong><small>{r.location}</small></td><td>{r.responsiblePerson}</td><td>{r.participantCount}</td>
          <td><select aria-label={`${t("Status")} ${r.reportNumber}`} className={`status-select status-${r.status.toLowerCase()}`} value={r.status} onChange={(e) => void updateStatus(r.id, e.target.value)}>{statusOptions.map((s) => <option key={s} value={s}>{t(s)}</option>)}</select></td>
          <td className="actions-cell">
            <button className="action-btn edit" onClick={() => openEdit(r)} title={t("Edit")}><Icon name="edit" size={15} /></button>
            {currentRole === "Administrator" && <button className="action-btn delete" onClick={() => void remove(r.id)} title={t("Hapus")}><Icon name="trash" size={15} /></button>}
          </td>
        </tr>)}</tbody>
      </table></div><div className="table-footer">{t("Menampilkan")} {reports.length} {t("dari")} {total} {t("laporan")}</div>
        <Pagination currentPage={page} totalItems={total} perPage={perPage} onPageChange={setPage} />
    </section>

    {showForm && <div className="modal-layer" role="presentation" onMouseDown={(e) => e.target === e.currentTarget && setShowForm(false)}>
      <section className="mail-modal report-modal" role="dialog" aria-modal="true" aria-labelledby="report-form-title">
        <div className="modal-heading"><div><p className="eyebrow">{t("FORMULIR KEGIATAN")}</p><h2 id="report-form-title">{t(editing ? "Edit Laporan Kegiatan" : "Buat Laporan Kegiatan")}</h2></div><button aria-label={t("Tutup formulir")} onClick={() => setShowForm(false)}>×</button></div>
        <form onSubmit={submit}><div className="form-grid">
          <label>{t("Nomor Laporan")} *<input required value={form.reportNumber} onChange={(e) => setForm({ ...form, reportNumber: e.target.value })} placeholder={t("Contoh: LPK-2026-08-0001")} /><AutoNumberButton documentType="report" date={form.activityDate} onNumber={(reportNumber) => setForm({ ...form, reportNumber })} /></label>
          <label>{t("Tanggal Kegiatan")} *<input required type="date" value={form.activityDate} onChange={(e) => setForm({ ...form, activityDate: e.target.value })} /></label>
          <label className="wide">{t("Nama Kegiatan")} *<input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder={t("Nama kegiatan")} /></label>
          <label>{t("Jenis Kegiatan")}<select value={form.activityType} onChange={(e) => setForm({ ...form, activityType: e.target.value })}>{["Rapat", "Sosialisasi", "Monitoring", "Pelatihan", "Kegiatan Masyarakat"].map((item) => <option key={item} value={item}>{t(item)}</option>)}</select></label>
          <label>{t("Jumlah Peserta")}<input min="0" type="number" value={form.participantCount} onChange={(e) => setForm({ ...form, participantCount: Number(e.target.value) })} /></label>
          <label>{t("Lokasi")} *<input required value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder={t("Lokasi kegiatan")} /></label>
          <label>{t("Penanggung Jawab")} *<input required value={form.responsiblePerson} onChange={(e) => setForm({ ...form, responsiblePerson: e.target.value })} placeholder={t("Nama penanggung jawab")} /></label>
          <label className="wide">{t("Hasil Kegiatan")} *<textarea required rows={3} value={form.summary} onChange={(e) => setForm({ ...form, summary: e.target.value })} placeholder={t("Jelaskan hasil utama kegiatan")} /></label>
          <label>{t("Hambatan")}<textarea rows={3} value={form.obstacles} onChange={(e) => setForm({ ...form, obstacles: e.target.value })} placeholder={t("Hambatan yang ditemukan")} /></label>
          <label>{t("Rekomendasi")}<textarea rows={3} value={form.recommendations} onChange={(e) => setForm({ ...form, recommendations: e.target.value })} placeholder={t("Rekomendasi tindak lanjut")} /></label>
        </div><div className="form-actions"><button type="button" onClick={() => setShowForm(false)}>{t("Batal")}</button><button className="save-button" disabled={saving}>{t(saving ? "Menyimpan..." : editing ? "Perbarui Laporan" : "Simpan Laporan")}</button></div></form>
      </section>
    </div>}
    <ToastContainer toasts={toasts} dismiss={dismiss} />
  </div>;
}
