"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import Pagination from "./Pagination";
import { exportToCSV } from "../utils/export";
import { useToast, ToastContainer } from "./Toast";
import { useLanguage } from "./LanguageProvider";
import Icon from "./Icon";

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
  dataQuality: { complete: boolean; missingFields: string[]; percent: number };
};

const blankForm = {
  recordNumber: "", fullName: "", gender: "Laki-laki", birthDate: new Date().toISOString().slice(0, 10),
  suco: "", aldeia: "", householdNumber: "", isHouseholdHead: false,
  maritalStatus: "Belum Menikah", occupation: "",
};

function ageFrom(date: string) {
  const birth = new Date(date);
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  if (now < new Date(now.getFullYear(), birth.getMonth(), birth.getDate())) age--;
  return age;
}

export default function ResidentData({ initialOpenCreate = false }: { initialOpenCreate?: boolean }) {
  const { t } = useLanguage();
  const [records, setRecords] = useState<Resident[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(initialOpenCreate);
  const [editing, setEditing] = useState<Resident | null>(null);
  const [query, setQuery] = useState("");
  const [sucoFilter, setSucoFilter] = useState("Semua");
  const [form, setForm] = useState(blankForm);
  const [saving, setSaving] = useState(false);
  const { toasts, addToast, dismiss } = useToast();
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [sucos, setSucos] = useState<string[]>([]);
  const [summary, setSummary] = useState({ total: 0, male: 0, female: 0, households: 0, incomplete: 0 });
  const [currentRole, setCurrentRole] = useState("");
  const perPage = 15;

  const loadRecords = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        perPage: String(perPage),
        q: query,
        suco: sucoFilter,
      });
      const response = await fetch(`/api/residents?${params}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Gagal memuat data.");
      setRecords(data.residents);
      setTotal(data.pagination.total);
      setSucos(data.filters.sucos);
      setSummary(data.summary);
      setCurrentRole(data.currentUser?.role ?? "");
    } catch {
      addToast(t("Database sedang disiapkan. Coba muat ulang beberapa saat lagi."), "error");
    } finally {
      setLoading(false);
    }
  }, [addToast, page, query, sucoFilter, t]);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadRecords(), 300);
    return () => window.clearTimeout(timer);
  }, [loadRecords]);

  function openCreate() {
    setEditing(null);
    setForm(blankForm);
    setPage(1);
    setShowForm(true);
  }

  function openEdit(resident: Resident) {
    setEditing(resident);
    setForm({
      recordNumber: resident.recordNumber,
      fullName: resident.fullName,
      gender: resident.gender,
      birthDate: resident.birthDate,
      suco: resident.suco,
      aldeia: resident.aldeia,
      householdNumber: resident.householdNumber,
      isHouseholdHead: resident.isHouseholdHead,
      maritalStatus: resident.maritalStatus,
      occupation: resident.occupation,
    });
    setShowForm(true);
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    try {
      if (editing) {
        const response = await fetch("/api/residents", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: editing.id, ...form }),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Gagal memperbarui data.");
        await loadRecords();
        addToast(t("Data penduduk berhasil diperbarui."), "success");
      } else {
        const response = await fetch("/api/residents", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Gagal menyimpan data.");
        setPage(1);
        await loadRecords();
        addToast(t("Data penduduk berhasil disimpan."), "success");
      }
      setForm(blankForm);
      setEditing(null);
      setShowForm(false);
    } catch (error) {
      addToast(t(error instanceof Error ? error.message : "Gagal menyimpan data."), "error");
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: number) {
    if (!confirm(t("Hapus data penduduk ini? Tindakan ini tidak dapat dibatalkan."))) return;
    try {
      const response = await fetch("/api/residents", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (!response.ok) throw new Error("Gagal menghapus data.");
      await loadRecords();
      addToast(t("Data penduduk berhasil dihapus."), "success");
    } catch (error) {
      addToast(t(error instanceof Error ? error.message : "Gagal menghapus data."), "error");
    }
  }

  return (
    <div className="page mail-page resident-page">
      <div className="page-heading">
        <div><p className="eyebrow">{t("DATA WILAYAH")}</p><h1>{t("Data Penduduk")}</h1><p>{t("Kelola data penduduk berdasarkan suco, aldeia, dan keluarga.")}</p></div>
        <button className="primary-button mail-add" onClick={openCreate}><Icon name="plus" /> {t("Tambah Penduduk")}</button>
      </div>

      <section className="mail-stats resident-stats">
        <article><span>{t("Total Penduduk")}</span><strong>{summary.total}</strong><small>{t("Data yang telah tercatat")}</small></article>
        <article><span>{t("Laki-laki")}</span><strong>{summary.male}</strong><small>{summary.total ? Math.round(summary.male / summary.total * 100) : 0}% {t("dari total")}</small></article>
        <article><span>{t("Perempuan")}</span><strong>{summary.female}</strong><small>{summary.total ? Math.round(summary.female / summary.total * 100) : 0}% {t("dari total")}</small></article>
        <article><span>{t("Kepala Keluarga")}</span><strong>{summary.households}</strong><small>{t("Nomor keluarga unik")}</small></article>
      </section>

      <div className="privacy-note"><span>!</span><p><strong>{t("Kualitas data")}:</strong> {summary.incomplete} {t("data belum memiliki informasi pekerjaan. Gunakan data contoh sampai backup selesai disiapkan.")}</p></div>
      <section className="panel mail-table-panel">
        <div className="mail-toolbar">
          <label className="mail-search"><span><Icon name="search" /></span><input value={query} onChange={(e) => { setQuery(e.target.value); setPage(1); }} placeholder={t("Cari nama, nomor, aldeia, atau keluarga...")} /></label>
          <label className="filter-label">Suco
            <select value={sucoFilter} onChange={(e) => { setSucoFilter(e.target.value); setPage(1); }}><option value="Semua">{t("Semua")}</option>{sucos.map((s) => <option key={s}>{s}</option>)}</select>
          </label>
          <button className="refresh-button" onClick={() => void loadRecords()}><Icon name="refresh" /> {t("Muat Ulang")}</button>
          <button className="export-button" onClick={() => exportToCSV(records.map((r, i) => ({ No: (page - 1) * perPage + i + 1, "Nomor Data": r.recordNumber, Nama: r.fullName, "Jenis Kelamin": r.gender, "Tanggal Lahir": r.birthDate, Suco: r.suco, Aldeia: r.aldeia, "Nomor Keluarga": r.householdNumber, "Kepala Keluarga": r.isHouseholdHead ? "Ya" : "Tidak", "Status Kawin": r.maritalStatus, Pekerjaan: r.occupation })), "data_penduduk_halaman")}><Icon name="download" /> {t("Export Halaman")}</button>
        </div>
        <div className="table-wrap">
          <table className="mail-table resident-table">
            <thead><tr><th>No.</th><th>{t("Penduduk")}</th><th>{t("Jenis Kelamin/Umur")}</th><th>{t("Wilayah")}</th><th>{t("Keluarga")}</th><th>{t("Pekerjaan")}</th><th>{t("Aksi")}</th></tr></thead>
            <tbody>
              {loading ? <tr><td colSpan={7} className="table-empty">{t("Memuat data...")}</td></tr> :
                records.length === 0 ? <tr><td colSpan={7} className="table-empty">{t("Belum ada data penduduk yang sesuai.")}</td></tr> :
                records.map((r, index) => <tr key={r.id}>
                  <td>{(page - 1) * perPage + index + 1}</td>
                  <td><strong>{r.fullName}</strong><small>{r.recordNumber}</small><span className={r.dataQuality.complete ? "quality-badge complete" : "quality-badge"} title={r.dataQuality.missingFields.map(t).join(", ")}>{r.dataQuality.percent}% {t("lengkap")}</span></td>
                  <td><strong>{t(r.gender)}</strong><small>{ageFrom(r.birthDate)} {t("tahun")} • {t(r.maritalStatus)}</small></td>
                  <td><strong>{r.suco}</strong><small>Aldeia {r.aldeia}</small></td>
                  <td><strong>{r.householdNumber}</strong><small>{t(r.isHouseholdHead ? "Kepala keluarga" : "Anggota keluarga")}</small></td>
                  <td>{r.occupation || "—"}</td>
                  <td className="actions-cell">
                    <button className="action-btn edit" onClick={() => openEdit(r)} title={t("Edit")}><Icon name="edit" size={15} /></button>
                    {currentRole === "Administrator" && <button className="action-btn delete" onClick={() => void remove(r.id)} title={t("Hapus")}><Icon name="trash" size={15} /></button>}
                  </td>
                </tr>)}
            </tbody>
          </table>
        </div>
        <div className="table-footer">{t("Menampilkan")} {records.length} {t("dari")} {total} {t("penduduk")}</div>
        <Pagination currentPage={page} totalItems={total} perPage={perPage} onPageChange={setPage} />
      </section>

      {showForm && <div className="modal-layer" role="presentation" onMouseDown={(e) => e.target === e.currentTarget && setShowForm(false)}>
        <section className="mail-modal" role="dialog" aria-modal="true" aria-labelledby="resident-form-title">
          <div className="modal-heading"><div><p className="eyebrow">{t("FORMULIR PENDUDUK")}</p><h2 id="resident-form-title">{t(editing ? "Edit Data Penduduk" : "Tambah Data Penduduk")}</h2></div><button aria-label={t("Tutup formulir")} onClick={() => setShowForm(false)}>×</button></div>
          <form onSubmit={submit}><div className="form-grid">
            <label>{t("Nomor Data")} *<input required value={form.recordNumber} onChange={(e) => setForm({ ...form, recordNumber: e.target.value })} placeholder={t("Contoh: PDT-2026-001")} /></label>
            <label>{t("Nomor Keluarga")} *<input required value={form.householdNumber} onChange={(e) => setForm({ ...form, householdNumber: e.target.value })} placeholder={t("Contoh: KK-2026-001")} /></label>
            <label className="wide">{t("Nama Lengkap")} *<input required value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} placeholder={t("Nama lengkap penduduk contoh")} /></label>
            <label>{t("Jenis Kelamin")}<select value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value })}>{["Laki-laki", "Perempuan"].map((item) => <option key={item} value={item}>{t(item)}</option>)}</select></label>
            <label>{t("Tanggal Lahir")} *<input required type="date" value={form.birthDate} onChange={(e) => setForm({ ...form, birthDate: e.target.value })} /></label>
            <label>Suco *<input required value={form.suco} onChange={(e) => setForm({ ...form, suco: e.target.value })} placeholder={t("Nama suco")} /></label>
            <label>Aldeia *<input required value={form.aldeia} onChange={(e) => setForm({ ...form, aldeia: e.target.value })} placeholder={t("Nama aldeia")} /></label>
            <label>{t("Status Perkawinan")}<select value={form.maritalStatus} onChange={(e) => setForm({ ...form, maritalStatus: e.target.value })}>{["Belum Menikah", "Menikah", "Cerai", "Janda/Duda"].map((item) => <option key={item} value={item}>{t(item)}</option>)}</select></label>
            <label>{t("Pekerjaan")}<input value={form.occupation} onChange={(e) => setForm({ ...form, occupation: e.target.value })} placeholder={t("Pekerjaan (opsional)")} /></label>
            <label className="wide checkbox-label"><input type="checkbox" checked={form.isHouseholdHead} onChange={(e) => setForm({ ...form, isHouseholdHead: e.target.checked })} /> {t("Penduduk ini adalah kepala keluarga")}</label>
          </div><div className="form-actions"><button type="button" onClick={() => setShowForm(false)}>{t("Batal")}</button><button className="save-button" disabled={saving}>{t(saving ? "Menyimpan..." : editing ? "Perbarui Data" : "Simpan Data")}</button></div></form>
        </section>
      </div>}
      <ToastContainer toasts={toasts} dismiss={dismiss} />
    </div>
  );
}
