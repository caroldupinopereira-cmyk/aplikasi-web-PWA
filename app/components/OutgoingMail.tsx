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
  letterDate: string;
  recipient: string;
  subject: string;
  category: string;
  signatory: string;
  deliveryMethod: string;
  status: string;
  notes: string;
  approvalNote: string;
  approvedBy: string | null;
  approvedAt: string | null;
};

const blankForm = {
  letterNumber: "",
  letterDate: new Date().toISOString().slice(0, 10),
  recipient: "",
  subject: "",
  category: "Umum",
  signatory: "",
  deliveryMethod: "Diantar",
  notes: "",
};

const statuses = ["Draf", "Menunggu Persetujuan", "Disetujui", "Ditolak", "Terkirim"];

export default function OutgoingMail({ initialOpenCreate = false }: { initialOpenCreate?: boolean }) {
  const { t } = useLanguage();
  const [letters, setLetters] = useState<Letter[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(initialOpenCreate);
  const [editing, setEditing] = useState<Letter | null>(null);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("Semua");
  const [form, setForm] = useState(blankForm);
  const [saving, setSaving] = useState(false);
  const [currentRole, setCurrentRole] = useState("");
  const { toasts, addToast, dismiss } = useToast();
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [summary, setSummary] = useState({ total: 0, draft: 0, pending: 0, sent: 0 });
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
      const response = await fetch(`/api/outgoing-letters?${params}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Gagal memuat data.");
      setLetters(data.letters);
      setCurrentRole(data.currentUser?.role ?? "");
      setTotal(data.pagination.total);
      setSummary(data.summary);
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
      letterDate: letter.letterDate,
      recipient: letter.recipient,
      subject: letter.subject,
      category: letter.category,
      signatory: letter.signatory,
      deliveryMethod: letter.deliveryMethod,
      notes: letter.notes,
    });
    setShowForm(true);
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    try {
      if (editing) {
        const response = await fetch("/api/outgoing-letters", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: editing.id, ...form }),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Gagal memperbarui surat.");
        await loadLetters();
        addToast(t("Surat keluar berhasil diperbarui."), "success");
      } else {
        const response = await fetch("/api/outgoing-letters", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Gagal menyimpan surat.");
        setPage(1);
        await loadLetters();
        addToast(t("Surat keluar berhasil disimpan sebagai draf."), "success");
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
    if (!confirm(t("Hapus surat keluar ini? Tindakan ini tidak dapat dibatalkan."))) return;
    try {
      const response = await fetch("/api/outgoing-letters", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (!response.ok) throw new Error("Gagal menghapus surat.");
      await loadLetters();
      addToast(t("Surat keluar berhasil dihapus."), "success");
    } catch (error) {
      addToast(t(error instanceof Error ? error.message : "Gagal menghapus surat."), "error");
    }
  }

  async function updateStatus(id: number, nextStatus: string) {
    let approvalNote = "";
    if (nextStatus === "Ditolak") {
      approvalNote = prompt(t("Masukkan alasan penolakan surat:"))?.trim() ?? "";
      if (!approvalNote) {
        addToast(t("Penolakan dibatalkan karena catatan belum diisi."), "error");
        return;
      }
    }
    const response = await fetch("/api/outgoing-letters", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status: nextStatus, approvalNote }),
    });
    const data = await response.json();
    if (!response.ok) return addToast(data.error || t("Status belum dapat diubah."), "error");
    await loadLetters();
    addToast(`${t("Status surat berubah menjadi")} ${t(nextStatus)}.`, "success");
  }

  function statusActions(letter: Letter) {
    if (["Draf", "Ditolak"].includes(letter.status)) {
      return [{ label: "Ajukan", status: "Menunggu Persetujuan" }];
    }
    if (
      letter.status === "Menunggu Persetujuan" &&
      ["Administrator", "Pimpinan"].includes(currentRole)
    ) {
      return [
        { label: "Setujui", status: "Disetujui" },
        { label: "Tolak", status: "Ditolak" },
      ];
    }
    if (letter.status === "Disetujui") {
      return [{ label: "Tandai Terkirim", status: "Terkirim" }];
    }
    return [];
  }

  return (
    <div className="page mail-page outgoing-page">
      <div className="page-heading">
        <div>
          <p className="eyebrow">{t("ADMINISTRASI SURAT")}</p>
          <h1>{t("Surat Keluar")}</h1>
          <p>{t("Buat, periksa, setujui, dan pantau pengiriman surat resmi kantor.")}</p>
        </div>
        <button className="primary-button mail-add" onClick={openCreate}>
          <Icon name="plus" /> {t("Buat Surat Keluar")}
        </button>
      </div>

      <section className="mail-stats outgoing-stats">
        <article><span>{t("Total Surat")}</span><strong>{summary.total}</strong><small>{t("Semua surat tercatat")}</small></article>
        <article><span>{t("Draf")}</span><strong>{summary.draft}</strong><small>{t("Masih disiapkan")}</small></article>
        <article><span>{t("Menunggu Persetujuan")}</span><strong>{summary.pending}</strong><small>{t("Perlu diperiksa pimpinan")}</small></article>
        <article><span>{t("Terkirim")}</span><strong>{summary.sent}</strong><small>{t("Telah dikirimkan")}</small></article>
      </section>

      <section className="panel mail-table-panel">
        <div className="mail-toolbar">
          <label className="mail-search"><span><Icon name="search" /></span><input value={query} onChange={(e) => { setQuery(e.target.value); setPage(1); }} placeholder={t("Cari nomor, tujuan, atau perihal...")} /></label>
          <label className="filter-label">{t("Status")}
            <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
              <option value="Semua">{t("Semua")}</option>{statuses.map((item) => <option key={item} value={item}>{t(item)}</option>)}
            </select>
          </label>
          <button className="refresh-button" onClick={() => void loadLetters()}><Icon name="refresh" /> {t("Muat Ulang")}</button>
          <button className="export-button" onClick={() => exportToCSV(letters.map((l, i) => ({ No: (page - 1) * perPage + i + 1, "Nomor Surat": l.letterNumber, Tanggal: l.letterDate, Tujuan: l.recipient, Perihal: l.subject, Kategori: l.category, Penandatangan: l.signatory, Pengiriman: l.deliveryMethod, Status: l.status, Catatan: l.notes })), "surat_keluar_halaman")}><Icon name="download" /> {t("Export Halaman")}</button>
        </div>

        <div className="table-wrap">
          <table className="mail-table outgoing-table">
            <thead><tr><th>No.</th><th>{t("Nomor & Tanggal")}</th><th>{t("Tujuan & Perihal")}</th><th>{t("Penandatangan")}</th><th>{t("Pengiriman")}</th><th>{t("Status")}</th><th>{t("Aksi")}</th></tr></thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="table-empty">{t("Memuat data...")}</td></tr>
              ) : letters.length === 0 ? (
                <tr><td colSpan={7} className="table-empty">{t("Belum ada surat keluar yang sesuai.")}</td></tr>
              ) : letters.map((letter, index) => (
                <tr key={letter.id}>
                  <td>{(page - 1) * perPage + index + 1}</td>
                  <td><strong>{letter.letterNumber}</strong><small>{letter.letterDate} • {t(letter.category)}</small></td>
                  <td><strong>{letter.recipient}</strong><small>{letter.subject}</small></td>
                  <td>{letter.signatory}</td>
                  <td><span className="category-pill">{t(letter.deliveryMethod)}</span></td>
                  <td>
                    <span className={`status-select status-${letter.status.toLowerCase().replaceAll(" ", "-")}`}>{t(letter.status)}</span>
                    {letter.approvalNote && <small title={letter.approvalNote}>{t("Catatan")}: {letter.approvalNote}</small>}
                  </td>
                  <td className="actions-cell">
                    {statusActions(letter).map((action) => <button key={action.status} className="approval-action" onClick={() => void updateStatus(letter.id, action.status)}>{t(action.label)}</button>)}
                    {["Draf", "Ditolak"].includes(letter.status) && <button className="action-btn edit" onClick={() => openEdit(letter)} title={t("Edit")}><Icon name="edit" size={15} /></button>}
                    {currentRole === "Administrator" && <button className="action-btn delete" onClick={() => void remove(letter.id)} title={t("Hapus")}><Icon name="trash" size={15} /></button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="table-footer">{t("Menampilkan")} {letters.length} {t("dari")} {total} {t("surat keluar")}</div>
        <Pagination currentPage={page} totalItems={total} perPage={perPage} onPageChange={setPage} />
      </section>

      {showForm && (
        <div className="modal-layer" role="presentation" onMouseDown={(e) => e.target === e.currentTarget && setShowForm(false)}>
          <section className="mail-modal" role="dialog" aria-modal="true" aria-labelledby="outgoing-form-title">
            <div className="modal-heading">
              <div><p className="eyebrow">{t("FORMULIR SURAT KELUAR")}</p><h2 id="outgoing-form-title">{t(editing ? "Edit Surat Keluar" : "Buat Surat Keluar")}</h2></div>
              <button aria-label={t("Tutup formulir")} onClick={() => setShowForm(false)}>×</button>
            </div>
            <form onSubmit={submit}>
              <div className="form-grid">
                <label>{t("Nomor Surat")} *<input required value={form.letterNumber} onChange={(e) => setForm({ ...form, letterNumber: e.target.value })} placeholder={t("Contoh: SK-2026-08-0001")} /><AutoNumberButton documentType="outgoing" date={form.letterDate} onNumber={(letterNumber) => setForm({ ...form, letterNumber })} /></label>
                <label>{t("Tanggal Surat")} *<input required type="date" value={form.letterDate} onChange={(e) => setForm({ ...form, letterDate: e.target.value })} /></label>
                <label>{t("Kategori")}<select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>{["Umum", "Undangan", "Keuangan", "Pembangunan", "Kepegawaian"].map((item) => <option key={item} value={item}>{t(item)}</option>)}</select></label>
                <label>{t("Cara Pengiriman")}<select value={form.deliveryMethod} onChange={(e) => setForm({ ...form, deliveryMethod: e.target.value })}>{["Diantar", "Email", "Pos", "Diambil"].map((item) => <option key={item} value={item}>{t(item)}</option>)}</select></label>
                <label className="wide">{t("Tujuan/Penerima")} *<input required value={form.recipient} onChange={(e) => setForm({ ...form, recipient: e.target.value })} placeholder={t("Nama instansi atau penerima")} /></label>
                <label className="wide">{t("Perihal")} *<input required value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} placeholder={t("Ringkasan tujuan surat")} /></label>
                <label className="wide">{t("Penandatangan")} *<input required value={form.signatory} onChange={(e) => setForm({ ...form, signatory: e.target.value })} placeholder={t("Nama dan jabatan penandatangan")} /></label>
                <label className="wide">{t("Catatan")}<textarea rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder={t("Catatan internal (opsional)")} /></label>
              </div>
              <div className="form-actions"><button type="button" onClick={() => setShowForm(false)}>{t("Batal")}</button><button className="save-button" disabled={saving}>{t(saving ? "Menyimpan..." : editing ? "Perbarui Surat" : "Simpan sebagai Draf")}</button></div>
            </form>
          </section>
        </div>
      )}
      <ToastContainer toasts={toasts} dismiss={dismiss} />
    </div>
  );
}
