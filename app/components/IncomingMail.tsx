"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import Pagination from "./Pagination";
import { exportToCSV } from "../utils/export";
import { useToast, ToastContainer } from "./Toast";
import AutoNumberButton from "./AutoNumberButton";
import { useLanguage } from "./LanguageProvider";
import Icon from "./Icon";

type Letter = {
  id: number;
  letterNumber: string;
  receivedDate: string;
  letterDate: string;
  sender: string;
  subject: string;
  category: string;
  status: string;
  notes: string;
};

const blankForm = {
  letterNumber: "",
  receivedDate: new Date().toISOString().slice(0, 10),
  letterDate: new Date().toISOString().slice(0, 10),
  sender: "",
  subject: "",
  category: "Umum",
  notes: "",
};

export default function IncomingMail({ initialOpenCreate = false }: { initialOpenCreate?: boolean }) {
  const { t } = useLanguage();
  const [letters, setLetters] = useState<Letter[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(initialOpenCreate);
  const [editing, setEditing] = useState<Letter | null>(null);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("Semua");
  const [form, setForm] = useState(blankForm);
  const [saving, setSaving] = useState(false);
  const { toasts, addToast, dismiss } = useToast();
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [summary, setSummary] = useState({ total: 0, fresh: 0, processing: 0, completed: 0 });
  const [currentRole, setCurrentRole] = useState("");
  const perPage = 15;

  const loadLetters = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        perPage: String(perPage),
        q: query,
        status,
      });
      const response = await fetch(`/api/incoming-letters?${params}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Gagal memuat data.");
      setLetters(data.letters);
      setTotal(data.pagination.total);
      setSummary(data.summary);
      setCurrentRole(data.currentUser?.role ?? "");
    } catch {
      addToast(t("Database sedang disiapkan. Coba muat ulang beberapa saat lagi."), "error");
    } finally {
      setLoading(false);
    }
  }, [addToast, page, query, status, t]);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadLetters(), 300);
    return () => window.clearTimeout(timer);
  }, [loadLetters]);

  function openCreate() {
    setEditing(null);
    setForm(blankForm);
    setPage(1);
    setShowForm(true);
  }

  function openEdit(letter: Letter) {
    setEditing(letter);
    setForm({
      letterNumber: letter.letterNumber,
      receivedDate: letter.receivedDate,
      letterDate: letter.letterDate,
      sender: letter.sender,
      subject: letter.subject,
      category: letter.category,
      notes: letter.notes,
    });
    setShowForm(true);
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    try {
      if (editing) {
        const response = await fetch("/api/incoming-letters", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: editing.id, ...form }),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Gagal memperbarui surat.");
        await loadLetters();
        addToast(t("Surat masuk berhasil diperbarui."), "success");
      } else {
        const response = await fetch("/api/incoming-letters", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Gagal menyimpan surat.");
        setPage(1);
        await loadLetters();
        addToast(t("Surat masuk berhasil disimpan."), "success");
      }
      setForm(blankForm);
      setEditing(null);
      setShowForm(false);
    } catch (error) {
      addToast(t(error instanceof Error ? error.message : "Gagal menyimpan surat."), "error");
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: number) {
    if (!confirm(t("Hapus surat ini? Tindakan ini tidak dapat dibatalkan."))) return;
    try {
      const response = await fetch("/api/incoming-letters", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (!response.ok) throw new Error("Gagal menghapus surat.");
      await loadLetters();
      addToast(t("Surat berhasil dihapus."), "success");
    } catch (error) {
      addToast(t(error instanceof Error ? error.message : "Gagal menghapus surat."), "error");
    }
  }

  async function updateStatus(id: number, nextStatus: string) {
    const response = await fetch("/api/incoming-letters", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status: nextStatus }),
    });
    if (response.ok) await loadLetters();
  }

  const newCount = summary.fresh;
  const processCount = summary.processing;
  const completedCount = summary.completed;

  return (
    <div className="page mail-page">
      <div className="page-heading">
        <div>
          <p className="eyebrow">{t("ADMINISTRASI SURAT")}</p>
          <h1>{t("Surat Masuk")}</h1>
          <p>{t("Catat, cari, dan pantau tindak lanjut surat yang diterima kantor.")}</p>
        </div>
        <button className="primary-button mail-add" onClick={openCreate}>
          <Icon name="plus" /> {t("Tambah Surat Masuk")}
        </button>
      </div>

      <section className="mail-stats">
        <article><span>{t("Total Surat")}</span><strong>{summary.total}</strong><small>{t("Semua surat tercatat")}</small></article>
        <article><span>{t("Surat Baru")}</span><strong>{newCount}</strong><small>{t("Belum ditindaklanjuti")}</small></article>
        <article><span>{t("Diproses")}</span><strong>{processCount}</strong><small>{t("Sedang ditindaklanjuti")}</small></article>
        <article><span>{t("Selesai")}</span><strong>{completedCount}</strong><small>{t("Tindak lanjut selesai")}</small></article>
      </section>

      <section className="panel mail-table-panel">
        <div className="mail-toolbar">
          <label className="mail-search"><span><Icon name="search" /></span><input value={query} onChange={(e) => { setQuery(e.target.value); setPage(1); }} placeholder={t("Cari nomor, pengirim, atau perihal...")} /></label>
          <label className="filter-label">{t("Status")}
            <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
              {["Semua", "Baru", "Diproses", "Selesai"].map((item) => <option key={item} value={item}>{t(item)}</option>)}
            </select>
          </label>
          <button className="refresh-button" onClick={() => void loadLetters()}><Icon name="refresh" /> {t("Muat Ulang")}</button>
          <button className="export-button" onClick={() => exportToCSV(letters.map((l, i) => ({ No: (page - 1) * perPage + i + 1, "Nomor Surat": l.letterNumber, "Tanggal Surat": l.letterDate, Diterima: l.receivedDate, Pengirim: l.sender, Perihal: l.subject, Kategori: l.category, Status: l.status, Catatan: l.notes })), "surat_masuk_halaman")}><Icon name="download" /> {t("Export Halaman")}</button>
        </div>

        <div className="table-wrap">
          <table className="mail-table">
            <thead><tr><th>No.</th><th>{t("Nomor Surat")}</th><th>{t("Diterima")}</th><th>{t("Pengirim & Perihal")}</th><th>{t("Kategori")}</th><th>{t("Status")}</th><th>{t("Aksi")}</th></tr></thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="table-empty">{t("Memuat data...")}</td></tr>
              ) : letters.length === 0 ? (
                <tr><td colSpan={7} className="table-empty">{t("Belum ada surat yang sesuai.")}</td></tr>
              ) : letters.map((letter, index) => (
                <tr key={letter.id}>
                  <td>{(page - 1) * perPage + index + 1}</td>
                  <td><strong>{letter.letterNumber}</strong><small>{t("Tgl. surat")}: {letter.letterDate}</small></td>
                  <td>{letter.receivedDate}</td>
                  <td><strong>{letter.sender}</strong><small>{letter.subject}</small></td>
                  <td><span className="category-pill">{t(letter.category)}</span></td>
                  <td>
                    <select
                      aria-label={`Status ${letter.letterNumber}`}
                      className={`status-select ${letter.status.toLowerCase()}`}
                      value={letter.status}
                      onChange={(e) => void updateStatus(letter.id, e.target.value)}
                    >
                      {["Baru", "Diproses", "Selesai"].map((item) => <option key={item} value={item}>{t(item)}</option>)}
                    </select>
                  </td>
                  <td className="actions-cell">
                    <button className="action-btn edit" onClick={() => openEdit(letter)} title={t("Edit")}><Icon name="edit" size={15} /></button>
                    {currentRole === "Administrator" && <button className="action-btn delete" onClick={() => void remove(letter.id)} title={t("Hapus")}><Icon name="trash" size={15} /></button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="table-footer">{t("Menampilkan")} {letters.length} {t("dari")} {total} {t("surat")}</div>
        <Pagination currentPage={page} totalItems={total} perPage={perPage} onPageChange={setPage} />
      </section>

      {showForm && (
        <div className="modal-layer" role="presentation" onMouseDown={(e) => e.target === e.currentTarget && setShowForm(false)}>
          <section className="mail-modal" role="dialog" aria-modal="true" aria-labelledby="form-title">
            <div className="modal-heading">
              <div><p className="eyebrow">{t("FORMULIR PENCATATAN")}</p><h2 id="form-title">{t(editing ? "Edit Surat Masuk" : "Tambah Surat Masuk")}</h2></div>
              <button aria-label={t("Tutup formulir")} onClick={() => setShowForm(false)}>×</button>
            </div>
            <form onSubmit={submit}>
              <div className="form-grid">
                <label>{t("Nomor Surat")} *<input required value={form.letterNumber} onChange={(e) => setForm({ ...form, letterNumber: e.target.value })} placeholder={t("Contoh: SM-2026-08-0001")} /><AutoNumberButton documentType="incoming" date={form.receivedDate} onNumber={(letterNumber) => setForm({ ...form, letterNumber })} /></label>
                <label>{t("Kategori")}<select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>{["Umum", "Undangan", "Keuangan", "Pembangunan", "Kepegawaian"].map((item) => <option key={item} value={item}>{t(item)}</option>)}</select></label>
                <label>{t("Tanggal Surat")} *<input required type="date" value={form.letterDate} onChange={(e) => setForm({ ...form, letterDate: e.target.value })} /></label>
                <label>{t("Tanggal Diterima")} *<input required type="date" value={form.receivedDate} onChange={(e) => setForm({ ...form, receivedDate: e.target.value })} /></label>
                <label className="wide">{t("Pengirim")} *<input required value={form.sender} onChange={(e) => setForm({ ...form, sender: e.target.value })} placeholder={t("Nama instansi atau orang")} /></label>
                <label className="wide">{t("Perihal")} *<input required value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} placeholder={t("Ringkasan isi surat")} /></label>
                <label className="wide">{t("Catatan")}<textarea rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder={t("Catatan tambahan (opsional)")} /></label>
              </div>
              <div className="form-actions"><button type="button" onClick={() => setShowForm(false)}>{t("Batal")}</button><button className="save-button" disabled={saving}>{t(saving ? "Menyimpan..." : editing ? "Perbarui Surat" : "Simpan Surat")}</button></div>
            </form>
          </section>
        </div>
      )}
      <ToastContainer toasts={toasts} dismiss={dismiss} />
    </div>
  );
}
