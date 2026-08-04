"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import AutoNumberButton from "./AutoNumberButton";
import Icon from "./Icon";
import { useLanguage } from "./LanguageProvider";
import Pagination from "./Pagination";
import RoleAccessNotice from "./RoleAccessNotice";
import { ToastContainer, useToast } from "./Toast";
import { roleHasCapability } from "../roles";

type Service = {
  id: number;
  serviceNumber: string;
  applicantName: string;
  suco: string;
  serviceType: string;
  receivedDate: string;
  dueDate: string;
  assignedTo: string;
  requirements: string;
  status: string;
  notes: string;
  completedAt: string | null;
  overdue: boolean;
};

const today = () => new Date().toISOString().slice(0, 10);
const blankForm = {
  serviceNumber: "",
  applicantName: "",
  suco: "",
  serviceType: "Surat Keterangan",
  receivedDate: today(),
  dueDate: today(),
  assignedTo: "",
  requirements: "",
  status: "Baru",
  notes: "",
};
const statusOptions = ["Baru", "Diproses", "Menunggu", "Selesai", "Dibatalkan"];
const typeOptions = ["Surat Keterangan", "Surat Rekomendasi", "Pengesahan Dokumen", "Permintaan Data", "Rujukan Administrasi", "Lainnya"];

export default function AdministrativeServices({ initialOpenCreate = false }: { initialOpenCreate?: boolean }) {
  const { t } = useLanguage();
  const { toasts, addToast, dismiss } = useToast();
  const [services, setServices] = useState<Service[]>([]);
  const [summary, setSummary] = useState({ total: 0, fresh: 0, processing: 0, overdue: 0, completed: 0 });
  const [form, setForm] = useState(blankForm);
  const [editing, setEditing] = useState<Service | null>(null);
  const [showForm, setShowForm] = useState(initialOpenCreate);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("Semua");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [currentRole, setCurrentRole] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const perPage = 12;
  const canWrite = roleHasCapability(currentRole, "writeOperational");

  const loadServices = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), perPage: String(perPage), q: query, status });
      const response = await fetch(`/api/services?${params}`);
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Pelayanan belum dapat dimuat.");
      setServices(result.services);
      setSummary(result.summary);
      setTotal(result.pagination.total);
      setCurrentRole(result.currentUser.role);
    } catch (error) {
      addToast(t(error instanceof Error ? error.message : "Pelayanan belum dapat dimuat."), "error");
    } finally {
      setLoading(false);
    }
  }, [addToast, page, query, status, t]);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadServices(), 250);
    return () => window.clearTimeout(timer);
  }, [loadServices]);

  function openCreate() {
    setEditing(null);
    setForm({ ...blankForm, receivedDate: today(), dueDate: today() });
    setShowForm(true);
  }

  function openEdit(service: Service) {
    setEditing(service);
    setForm({
      serviceNumber: service.serviceNumber,
      applicantName: service.applicantName,
      suco: service.suco,
      serviceType: service.serviceType,
      receivedDate: service.receivedDate,
      dueDate: service.dueDate,
      assignedTo: service.assignedTo,
      requirements: service.requirements,
      status: service.status,
      notes: service.notes,
    });
    setShowForm(true);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    try {
      const response = await fetch("/api/services", {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editing ? { id: editing.id, ...form } : form),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Pelayanan belum dapat disimpan.");
      addToast(t(editing ? "Pelayanan berhasil diperbarui." : "Pelayanan berhasil ditambahkan."), "success");
      setShowForm(false);
      setEditing(null);
      await loadServices();
    } catch (error) {
      addToast(t(error instanceof Error ? error.message : "Pelayanan belum dapat disimpan."), "error");
    } finally {
      setSaving(false);
    }
  }

  async function remove(service: Service) {
    if (!confirm(`${t("Hapus pelayanan ini? Tindakan ini tidak dapat dibatalkan.")}\n\n${service.serviceNumber} — ${service.applicantName}`)) return;
    try {
      const response = await fetch("/api/services", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: service.id }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Pelayanan belum dapat dihapus.");
      addToast(t("Pelayanan berhasil dihapus."), "success");
      await loadServices();
    } catch (error) {
      addToast(t(error instanceof Error ? error.message : "Pelayanan belum dapat dihapus."), "error");
    }
  }

  return <div className="page mail-page service-page">
    <div className="page-heading"><div><p className="eyebrow">{t("LAYANAN MASYARAKAT")}</p><h1>{t("Pelayanan Administrasi")}</h1><p>{t("Catat permohonan masyarakat dan pantau penyelesaiannya secara teratur.")}</p></div>{canWrite && <button className="primary-button mail-add" onClick={openCreate}><Icon name="plus" /> {t("Tambah Pelayanan")}</button>}</div>
    <RoleAccessNotice role={currentRole} />
    <section className="mail-stats service-stats">
      <article><span>{t("Total Pelayanan")}</span><strong>{summary.total}</strong><small>{t("Semua permohonan")}</small></article>
      <article><span>{t("Baru")}</span><strong>{summary.fresh}</strong><small>{t("Belum mulai diproses")}</small></article>
      <article><span>{t("Dalam Proses")}</span><strong>{summary.processing}</strong><small>{t("Sedang ditindaklanjuti")}</small></article>
      <article><span>{t("Terlambat")}</span><strong>{summary.overdue}</strong><small>{t("Melewati tenggat")}</small></article>
      <article><span>{t("Selesai")}</span><strong>{summary.completed}</strong><small>{t("Sudah diserahkan")}</small></article>
    </section>

    <section className="panel mail-table-panel">
      <div className="mail-toolbar">
        <label className="mail-search"><span><Icon name="search" /></span><input value={query} onChange={(event) => { setQuery(event.target.value); setPage(1); }} placeholder={t("Cari nomor, pemohon, Suco, layanan, atau staf...")} /></label>
        <label className="filter-label">{t("Status")}<select value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }}>{["Semua", ...statusOptions].map((item) => <option key={item} value={item}>{t(item)}</option>)}</select></label>
        <button className="refresh-button" onClick={() => void loadServices()}><Icon name="refresh" /> {t("Muat Ulang")}</button>
      </div>
      <div className="table-wrap"><table className="mail-table service-table"><thead><tr><th>{t("Nomor Pelayanan")}</th><th>{t("Pemohon & Suco")}</th><th>{t("Jenis Pelayanan")}</th><th>{t("Penanggung Jawab")}</th><th>{t("Tenggat")}</th><th>{t("Status")}</th><th>{t("Aksi")}</th></tr></thead>
        <tbody>{loading ? <tr><td colSpan={7} className="table-empty">{t("Memuat data...")}</td></tr> : services.length === 0 ? <tr><td colSpan={7} className="table-empty">{t("Belum ada pelayanan yang sesuai dengan pilihan ini.")}</td></tr> : services.map((service) => <tr key={service.id} className={service.overdue ? "task-overdue-row" : ""}>
          <td><strong>{service.serviceNumber}</strong><small>{service.receivedDate}</small></td>
          <td><strong>{service.applicantName}</strong><small>{service.suco}</small></td>
          <td><strong>{t(service.serviceType)}</strong><small>{service.requirements || t("Tidak ada persyaratan tambahan")}</small></td>
          <td><strong>{service.assignedTo}</strong></td>
          <td><strong>{service.dueDate}</strong>{service.overdue && <small className="overdue-label">{t("Terlambat")}</small>}</td>
          <td><span className={`task-status-badge status-${service.status.toLowerCase().replaceAll(" ", "-")}`}>{t(service.status)}</span></td>
          <td className="actions-cell incoming-actions">{canWrite && <button className="action-btn edit" onClick={() => openEdit(service)} title={t("Edit")}><Icon name="edit" size={19} /></button>}{currentRole === "Administrator" && <button className="action-btn delete" onClick={() => void remove(service)} title={t("Hapus")}><Icon name="trash" size={19} /></button>}</td>
        </tr>)}</tbody>
      </table></div>
      <Pagination currentPage={page} totalItems={total} perPage={perPage} onPageChange={setPage} />
    </section>

    {showForm && <div className="modal-layer" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setShowForm(false)}><section className="mail-modal service-modal" role="dialog" aria-modal="true" aria-labelledby="service-form-title">
      <div className="modal-heading"><div><p className="eyebrow">{t("FORMULIR PELAYANAN")}</p><h2 id="service-form-title">{t(editing ? "Edit Pelayanan" : "Tambah Pelayanan")}</h2><p>{t("Gunakan data yang diperlukan saja dan periksa kembali sebelum menyimpan.")}</p></div><button aria-label={t("Tutup formulir")} onClick={() => setShowForm(false)}>×</button></div>
      <form onSubmit={submit}><div className="form-grid">
        <label>{t("Nomor Pelayanan")} *<input required value={form.serviceNumber} onChange={(event) => setForm({ ...form, serviceNumber: event.target.value })} placeholder="SA-2026-08-0001" /><AutoNumberButton documentType="service" date={form.receivedDate} onNumber={(serviceNumber) => setForm({ ...form, serviceNumber })} /></label>
        <label>{t("Tanggal Masuk")} *<input required type="date" value={form.receivedDate} onChange={(event) => setForm({ ...form, receivedDate: event.target.value })} /></label>
        <label className="wide">{t("Nama Pemohon")} *<input required value={form.applicantName} onChange={(event) => setForm({ ...form, applicantName: event.target.value })} placeholder={t("Gunakan nama contoh untuk pengujian")} /></label>
        <label>Suco *<input required value={form.suco} onChange={(event) => setForm({ ...form, suco: event.target.value })} placeholder={t("Nama Suco")} /></label>
        <label>{t("Jenis Pelayanan")} *<select value={form.serviceType} onChange={(event) => setForm({ ...form, serviceType: event.target.value })}>{typeOptions.map((item) => <option key={item} value={item}>{t(item)}</option>)}</select></label>
        <label>{t("Penanggung Jawab")} *<input required value={form.assignedTo} onChange={(event) => setForm({ ...form, assignedTo: event.target.value })} placeholder={t("Nama staf penanggung jawab")} /></label>
        <label>{t("Tenggat")} *<input required min={form.receivedDate} type="date" value={form.dueDate} onChange={(event) => setForm({ ...form, dueDate: event.target.value })} /></label>
        <label>{t("Status")}<select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}>{statusOptions.map((item) => <option key={item} value={item}>{t(item)}</option>)}</select></label>
        <label className="wide">{t("Persyaratan")}<textarea rows={3} value={form.requirements} onChange={(event) => setForm({ ...form, requirements: event.target.value })} placeholder={t("Tuliskan dokumen atau informasi yang diperlukan")} /></label>
        <label className="wide">{t("Catatan")}<textarea rows={3} value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} placeholder={t("Catatan perkembangan pelayanan")} /></label>
      </div><div className="form-actions"><button type="button" onClick={() => setShowForm(false)}>{t("Batal")}</button><button className="save-button" disabled={saving}><Icon name="save" size={16} /> {t(saving ? "Menyimpan..." : editing ? "Perbarui Pelayanan" : "Simpan Pelayanan")}</button></div></form>
    </section></div>}
    <ToastContainer toasts={toasts} dismiss={dismiss} />
  </div>;
}
