"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

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
  receivedDate: "2026-07-31",
  letterDate: "2026-07-31",
  sender: "",
  subject: "",
  category: "Umum",
  notes: "",
};

export default function IncomingMail() {
  const [letters, setLetters] = useState<Letter[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("Semua");
  const [form, setForm] = useState(blankForm);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  async function loadLetters() {
    setLoading(true);
    try {
      const response = await fetch("/api/incoming-letters");
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Gagal memuat data.");
      setLetters(data.letters);
    } catch {
      setMessage("Database sedang disiapkan. Coba muat ulang beberapa saat lagi.");
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

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    try {
      const response = await fetch("/api/incoming-letters", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Gagal menyimpan surat.");
      setLetters((old) => [data.letter, ...old]);
      setForm(blankForm);
      setShowForm(false);
      setMessage("Surat masuk berhasil disimpan.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Gagal menyimpan surat.");
    } finally {
      setSaving(false);
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
        <button className="primary-button mail-add" onClick={() => setShowForm(true)}>
          <span>＋</span> Tambah Surat Masuk
        </button>
      </div>

      <section className="mail-stats">
        <article><span>Total Surat</span><strong>{letters.length}</strong><small>Semua surat tercatat</small></article>
        <article><span>Surat Baru</span><strong>{newCount}</strong><small>Belum ditindaklanjuti</small></article>
        <article><span>Diproses</span><strong>{processCount}</strong><small>Sedang ditindaklanjuti</small></article>
        <article><span>Selesai</span><strong>{completedCount}</strong><small>Tindak lanjut selesai</small></article>
      </section>

      {message && <div className="mail-message">{message}<button onClick={() => setMessage("")}>×</button></div>}

      <section className="panel mail-table-panel">
        <div className="mail-toolbar">
          <label className="mail-search"><span>⌕</span><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Cari nomor, pengirim, atau perihal..." /></label>
          <label className="filter-label">Status
            <select value={status} onChange={(e) => setStatus(e.target.value)}>
              <option>Semua</option><option>Baru</option><option>Diproses</option><option>Selesai</option>
            </select>
          </label>
          <button className="refresh-button" onClick={() => void loadLetters()}>↻ Muat Ulang</button>
        </div>

        <div className="table-wrap">
          <table className="mail-table">
            <thead><tr><th>No.</th><th>Nomor Surat</th><th>Diterima</th><th>Pengirim & Perihal</th><th>Kategori</th><th>Status</th></tr></thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="table-empty">Memuat data...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={6} className="table-empty">Belum ada surat yang sesuai.</td></tr>
              ) : filtered.map((letter, index) => (
                <tr key={letter.id}>
                  <td>{index + 1}</td>
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
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="table-footer">Menampilkan {filtered.length} dari {letters.length} surat</div>
      </section>

      {showForm && (
        <div className="modal-layer" role="presentation" onMouseDown={(e) => e.target === e.currentTarget && setShowForm(false)}>
          <section className="mail-modal" role="dialog" aria-modal="true" aria-labelledby="form-title">
            <div className="modal-heading">
              <div><p className="eyebrow">FORMULIR PENCATATAN</p><h2 id="form-title">Tambah Surat Masuk</h2></div>
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
              <div className="form-actions"><button type="button" onClick={() => setShowForm(false)}>Batal</button><button className="save-button" disabled={saving}>{saving ? "Menyimpan..." : "Simpan Surat"}</button></div>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}
