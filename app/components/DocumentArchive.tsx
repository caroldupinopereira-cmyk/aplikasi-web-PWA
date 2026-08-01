"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Pagination from "./Pagination";
import { exportToCSV } from "../utils/export";
import { useToast, ToastContainer } from "./Toast";

type DocumentItem = {
  id: number; title: string; referenceNumber: string; documentDate: string; category: string;
  archiveYear: number; fileName: string; contentType: string; sizeBytes: number; description: string;
};

const now = new Date();
const blankForm = { title: "", referenceNumber: "", documentDate: now.toISOString().slice(0, 10), category: "Surat", archiveYear: now.getFullYear(), description: "" };
const fileSize = (bytes: number) => bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`;
const fileKind = (type: string) => type.includes("pdf") ? "PDF" : type.includes("word") ? "DOC" : type.includes("excel") || type.includes("sheet") ? "XLS" : "IMG";

export default function DocumentArchive({ initialOpenCreate = false }: { initialOpenCreate?: boolean }) {
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
  const perPage = 15;

  async function loadDocuments() {
    setLoading(true);
    try {
      const response = await fetch("/api/documents"); const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Gagal memuat dokumen.");
      setDocuments(data.documents);
    } catch { addToast("Penyimpanan arsip sedang disiapkan. Coba muat ulang beberapa saat lagi.", "error"); }
    finally { setLoading(false); }
  }
  useEffect(() => { void loadDocuments(); }, []);

  const categories = useMemo(() => Array.from(new Set(documents.map((d) => d.category))).sort(), [documents]);
  const filtered = useMemo(() => {
    const text = query.toLowerCase();
    return documents.filter((d) => [d.title, d.referenceNumber, d.fileName, d.description].some((v) => v.toLowerCase().includes(text)) && (category === "Semua" || d.category === category));
  }, [documents, query, category]);

  const paged = useMemo(() => {
    const start = (page - 1) * perPage;
    return filtered.slice(start, start + perPage);
  }, [filtered, page]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!file) { addToast("Pilih file yang ingin diarsipkan.", "error"); return; }
    setSaving(true);
    try {
      const payload = new FormData();
      Object.entries(form).forEach(([key, value]) => payload.append(key, String(value)));
      payload.append("file", file);
      const response = await fetch("/api/documents", { method: "POST", body: payload });
      const data = await response.json(); if (!response.ok) throw new Error(data.error);
      setDocuments((old) => [data.document, ...old]); setForm(blankForm); setFile(null); setShowForm(false); addToast("Dokumen berhasil diarsipkan.", "success");
    } catch (error) { addToast(error instanceof Error ? error.message : "Gagal mengarsipkan dokumen.", "error"); }
    finally { setSaving(false); }
  }

  async function remove(id: number) {
    if (!confirm("Hapus dokumen ini dari arsip? Tindakan ini tidak dapat dibatalkan.")) return;
    try {
      const response = await fetch("/api/documents", {
        method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }),
      });
      if (!response.ok) throw new Error("Gagal menghapus dokumen.");
      setDocuments((old) => old.filter((d) => d.id !== id));
      addToast("Dokumen berhasil dihapus dari arsip.", "success");
    } catch (error) {
      addToast(error instanceof Error ? error.message : "Gagal menghapus dokumen.", "error");
    }
  }

  const totalSize = documents.reduce((sum, d) => sum + d.sizeBytes, 0);
  const currentYear = new Date().getFullYear();
  const thisYear = documents.filter((d) => d.archiveYear === currentYear).length;
  const pdfCount = documents.filter((d) => d.contentType === "application/pdf").length;

  return <div className="page mail-page archive-page">
    <div className="page-heading"><div><p className="eyebrow">PUSAT DOKUMEN</p><h1>Arsip Dokumen</h1><p>Simpan dan temukan kembali dokumen kantor secara teratur.</p></div><button className="primary-button mail-add" onClick={() => setShowForm(true)}><span>＋</span> Unggah Dokumen</button></div>
    <section className="mail-stats archive-stats">
      <article><span>Total Dokumen</span><strong>{documents.length}</strong><small>Semua file arsip</small></article>
      <article><span>Arsip Tahun {currentYear}</span><strong>{thisYear}</strong><small>Dokumen tahun berjalan</small></article>
      <article><span>Dokumen PDF</span><strong>{pdfCount}</strong><small>File format PDF</small></article>
      <article><span>Total Penyimpanan</span><strong>{fileSize(totalSize)}</strong><small>Ukuran seluruh file</small></article>
    </section>
    <section className="panel mail-table-panel"><div className="mail-toolbar">
      <label className="mail-search"><span>⌕</span><input value={query} onChange={(e) => { setQuery(e.target.value); setPage(1); }} placeholder="Cari judul, referensi, nama file, atau keterangan..." /></label>
      <label className="filter-label">Kategori<select value={category} onChange={(e) => { setCategory(e.target.value); setPage(1); }}><option>Semua</option>{categories.map((c) => <option key={c}>{c}</option>)}</select></label>
      <button className="refresh-button" onClick={() => void loadDocuments()}>↻ Muat Ulang</button>
      <button className="export-button" onClick={() => exportToCSV(filtered.map((d, i) => ({ No: i + 1, Judul: d.title, "Nomor Referensi": d.referenceNumber, Tanggal: d.documentDate, Kategori: d.category, "Tahun Arsip": d.archiveYear, "Nama File": d.fileName, Ukuran: `${Math.round(d.sizeBytes / 1024)} KB`, Keterangan: d.description })), "arsip_dokumen")}>↓ Export CSV</button>
    </div><div className="table-wrap"><table className="mail-table archive-table">
      <thead><tr><th>No.</th><th>Dokumen</th><th>Kategori</th><th>Tanggal/Tahun</th><th>File</th><th>Aksi</th></tr></thead>
      <tbody>{loading ? <tr><td colSpan={6} className="table-empty">Memuat arsip...</td></tr> : filtered.length === 0 ? <tr><td colSpan={6} className="table-empty">Belum ada dokumen yang sesuai.</td></tr> : paged.map((d, i) => <tr key={d.id}>
        <td>{(page - 1) * perPage + i + 1}</td><td><strong>{d.title}</strong><small>{d.referenceNumber || "Tanpa nomor referensi"}</small></td><td><span className="category-pill">{d.category}</span></td><td><strong>{d.documentDate}</strong><small>Arsip {d.archiveYear}</small></td>
        <td><span className={`file-type file-${fileKind(d.contentType).toLowerCase()}`}>{fileKind(d.contentType)}</span><strong className="file-name">{d.fileName}</strong><small>{fileSize(d.sizeBytes)}</small></td>
        <td className="actions-cell">
          <a className="download-button" href={`/api/documents/${d.id}`}>↓ Unduh</a>
          <button className="action-btn delete" onClick={() => void remove(d.id)} title="Hapus">✕</button>
        </td>
      </tr>)}</tbody>
    </table></div><div className="table-footer">Menampilkan {paged.length} dari {filtered.length} dokumen</div>
      <Pagination currentPage={page} totalItems={filtered.length} perPage={perPage} onPageChange={setPage} />
    </section>

    {showForm && <div className="modal-layer" role="presentation" onMouseDown={(e) => e.target === e.currentTarget && setShowForm(false)}>
      <section className="mail-modal" role="dialog" aria-modal="true" aria-labelledby="archive-form-title"><div className="modal-heading"><div><p className="eyebrow">FORMULIR ARSIP</p><h2 id="archive-form-title">Unggah Dokumen</h2></div><button aria-label="Tutup formulir" onClick={() => setShowForm(false)}>×</button></div>
      <form onSubmit={submit}><div className="form-grid">
        <label className="wide">Judul Dokumen *<input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Judul dokumen" /></label>
        <label>Nomor Referensi<input value={form.referenceNumber} onChange={(e) => setForm({ ...form, referenceNumber: e.target.value })} placeholder="Nomor surat/dokumen" /></label>
        <label>Tanggal Dokumen *<input required type="date" value={form.documentDate} onChange={(e) => setForm({ ...form, documentDate: e.target.value, archiveYear: Number(e.target.value.slice(0, 4)) })} /></label>
        <label>Kategori<select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}><option>Surat</option><option>Laporan</option><option>Keuangan</option><option>Data Penduduk</option><option>Peraturan</option><option>Foto Kegiatan</option><option>Lainnya</option></select></label>
        <label>Tahun Arsip<input min="2000" max="2100" type="number" value={form.archiveYear} onChange={(e) => setForm({ ...form, archiveYear: Number(e.target.value) })} /></label>
        <label className="wide">File *<input required type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png" onChange={(e) => setFile(e.target.files?.[0] || null)} /><small className="field-help">PDF, Word, Excel, JPG, atau PNG. Maksimal 10 MB.</small></label>
        <label className="wide">Keterangan<textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Keterangan isi dokumen (opsional)" /></label>
      </div><div className="form-actions"><button type="button" onClick={() => setShowForm(false)}>Batal</button><button className="save-button" disabled={saving}>{saving ? "Mengunggah..." : "Simpan ke Arsip"}</button></div></form></section>
    </div>}
    <ToastContainer toasts={toasts} dismiss={dismiss} />
  </div>;
}
