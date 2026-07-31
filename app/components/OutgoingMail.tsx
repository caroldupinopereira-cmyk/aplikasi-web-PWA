"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

type Letter = {
  id: number;
  letterNumber: string;
  letterDate: string;
  recipient: string;
  subject: string;
  category: string;
  signatory: string;
  deliveryMethod: string;
  status: string;
  notes: string;
};

const blankForm = {
  letterNumber: "",
  letterDate: "2026-07-31",
  recipient: "",
  subject: "",
  category: "Umum",
  signatory: "",
  deliveryMethod: "Diantar",
  notes: "",
};

const statuses = ["Draf", "Menunggu Persetujuan", "Disetujui", "Terkirim"];

export default function OutgoingMail() {
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
      const response = await fetch("/api/outgoing-letters");
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
      const matchesText = [letter.letterNumber, letter.recipient, letter.subject]
        .some((value) => value.toLowerCase().includes(text));
      return matchesText && (status === "Semua" || letter.status === status);
    });
  }, [letters, query, status]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    try {
      const response = await fetch("/api/outgoing-letters", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Gagal menyimpan surat.");
      setLetters((old) => [data.letter, ...old]);
      setForm(blankForm);
      setShowForm(false);
      setMessage("Surat keluar berhasil disimpan sebagai draf.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Gagal menyimpan surat.");
    } finally {
      setSaving(false);
    }
  }

  async function updateStatus(id: number, nextStatus: string) {
    const response = await fetch("/api/outgoing-letters", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status: nextStatus }),
    });
    if (response.ok) {
      setLetters((old) => old.map((item) => item.id === id ? { ...item, status: nextStatus } : item));
    }
  }

  const count = (value: string) => letters.filter((letter) => letter.status === value).length;

  return (
    <div className="page mail-page outgoing-page">
      <div className="page-heading">
        <div>
          <p className="eyebrow">ADMINISTRASI SURAT</p>
          <h1>Surat Keluar</h1>
          <p>Buat, periksa, setujui, dan pantau pengiriman surat resmi kantor.</p>
        </div>
        <button className="primary-button mail-add" onClick={() => setShowForm(true)}>
          <span>＋</span> Buat Surat Keluar
        </button>
      </div>

      <section className="mail-stats outgoing-stats">
        <article><span>Total Surat</span><strong>{letters.length}</strong><small>Semua surat tercatat</small></article>
        <article><span>Draf</span><strong>{count("Draf")}</strong><small>Masih disiapkan</small></article>
        <article><span>Menunggu Persetujuan</span><strong>{count("Menunggu Persetujuan")}</strong><small>Perlu diperiksa pimpinan</small></article>
        <article><span>Terkirim</span><strong>{count("Terkirim")}</strong><small>Telah dikirimkan</small></article>
      </section>

      {message && <div className="mail-message">{message}<button onClick={() => setMessage("")}>×</button></div>}

      <section className="panel mail-table-panel">
        <div className="mail-toolbar">
          <label className="mail-search"><span>⌕</span><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Cari nomor, tujuan, atau perihal..." /></label>
          <label className="filter-label">Status
            <select value={status} onChange={(e) => setStatus(e.target.value)}>
              <option>Semua</option>{statuses.map((item) => <option key={item}>{item}</option>)}
            </select>
          </label>
          <button className="refresh-button" onClick={() => void loadLetters()}>↻ Muat Ulang</button>
        </div>

        <div className="table-wrap">
          <table className="mail-table outgoing-table">
            <thead><tr><th>No.</th><th>Nomor & Tanggal</th><th>Tujuan & Perihal</th><th>Penandatangan</th><th>Pengiriman</th><th>Status</th></tr></thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="table-empty">Memuat data...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={6} className="table-empty">Belum ada surat keluar yang sesuai.</td></tr>
              ) : filtered.map((letter, index) => (
                <tr key={letter.id}>
                  <td>{index + 1}</td>
                  <td><strong>{letter.letterNumber}</strong><small>{letter.letterDate} • {letter.category}</small></td>
                  <td><strong>{letter.recipient}</strong><small>{letter.subject}</small></td>
                  <td>{letter.signatory}</td>
                  <td><span className="category-pill">{letter.deliveryMethod}</span></td>
                  <td>
                    <select
                      aria-label={`Status ${letter.letterNumber}`}
                      className={`status-select status-${letter.status.toLowerCase().replaceAll(" ", "-")}`}
                      value={letter.status}
                      onChange={(e) => void updateStatus(letter.id, e.target.value)}
                    >
                      {statuses.map((item) => <option key={item}>{item}</option>)}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="table-footer">Menampilkan {filtered.length} dari {letters.length} surat keluar</div>
      </section>

      {showForm && (
        <div className="modal-layer" role="presentation" onMouseDown={(e) => e.target === e.currentTarget && setShowForm(false)}>
          <section className="mail-modal" role="dialog" aria-modal="true" aria-labelledby="outgoing-form-title">
            <div className="modal-heading">
              <div><p className="eyebrow">FORMULIR SURAT KELUAR</p><h2 id="outgoing-form-title">Buat Surat Keluar</h2></div>
              <button aria-label="Tutup formulir" onClick={() => setShowForm(false)}>×</button>
            </div>
            <form onSubmit={submit}>
              <div className="form-grid">
                <label>Nomor Surat *<input required value={form.letterNumber} onChange={(e) => setForm({ ...form, letterNumber: e.target.value })} placeholder="Contoh: 055/PA/VII/2026" /></label>
                <label>Tanggal Surat *<input required type="date" value={form.letterDate} onChange={(e) => setForm({ ...form, letterDate: e.target.value })} /></label>
                <label>Kategori<select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}><option>Umum</option><option>Undangan</option><option>Keuangan</option><option>Pembangunan</option><option>Kepegawaian</option></select></label>
                <label>Cara Pengiriman<select value={form.deliveryMethod} onChange={(e) => setForm({ ...form, deliveryMethod: e.target.value })}><option>Diantar</option><option>Email</option><option>Pos</option><option>Diambil</option></select></label>
                <label className="wide">Tujuan/Penerima *<input required value={form.recipient} onChange={(e) => setForm({ ...form, recipient: e.target.value })} placeholder="Nama instansi atau penerima" /></label>
                <label className="wide">Perihal *<input required value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} placeholder="Ringkasan tujuan surat" /></label>
                <label className="wide">Penandatangan *<input required value={form.signatory} onChange={(e) => setForm({ ...form, signatory: e.target.value })} placeholder="Nama dan jabatan penandatangan" /></label>
                <label className="wide">Catatan<textarea rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Catatan internal (opsional)" /></label>
              </div>
              <div className="form-actions"><button type="button" onClick={() => setShowForm(false)}>Batal</button><button className="save-button" disabled={saving}>{saving ? "Menyimpan..." : "Simpan sebagai Draf"}</button></div>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}
