"use client";

import { useCallback, useEffect, useState } from "react";
import { useLanguage } from "./LanguageProvider";
import Icon from "./Icon";
import Pagination from "./Pagination";

type OfficeTask = {
  id: number;
  incomingLetterId: number;
  letterNumber: string;
  sender: string;
  subject: string;
  category: string;
  assignedToName: string;
  instruction: string;
  dueDate: string;
  resultType: string;
  status: string;
  assignedByName: string;
  completionNote: string;
  overdue: boolean;
};

type TaskResponse = {
  tasks: OfficeTask[];
  pagination: { page: number; perPage: number; total: number };
  summary: { total: number; active: number; overdue: number; review: number; completed: number };
  currentUser: { role: string };
};

export default function TaskCenter({ onOpenIncoming }: { onOpenIncoming: () => void }) {
  const { t } = useLanguage();
  const [tasks, setTasks] = useState<OfficeTask[]>([]);
  const [summary, setSummary] = useState({ total: 0, active: 0, overdue: 0, review: 0, completed: 0 });
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("Semua");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const perPage = 10;

  const loadTasks = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ page: String(page), perPage: String(perPage), q: query, status });
      const response = await fetch(`/api/tasks?${params}`);
      const result = await response.json() as TaskResponse & { error?: string };
      if (!response.ok) throw new Error(result.error || "Tugas kantor belum dapat dimuat.");
      setTasks(result.tasks);
      setSummary(result.summary);
      setTotal(result.pagination.total);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Tugas kantor belum dapat dimuat.");
    } finally {
      setLoading(false);
    }
  }, [page, query, status]);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadTasks(), 250);
    return () => window.clearTimeout(timer);
  }, [loadTasks]);

  return <div className="page mail-page task-center-page">
    <div className="page-heading">
      <div><p className="eyebrow">{t("PUSAT PEKERJAAN")}</p><h1>{t("Tugas Kantor")}</h1><p>{t("Pantau disposisi, penanggung jawab, tenggat, dan penyelesaian tugas dalam satu tempat.")}</p></div>
      <button className="refresh-button task-center-refresh" onClick={() => void loadTasks()}><Icon name="refresh" /> {t("Muat Ulang")}</button>
    </div>

    <section className="mail-stats task-center-stats">
      <article><span>{t("Semua Tugas")}</span><strong>{summary.total}</strong><small>{t("Sesuai hak akses Anda")}</small></article>
      <article><span>{t("Sedang Diproses")}</span><strong>{summary.active}</strong><small>{t("Masih dikerjakan")}</small></article>
      <article><span>{t("Terlambat")}</span><strong>{summary.overdue}</strong><small>{t("Melewati tenggat")}</small></article>
      <article><span>{t("Menunggu Pemeriksaan")}</span><strong>{summary.review}</strong><small>{t("Perlu keputusan Pimpinan")}</small></article>
      <article><span>{t("Selesai")}</span><strong>{summary.completed}</strong><small>{t("Tugas telah diterima")}</small></article>
    </section>

    <section className="panel mail-table-panel">
      <div className="mail-toolbar">
        <label className="mail-search"><span><Icon name="search" /></span><input value={query} onChange={(event) => { setQuery(event.target.value); setPage(1); }} placeholder={t("Cari nomor, perihal, instruksi, atau staf...")} /></label>
        <label className="filter-label">{t("Status")}
          <select value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }}>
            {["Semua", "Diproses", "Perlu Perbaikan", "Diajukan Selesai", "Selesai"].map((item) => <option key={item} value={item}>{t(item)}</option>)}
          </select>
        </label>
      </div>
      <div className="table-wrap"><table className="mail-table task-center-table">
        <thead><tr><th>{t("Karta Tama")}</th><th>{t("Tugas")}</th><th>{t("Penanggung Jawab")}</th><th>{t("Tenggat")}</th><th>{t("Status")}</th><th>{t("Aksi")}</th></tr></thead>
        <tbody>
          {loading ? <tr><td colSpan={6} className="table-empty">{t("Memuat tugas kantor...")}</td></tr>
            : error ? <tr><td colSpan={6} className="table-empty error-text">{t(error)}</td></tr>
              : tasks.length === 0 ? <tr><td colSpan={6} className="table-empty">{t("Belum ada tugas yang sesuai dengan pilihan ini.")}</td></tr>
                : tasks.map((task) => <tr key={task.id} className={task.overdue ? "task-overdue-row" : ""}>
                  <td><strong>{task.letterNumber}</strong><small>{task.sender} · {task.subject}</small></td>
                  <td><strong>{t(task.resultType)}</strong><small>{task.instruction}</small></td>
                  <td><strong>{task.assignedToName}</strong><small>{t("Diberikan oleh")} {task.assignedByName}</small></td>
                  <td><strong>{task.dueDate}</strong>{task.overdue && <small className="overdue-label">{t("Terlambat")}</small>}</td>
                  <td><span className={`task-status-badge status-${task.status.toLowerCase().replaceAll(" ", "-")}`}>{t(task.status)}</span></td>
                  <td><button className="task-open-button" onClick={onOpenIncoming}><Icon name="inbox" size={17} /> {t("Buka Karta Tama")}</button></td>
                </tr>)}
        </tbody>
      </table></div>
      <Pagination currentPage={page} totalItems={total} perPage={perPage} onPageChange={setPage} />
    </section>
  </div>;
}
