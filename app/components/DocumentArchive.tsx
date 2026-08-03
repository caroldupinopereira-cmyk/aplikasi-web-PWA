"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import Pagination from "./Pagination";
import { exportAllPages, exportToCSV } from "../utils/export";
import { useToast, ToastContainer } from "./Toast";
import { useLanguage } from "./LanguageProvider";
import Icon from "./Icon";
import { roleHasCapability } from "../roles";
import RoleAccessNotice from "./RoleAccessNotice";

type DocumentItem = {
  id: number; title: string; referenceNumber: string; documentDate: string; category: string;
  archiveYear: number; fileName: string; contentType: string; sizeBytes: number; description: string;
};

const now = new Date();
const blankForm = { title: "", referenceNumber: "", documentDate: now.toISOString().slice(0, 10), category: "Surat", archiveYear: now.getFullYear(), description: "" };
const fileSize = (bytes: number) => bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`;
const fileKind = (type: string) => type.includes("pdf") ? "PDF" : type.includes("word") ? "DOC" : type.includes("excel") || type.includes("sheet") ? "XLS" : "IMG";

export default function DocumentArchive({ initialOpenCreate = false }: { initialOpenCreate?: boolean }) {
  const { t } = useLanguage();
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(initialOpenCreate);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("Semua");
  const [form, setForm] = useState(blankForm);
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const { toasts, addToast, dismiss } = useToast();
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [categories, setCategories] = useState<string[]>([]);
  const [stats, setStats] = useState({ total: 0, thisYear: 0, pdf: 0, sizeBytes: 0 });
  const [integrity, setIntegrity] = useState<{ checked: number; healthy: number; issues: Array<{ id: number; title: string; issue: string; severity: string }> } | null>(null);
  const [checkingIntegrity, setCheckingIntegrity] = useState(false);
  const [currentRole, setCurrentRole] = useState("");
  const perPage = 15;
  const canWrite = roleHasCapability(currentRole, "writeOperational");
  const canCheckIntegrity = roleHasCapability(currentRole, "approve");

  const loadDocuments = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page), perPage: String(perPage), q: query, category,
      });
      const response = await fetch(`/api/documents?${params}`); const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Gagal memuat dokumen.");
      setDocuments(data.documents);
      setTotal(data.pagination.total);
      setCategories(data.filters.categories);
      setStats(data.summary);
      setCurrentRole(data.currentUser?.role ?? "");
    } catch { addToast(t("Penyimpanan arsip sedang disiapkan. Coba muat ulang beberapa saat lagi."), "error"); }
    finally { setLoading(false); }
  }, [addToast, category, page, query, t]);
  useEffect(() => {
    const timer = window.setTimeout(() => void loadDocuments(), 300);
    return () => window.clearTimeout(timer);
  }, [loadDocuments]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!file) { addToast(t("Pilih file yang ingin diarsipkan."), "error"); return; }
    setSaving(true);
    try {
      const payload = new FormData();
      Object.entries(form).forEach(([key, value]) => payload.append(key, String(value)));
      payload.append("file", file);
      const response = await fetch("/api/documents", { method: "POST", body: payload });
      const data = await response.json(); if (!response.ok) throw new Error(data.error);
      setPage(1); await loadDocuments(); setForm(blankForm); setFile(null); setShowForm(false); addToast(t("Dokumen berhasil diarsipkan."), "success");
    } catch (error) { addToast(t(error instanceof Error ? error.message : "Gagal mengarsipkan dokumen."), "error"); }
    finally { setSaving(false); }
  }

  async function remove(id: number) {
    if (!confirm(t("Hapus dokumen ini dari arsip? Tindakan ini tidak dapat dibatalkan."))) return;
    try {
      const response = await fetch("/api/documents", {
        method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }),
      });
      if (!response.ok) throw new Error("Gagal menghapus dokumen.");
      await loadDocuments();
      addToast(t("Dokumen berhasil dihapus dari arsip."), "success");
    } catch (error) {
      addToast(t(error instanceof Error ? error.message : "Gagal menghapus dokumen."), "error");
    }
  }

  async function checkIntegrity() {
    setCheckingIntegrity(true);
    try {
      const response = await fetch("/api/documents/integrity");
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Pemeriksaan gagal.");
      setIntegrity(result);
      addToast(t("Pemeriksaan integritas arsip selesai."), "success");
    } catch (error) {
      addToast(t(error instanceof Error ? error.message : "Pemeriksaan gagal."), "error");
    } finally {
      setCheckingIntegrity(false);
    }
  }

  const currentYear = new Date().getFullYear();

  return <div className="page mail-page archive-page">
    <div className="page-heading"><div><p className="eyebrow">{t("PUSAT DOKUMEN")}</p><h1>{t("Arsip Dokumen")}</h1><p>{t("Simpan dan temukan kembali dokumen kantor secara teratur.")}</p></div>{canWrite && <button className="primary-button mail-add" onClick={() => setShowForm(true)}><Icon name="plus" /> {t("Unggah Dokumen")}</button>}</div>
    <RoleAccessNotice role={currentRole} />
    <section className="mail-stats archive-stats">
      <article><span>{t("Total Dokumen")}</span><strong>{stats.total}</strong><small>{t("Semua file arsip")}</small></article>
      <article><span>{t("Arsip Tahun")} {currentYear}</span><strong>{stats.thisYear}</strong><small>{t("Dokumen tahun berjalan")}</small></article>
      <article><span>{t("Dokumen PDF")}</span><strong>{stats.pdf}</strong><small>{t("File format PDF")}</small></article>
      <article><span>{t("Total Penyimpanan")}</span><strong>{fileSize(stats.sizeBytes)}</strong><small>{t("Ukuran seluruh file")}</small></article>
    </section>
    <section className="panel mail-table-panel"><div className="mail-toolbar">
      <label className="mail-search"><span><Icon name="search" /></span><input value={query} onChange={(e) => { setQuery(e.target.value); setPage(1); }} placeholder={t("Cari judul, referensi, nama file, atau keterangan...")} /></label>
      <label className="filter-label">{t("Kategori")}<select value={category} onChange={(e) => { setCategory(e.target.value); setPage(1); }}><option value="Semua">{t("Semua")}</option>{categories.map((c) => <option key={c} value={c}>{t(c)}</option>)}</select></label>
      <button className="refresh-button" onClick={() => void loadDocuments()}><Icon name="refresh" /> {t("Muat Ulang")}</button>
      <button className="export-button" onClick={() => exportToCSV(documents.map((d, i) => ({ No: (page - 1) * perPage + i + 1, Judul: d.title, "Nomor Referensi": d.referenceNumber, Tanggal: d.documentDate, Kategori: d.category, "Tahun Arsip": d.archiveYear, "Nama File": d.fileName, Ukuran: `${Math.round(d.sizeBytes / 1024)} KB`, Keterangan: d.description })), "arsip_dokumen_halaman")}>↓ {t("Export Halaman")}</button>
      <button className="export-button" onClick={() => void exportAllPages<DocumentItem>("/api/documents", "documents", { q: query, category }, (d, i) => ({ No: i + 1, Judul: d.title, "Nomor Referensi": d.referenceNumber, Tanggal: d.documentDate, Kategori: d.category, "Tahun Arsip": d.archiveYear, "Nama File": d.fileName, Ukuran: `${Math.round(d.sizeBytes / 1024)} KB`, Keterangan: d.description }), "arsip_dokumen_lengkap").catch((error) => addToast(error instanceof Error ? error.message : t("Export gagal."), "error"))}>⇩ {t("Export Semua")}</button>
      <button className="print-button" onClick={() => window.print()}><Icon name="printer" /> {t("Cetak/PDF")}</button>
      {canCheckIntegrity && <button className="print-button" disabled={checkingIntegrity} onClick={() => void checkIntegrity()}>{!checkingIntegrity && <Icon name="shield" />} {checkingIntegrity ? t("Memeriksa...") : t("Periksa Integritas")}</button>}
    </div><div className="table-wrap"><table className="mail-table archive-table">
      <thead><tr><th>No.</th><th>{t("Dokumen")}</th><th>{t("Kategori")}</th><th>{t("Tanggal/Tahun")}</th><th>{t("File")}</th><th>{t("Aksi")}</th></tr></thead>
      <tbody>{loading ? <tr><td colSpan={6} className="table-empty">{t("Memuat arsip...")}</td></tr> : documents.length === 0 ? <tr><td colSpan={6} className="table-empty">{t("Belum ada dokumen yang sesuai.")}</td></tr> : documents.map((d, i) => <tr key={d.id}>
        <td>{(page - 1) * perPage + i + 1}</td><td><strong>{d.title}</strong><small>{d.referenceNumber || t("Tanpa nomor referensi")}</small></td><td><span className="category-pill">{t(d.category)}</span></td><td><strong>{d.documentDate}</strong><small>{t("Arsip")} {d.archiveYear}</small></td>
        <td><span className={`file-type file-${fileKind(d.contentType).toLowerCase()}`}>{fileKind(d.contentType)}</span><strong className="file-name">{d.fileName}</strong><small>{fileSize(d.sizeBytes)}</small></td>
        <td className="actions-cell">
          <a className="download-button" href={`/api/documents/${d.id}`}><Icon name="download" size={15} /> {t("Unduh")}</a>
          {currentRole === "Administrator" && <button className="action-btn delete" onClick={() => void remove(d.id)} title={t("Hapus")}><Icon name="trash" size={15} /></button>}
        </td>
      </tr>)}</tbody>
    </table></div><div className="table-footer">{t("Menampilkan")} {documents.length} {t("dari")} {total} {t("dokumen")}</div>
      <Pagination currentPage={page} totalItems={total} perPage={perPage} onPageChange={setPage} />
    </section>
    {integrity && <section className="panel integrity-panel"><div className="panel-title"><div><h2>{t("Integritas Arsip")}</h2><p>{integrity.healthy} {t("dari")} {integrity.checked} {t("dokumen sehat")}</p></div><button onClick={() => setIntegrity(null)}>{t("Tutup")}</button></div>{integrity.issues.length === 0 ? <p className="empty">{t("Semua metadata D1 sesuai dengan file R2.")}</p> : <div className="integrity-list">{integrity.issues.map((issue, index) => <div key={`${issue.id}-${index}`} className={issue.severity}><strong>{issue.title}</strong><span>{issue.issue}</span></div>)}</div>}</section>}

    {showForm && <div className="modal-layer" role="presentation" onMouseDown={(e) => e.target === e.currentTarget && setShowForm(false)}>
      <section className="mail-modal" role="dialog" aria-modal="true" aria-labelledby="archive-form-title"><div className="modal-heading"><div><p className="eyebrow">{t("FORMULIR ARSIP")}</p><h2 id="archive-form-title">{t("Unggah Dokumen")}</h2></div><button aria-label={t("Tutup formulir")} onClick={() => setShowForm(false)}>×</button></div>
      <form onSubmit={submit}><div className="form-grid">
        <label className="wide">{t("Judul Dokumen")} *<input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder={t("Judul dokumen")} /></label>
        <label>{t("Nomor Referensi")}<input value={form.referenceNumber} onChange={(e) => setForm({ ...form, referenceNumber: e.target.value })} placeholder={t("Nomor surat/dokumen")} /></label>
        <label>{t("Tanggal Dokumen")} *<input required type="date" value={form.documentDate} onChange={(e) => setForm({ ...form, documentDate: e.target.value, archiveYear: Number(e.target.value.slice(0, 4)) })} /></label>
        <label>{t("Kategori")}<select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>{["Surat", "Laporan", "Keuangan", "Data Penduduk", "Peraturan", "Foto Kegiatan", "Lainnya"].map((item) => <option key={item} value={item}>{t(item)}</option>)}</select></label>
        <label>{t("Tahun Arsip")}<input min="2000" max="2100" type="number" value={form.archiveYear} onChange={(e) => setForm({ ...form, archiveYear: Number(e.target.value) })} /></label>
        <label className="wide">{t("File")} *<input required type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png" onChange={(e) => setFile(e.target.files?.[0] || null)} /><small className="field-help">{t("PDF, Word, Excel, JPG, atau PNG. Maksimal 10 MB.")}</small></label>
        <label className="wide">{t("Keterangan")}<textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder={t("Keterangan isi dokumen (opsional)")} /></label>
      </div><div className="form-actions"><button type="button" onClick={() => setShowForm(false)}>{t("Batal")}</button><button className="save-button" disabled={saving}>{t(saving ? "Mengunggah..." : "Simpan ke Arsip")}</button></div></form></section>
    </div>}
    <ToastContainer toasts={toasts} dismiss={dismiss} />
  </div>;
}
