"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import Pagination from "./Pagination";
import { exportToCSV } from "../utils/export";
import { useToast, ToastContainer } from "./Toast";
import AutoNumberButton from "./AutoNumberButton";
import { useLanguage } from "./LanguageProvider";
import Icon from "./Icon";
import { roleHasCapability } from "../roles";
import RoleAccessNotice from "./RoleAccessNotice";

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

type IncomingTask = {
  id: number;
  assignedToName: string;
  assignedToEmail: string;
  instruction: string;
  dueDate: string;
  resultType: string;
  outgoingLetterId: number | null;
  documentId: number | null;
  completionNote: string;
  status: string;
  assignedByName: string;
};

type TaskMessage = {
  id: number;
  authorName: string;
  authorRole: string;
  message: string;
  createdAt: string;
};

type TaskData = {
  task: IncomingTask | null;
  messages: TaskMessage[];
  assignableStaff: Array<{ id: number; displayName: string; email: string }>;
  availableOutgoing: Array<{ id: number; letterNumber: string; subject: string; status: string }>;
  availableDocuments: Array<{ id: number; title: string; referenceNumber: string; fileName: string }>;
  linkedOutgoing: { id: number; letterNumber: string; subject: string; status: string } | null;
  linkedDocument: { id: number; title: string; referenceNumber: string; fileName: string } | null;
  permissions: {
    canManage: boolean;
    canReply: boolean;
    canSubmit: boolean;
    canReview: boolean;
  };
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

export default function IncomingMail({
  initialOpenCreate = false,
  onCreateOutgoingResponse,
  onOpenArchive,
}: {
  initialOpenCreate?: boolean;
  onCreateOutgoingResponse?: (draft: {
    sourceIncomingLetterId: number;
    recipient: string;
    subject: string;
    category: string;
    notes: string;
  }) => void;
  onOpenArchive?: () => void;
}) {
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
  const [taskLetter, setTaskLetter] = useState<Letter | null>(null);
  const [taskData, setTaskData] = useState<TaskData | null>(null);
  const [taskLoading, setTaskLoading] = useState(false);
  const [taskSaving, setTaskSaving] = useState(false);
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

  const loadTask = useCallback(async (letter: Letter) => {
    setTaskLetter(letter);
    setTaskLoading(true);
    try {
      const response = await fetch(`/api/incoming-letters/tasks?letterId=${letter.id}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Tugas dan diskusi belum dapat dimuat.");
      setTaskData(data);
    } catch (error) {
      addToast(t(error instanceof Error ? error.message : "Tugas dan diskusi belum dapat dimuat."), "error");
    } finally {
      setTaskLoading(false);
    }
  }, [addToast, t]);

  async function taskAction(action: string, values: Record<string, unknown> = {}) {
    if (!taskLetter) return false;
    setTaskSaving(true);
    try {
      const response = await fetch("/api/incoming-letters/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, letterId: taskLetter.id, ...values }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Tugas Karta Tama belum dapat diperbarui.");
      await Promise.all([loadTask(taskLetter), loadLetters()]);
      addToast(t("Tugas Karta Tama berhasil diperbarui."), "success");
      return true;
    } catch (error) {
      addToast(t(error instanceof Error ? error.message : "Tugas Karta Tama belum dapat diperbarui."), "error");
      return false;
    } finally {
      setTaskSaving(false);
    }
  }

  async function saveDisposition(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    await taskAction("disposition", {
      staffUserId: Number(formData.get("staffUserId")),
      instruction: String(formData.get("instruction") ?? ""),
      dueDate: String(formData.get("dueDate") ?? ""),
      resultType: String(formData.get("resultType") ?? ""),
    });
  }

  async function sendTaskMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const message = String(new FormData(formElement).get("message") ?? "");
    if (await taskAction("message", { message })) formElement.reset();
  }

  async function requestRevision(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const message = String(new FormData(formElement).get("message") ?? "");
    if (await taskAction("revision", { message })) formElement.reset();
  }

  async function linkTaskResult(kind: "outgoing" | "document", resultId: number) {
    if (!resultId) return;
    await taskAction("link-result", { kind, resultId });
  }

  async function submitTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const completionNote = String(new FormData(event.currentTarget).get("completionNote") ?? "");
    await taskAction("submit", { completionNote });
  }

  const newCount = summary.fresh;
  const processCount = summary.processing;
  const completedCount = summary.completed;
  const canWrite = roleHasCapability(currentRole, "writeOperational");

  return (
    <div className="page mail-page">
      <div className="page-heading">
        <div>
          <p className="eyebrow">{t("ADMINISTRASI SURAT")}</p>
          <h1>{t("Surat Masuk")}</h1>
          <p>{t("Catat, cari, dan pantau tindak lanjut surat yang diterima kantor.")}</p>
        </div>
        {canWrite && <button className="primary-button mail-add" onClick={openCreate}>
          <Icon name="plus" /> {t("Tambah Surat Masuk")}
        </button>}
      </div>
      <RoleAccessNotice role={currentRole} />

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
                    <span className={`status-select ${letter.status.toLowerCase()}`}>{t(letter.status)}</span>
                  </td>
                  <td className="actions-cell incoming-actions">
                    <button className="action-btn task-open" onClick={() => void loadTask(letter)} title={t("Buka Tugas")} aria-label={t("Buka Tugas")}><Icon name="activity" size={19} /></button>
                    {canWrite && <button className="action-btn edit" onClick={() => openEdit(letter)} title={t("Edit")} aria-label={t("Edit")}><Icon name="edit" size={19} /></button>}
                    {currentRole === "Administrator" && <button className="action-btn delete" onClick={() => void remove(letter.id)} title={t("Hapus")} aria-label={t("Hapus")}><Icon name="trash" size={19} /></button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="table-footer">{t("Menampilkan")} {letters.length} {t("dari")} {total} {t("surat")}</div>
        <Pagination currentPage={page} totalItems={total} perPage={perPage} onPageChange={setPage} />
      </section>

      {taskLetter && (
        <div className="modal-layer" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setTaskLetter(null)}>
          <section className="mail-modal task-discussion-modal" role="dialog" aria-modal="true" aria-labelledby="task-title">
            <div className="modal-heading">
              <div><p className="eyebrow">{t("TUGAS & DISPOSISI")}</p><h2 id="task-title">{taskLetter.letterNumber}</h2><p>{taskLetter.sender} · {taskLetter.subject}</p></div>
              <button aria-label={t("Tutup")} onClick={() => setTaskLetter(null)}>×</button>
            </div>
            {taskLoading ? <p className="empty">{t("Memuat tugas dan diskusi...")}</p> : taskData ? (
              <div className="task-discussion-content">
                {taskData.task ? <section className="assignment-summary">
                  <div><span>{t("Penanggung Jawab")}</span><strong>{taskData.task.assignedToName}</strong><small>{taskData.task.assignedToEmail}</small></div>
                  <div><span>{t("Tenggat")}</span><strong>{taskData.task.dueDate}</strong><small>{t(taskData.task.status)}</small></div>
                  <div className="wide"><span>{t("Instruksi")}</span><p>{taskData.task.instruction}</p><small>{t("Diberikan oleh")} {taskData.task.assignedByName}</small></div>
                </section> : <p className="task-empty-state">{t("Karta Tama ini menunggu disposisi Pimpinan.")}</p>}

                {taskData.permissions.canManage && <form className="task-form" onSubmit={saveDisposition}>
                  <h3>{t(taskData.task ? "Perbarui Disposisi" : "Berikan Disposisi")}</h3>
                  <div className="form-grid">
                    <label>{t("Penanggung Jawab")}<select name="staffUserId" defaultValue={taskData.task ? taskData.assignableStaff.find((staff) => staff.email === taskData.task?.assignedToEmail)?.id : ""} required><option value="">{t("Pilih staf")}</option>{taskData.assignableStaff.map((staff) => <option key={staff.id} value={staff.id}>{staff.displayName}</option>)}</select></label>
                    <label>{t("Tenggat")}<input name="dueDate" type="date" defaultValue={taskData.task?.dueDate} required /></label>
                    <label>{t("Jenis Hasil Tugas")}<select name="resultType" defaultValue={taskData.task?.resultType ?? "Catatan"} required>{["Karta Sai", "Dokumen Arsip", "Catatan"].map((item) => <option key={item} value={item}>{t(item)}</option>)}</select></label>
                    <label className="wide">{t("Instruksi")}<textarea name="instruction" rows={3} defaultValue={taskData.task?.instruction} required /></label>
                  </div>
                  <div className="task-form-actions">
                    <button type="submit" className="task-primary-button" disabled={taskSaving}>
                      <Icon name="save" size={16} /> {t("Simpan Disposisi")}
                    </button>
                  </div>
                </form>}

                <section className="task-conversation">
                  <h3>{t("Diskusi Tugas")}</h3>
                  <div className="task-message-list">{taskData.messages.length ? taskData.messages.map((message) => <article key={message.id}>
                    <div><strong>{message.authorName}</strong><span>{t(message.authorRole)}</span><time>{new Date(message.createdAt.includes("T") ? message.createdAt : `${message.createdAt.replace(" ", "T")}Z`).toLocaleString()}</time></div>
                    <p>{message.message}</p>
                  </article>) : <p className="empty">{t("Belum ada pesan dalam tugas ini.")}</p>}</div>
                  {taskData.permissions.canReply && <form className="task-message-form" onSubmit={sendTaskMessage}><textarea name="message" rows={2} placeholder={t("Tulis perkembangan atau balasan...")} required /><button type="submit" className="task-primary-button" disabled={taskSaving}><Icon name="message" size={16} /> {t("Kirim Pesan")}</button></form>}
                </section>

                {taskData.task && taskData.permissions.canReply && <section className="task-result-panel">
                  <h3>{t("Hasil Tugas")}: {t(taskData.task.resultType)}</h3>
                  {taskData.task.resultType === "Karta Sai" && <>
                    <div className="linked-result">{taskData.linkedOutgoing ? <><strong>{taskData.linkedOutgoing.letterNumber}</strong><span>{taskData.linkedOutgoing.subject}</span><small>{t(taskData.linkedOutgoing.status)}</small></> : <p>{t("Belum ada Karta Sai yang terhubung.")}</p>}</div>
                    <div className="result-controls"><button type="button" onClick={() => onCreateOutgoingResponse?.({ sourceIncomingLetterId: taskLetter.id, recipient: taskLetter.sender, subject: `${t("Jawaban")}: ${taskLetter.subject}`, category: taskLetter.category, notes: `${t("Referensi Karta Tama")}: ${taskLetter.letterNumber}` })}>{t("Buat Karta Sai Jawaban")}</button><select defaultValue="" onChange={(event) => void linkTaskResult("outgoing", Number(event.target.value))}><option value="">{t("Pilih Karta Sai yang sudah ada")}</option>{taskData.availableOutgoing.map((item) => <option key={item.id} value={item.id}>{item.letterNumber} · {t(item.status)}</option>)}</select></div>
                  </>}
                  {taskData.task.resultType !== "Catatan" && <>
                    {taskData.task.resultType === "Karta Sai" && <p className="optional-archive-note">{t("Dokumen Arsip bersifat opsional untuk Karta Sai.")}</p>}
                    <div className="linked-result">{taskData.linkedDocument ? <><strong>{taskData.linkedDocument.title}</strong><span>{taskData.linkedDocument.fileName}</span><a href={`/api/documents/${taskData.linkedDocument.id}`}>{t("Unduh")}</a></> : <p>{t("Belum ada dokumen Arsip yang terhubung.")}</p>}</div>
                    <div className="result-controls"><button type="button" onClick={onOpenArchive}>{t("Buka Arsip Dokumen")}</button><select defaultValue="" onChange={(event) => void linkTaskResult("document", Number(event.target.value))}><option value="">{t("Pilih dokumen dari Arsip")}</option>{taskData.availableDocuments.map((item) => <option key={item.id} value={item.id}>{item.title} · {item.fileName}</option>)}</select></div>
                  </>}
                </section>}

                {taskData.permissions.canSubmit && <form className="task-submit-form" onSubmit={submitTask}><label>{t("Catatan Hasil Pekerjaan")}<textarea name="completionNote" rows={3} placeholder={t("Jelaskan hasil pekerjaan yang sudah diselesaikan")} required /></label><button type="submit" className="task-primary-button" disabled={taskSaving}><Icon name="check" size={17} /> {t("Ajukan Selesai")}</button></form>}
                {taskData.permissions.canReview && <div className="task-review-actions">
                  <button type="button" className="task-primary-button" disabled={taskSaving} onClick={() => void taskAction("approve")}><Icon name="check" size={17} /> {t("Terima & Selesaikan")}</button>
                  <form onSubmit={requestRevision}><textarea name="message" rows={2} placeholder={t("Tuliskan perbaikan yang diperlukan")} required /><button type="submit" className="task-revision-button" disabled={taskSaving}>{t("Kembalikan untuk Diperbaiki")}</button></form>
                </div>}
              </div>
            ) : <p className="empty">{t("Tugas dan diskusi belum dapat dimuat.")}</p>}
          </section>
        </div>
      )}

      {showForm && (
        <div className="modal-layer" role="presentation" onMouseDown={(e) => e.target === e.currentTarget && setShowForm(false)}>
          <section className="mail-modal" role="dialog" aria-modal="true" aria-labelledby="form-title">
            <div className="modal-heading">
              <div><p className="eyebrow">{t("FORMULIR PENCATATAN")}</p><h2 id="form-title">{t(editing ? "Edit Surat Masuk" : "Tambah Surat Masuk")}</h2></div>
              <button aria-label={t("Tutup formulir")} onClick={() => setShowForm(false)}>×</button>
            </div>
            <form onSubmit={submit}>
              <div className="form-grid">
                <label>{t("Nomor Surat")} *<input required value={form.letterNumber} onChange={(e) => setForm({ ...form, letterNumber: e.target.value })} placeholder={t("Contoh: KT-2026-08-0001")} /><AutoNumberButton documentType="incoming" date={form.receivedDate} onNumber={(letterNumber) => setForm({ ...form, letterNumber })} /></label>
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
