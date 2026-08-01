"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Pagination from "./Pagination";
import { exportToCSV } from "../utils/export";
import { useToast, ToastContainer } from "./Toast";

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
  const perPage = 15;

  async function loadLetters() {
    setLoading(true);
    try {
      const response = await fetch("/api/incoming-letters");
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Gagal memuat data.");
      setLetters(data.letters);
    } catch {
      addToast("Database sedang disiapkan. Coba muat ulang beberapa saat lagi.", "error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void loadLetters(); }, []);

  const filtered = useMemo(() => {
    const text = query.toLowerCase();
    return letters.filter((letter) => {
      const matchesText = [letter.letterNumber, letter.sender, letter.subject]
        .some((value) => value.toLowerCase().includes(text));
      return matchesText && (status === "Semua" || letter.status === status);
    });
  }, [letters, query, status]);

  const paged = useMemo(() => {
    const start = (page - 1) * perPage;
    return filtered.slice(start, start + perPage);
  }, [filtered, page]);

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
        setLetters((old) => old.map((item) => item.id === editing.id ? { ...item, ...data.letter } : item));
        addToast("Surat masuk berhasil diperbarui.", "success");
      } else {
        const response = await fetch("/api/incoming-letters", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Gagal menyimpan surat.");
        setLetters((old) => [data.letter, ...old]);
        addToast("Surat masuk berhasil disimpan.", "success");
      }
      setForm(blankForm);
      setEditing(null);
      setShowForm(false);
    } catch (error) {
      addToast(error instanceof Error ? error.message : "Gagal menyimpan surat.", "error");
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: number) {
    if (!confirm("Hapus surat ini? Tindakan ini tidak dapat dibatalkan.")) return;
    try {
      const response = await fetch("/api/incoming-letters", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (!response.ok) throw new Error("Gagal menghapus surat.");
      setLetters((old) => old.filter((item) => item.id !== id));
      addToast("Surat berhasil dihapus.", "success");
    } catch (error) {
      addToast(error instanceof Error ? error.message : "Gagal menghapus surat.", "error");
    }
  }

  async function updateStatus(id: number, nextStatus: string) {
    const response = await fetch("/api/incoming-letters", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status: nextStatus }),
    });
    if (response.ok) {
      setLetters((old) => old.map((item) => item.id === id ? { ...item, status: nextStatus } : item));
    }
  }

  const newCount = letters.filter((letter) => letter.status === "Baru").length;
  const processCount = letters.filter((letter) => letter.status === "Diproses").length;
  const completedCount = letters.filter((letter) => letter.status === "Selesai").length;

  return (
    <div className="page mail-page">
      <div className="page-heading">
        <div>
          <p className="eyebrow">ADMINISTRASI SURAT</p>
          <h1>Surat Masuk</h1>
          <p>Catat, cari, dan pantau tindak lanjut surat yang diterima kantor.</p>
        </div>
        <button className="primary-button mail-add" onClick={openCreate}>
          <span>＋</span> Tambah Surat Masuk
        </button>
      </div>

      <section className="mail-stats">
        <article><span>Total Surat</span><strong>{letters.length}</strong><small>Semua surat tercatat</small></article>
        <article><span>Surat Baru</span><strong>{newCount}</strong><small>Belum ditindaklanjuti</small></article>
        <article><span>Diproses</span><strong>{processCount}</strong><small>Sedang ditindaklanjuti</small></article>
        <article><span>Selesai</span><strong>{completedCount}</strong><small>Tindak lanjut selesai</small></article>
      </section>

      <section className="panel mail-table-panel">
        <div className="mail-toolbar">
          <label className="mail-search"><span>⌕</span><input value={query} onChange={(e) => { setQuery(e.target.value); setPage(1); }} placeholder="Cari nomor, pengirim, atau perihal..." /></label>
          <label className="filter-label">Status
            <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
              <option>Semua</option><option>Baru</option><option>Diproses</option><option>Selesai</option>
            </select>
          </label>
          <button className="refresh-button" onClick={() => void loadLetters()}>↻ Muat Ulang</button>
          <button className="export-button" onClick={() => exportToCSV(filtered.map((l, i) => ({ No: i + 1, "Nomor Surat": l.letterNumber, "Tanggal Surat": l.letterDate, Diterima: l.receivedDate, Pengirim: l.sender, Perihal: l.subject, Kategori: l.category, Status: l.status, Catatan: l.notes })), "surat_masuk")}>↓ Export CSV</button>
        </div>

        <div className="table-wrap">
          <table className="mail-table">
            <thead><tr><th>No.</th><th>Nomor Surat</th><th>Diterima</th><th>Pengirim & Perihal</th><th>Kategori</th><th>Status</th><th>Aksi</th></tr></thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="table-empty">Memuat data...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={7} className="table-empty">Belum ada surat yang sesuai.</td></tr>
              ) : paged.map((letter, index) => (
                <tr key={letter.id}>
                  <td>{(page - 1) * perPage + index + 1}</td>
                  <td><strong>{letter.letterNumber}</strong><small>Tgl. surat: {letter.letterDate}</small></td>
                  <td>{letter.receivedDate}</td>
                  <td><strong>{letter.sender}</strong><small>{letter.subject}</small></td>
                  <td><span className="category-pill">{letter.category}</span></td>
                  <td>
                    <select
                      aria-label={`Status ${letter.letterNumber}`}
                      className={`status-select ${letter.status.toLowerCase()}`}
                      value={letter.status}
                      onChange={(e) => void updateStatus(letter.id, e.target.value)}
                    >
                      <option>Baru</option><option>Diproses</option><option>Selesai</option>
                    </select>
                  </td>
                  <td className="actions-cell">
                    <button className="action-btn edit" onClick={() => openEdit(letter)} title="Edit">✎</button>
                    <button className="action-btn delete" onClick={() => void remove(letter.id)} title="Hapus">✕</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="table-footer">Menampilkan {paged.length} dari {filtered.length} surat</div>
        <Pagination currentPage={page} totalItems={filtered.length} perPage={perPage} onPageChange={setPage} />
      </section>

      {showForm && (
        <div className="modal-layer" role="presentation" onMouseDown={(e) => e.target === e.currentTarget && setShowForm(false)}>
          <section className="mail-modal" role="dialog" aria-modal="true" aria-labelledby="form-title">
            <div className="modal-heading">
              <div><p className="eyebrow">FORMULIR PENCATATAN</p><h2 id="form-title">{editing ? "Edit Surat Masuk" : "Tambah Surat Masuk"}</h2></div>
              <button aria-label="Tutup formulir" onClick={() => setShowForm(false)}>×</button>
            </div>
            <form onSubmit={submit}>
              <div className="form-grid">
                <label>Nomor Surat *<input required value={form.letterNumber} onChange={(e) => setForm({ ...form, letterNumber: e.target.value })} placeholder="Contoh: 124/AM/VII/2026" /></label>
                <label>Kategori<select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}><option>Umum</option><option>Undangan</option><option>Keuangan</option><option>Pembangunan</option><option>Kepegawaian</option></select></label>
                <label>Tanggal Surat *<input required type="date" value={form.letterDate} onChange={(e) => setForm({ ...form, letterDate: e.target.value })} /></label>
                <label>Tanggal Diterima *<input required type="date" value={form.receivedDate} onChange={(e) => setForm({ ...form, receivedDate: e.target.value })} /></label>
                <label className="wide">Pengirim *<input required value={form.sender} onChange={(e) => setForm({ ...form, sender: e.target.value })} placeholder="Nama instansi atau orang" /></label>
                <label className="wide">Perihal *<input required value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} placeholder="Ringkasan isi surat" /></label>
                <label className="wide">Catatan<textarea rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Catatan tambahan (opsional)" /></label>
              </div>
              <div className="form-actions"><button type="button" onClick={() => setShowForm(false)}>Batal</button><button className="save-button" disabled={saving}>{saving ? "Menyimpan..." : editing ? "Perbarui Surat" : "Simpan Surat"}</button></div>
            </form>
          </section>
        </div>
      )}
      <ToastContainer toasts={toasts} dismiss={dismiss} />
    </div>
  );
}
