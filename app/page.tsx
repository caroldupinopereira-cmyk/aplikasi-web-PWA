"use client";

import { useEffect, useMemo, useState } from "react";
import IncomingMail from "./components/IncomingMail";
import OutgoingMail from "./components/OutgoingMail";
import ResidentData from "./components/ResidentData";
import ActivityReports from "./components/ActivityReports";
import Finance from "./components/Finance";
import DocumentArchive from "./components/DocumentArchive";
import Settings from "./components/Settings";

const menu = [
  ["Dashboard", "▦"],
  ["Surat Masuk", "↓"],
  ["Surat Keluar", "↑"],
  ["Data Penduduk", "♙"],
  ["Laporan Kegiatan", "▤"],
  ["Anggaran", "$"],
  ["Arsip Dokumen", "□"],
];

type Activity = { title: string; meta: string; badge: string; type: string };
type Task = { label: string; done: boolean };
type DashboardData = {
  currentUser: {
    email: string;
    displayName: string;
    role: string;
  };
  stats: {
    incomingTotal: number;
    incomingNew: number;
    incomingProcessed: number;
    outgoingTotal: number;
    outgoingPending: number;
    outgoingDraft: number;
    residentTotal: number;
    households: number;
    male: number;
    female: number;
    documentTotal: number;
    storageUsed: number;
    reportsTotal: number;
    reportsThisMonth: number;
    reportsComplete: number;
    totalParticipants: number;
    totalBudget: number;
    totalExpense: number;
    verified: number;
  };
  recentActivities: Activity[];
  pendingTasks: Task[];
};

const money = (cents: number) => `$${(cents / 100).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
const fileSize = (bytes: number) => bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`;
const activityIcon = (type: string) => type === "incoming" ? "↓" : type === "outgoing" ? "↑" : type === "report" ? "▤" : "$";

export default function Home() {
  const [active, setActive] = useState("Dashboard");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState<Task[]>([]);

  useEffect(() => {
    let activeRequest = true;
    fetch("/api/dashboard")
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Gagal memuat dashboard.");
        return result as DashboardData;
      })
      .then((result) => {
        if (!activeRequest) return;
        setData(result);
        setTasks(result.pendingTasks);
      })
      .catch(() => {
        if (activeRequest) setData(null);
      })
      .finally(() => {
        if (activeRequest) setLoading(false);
      });
    return () => { activeRequest = false; };
  }, []);

  const filtered = useMemo(
    () => (data?.recentActivities ?? []).filter((item) => item.title.toLowerCase().includes(query.toLowerCase())),
    [data, query],
  );

  const stats = data?.stats;
  const currentUser = data?.currentUser;
  const initials = currentUser?.displayName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "PA";
  const budgetPercent = stats?.totalBudget ? Math.min(100, Math.round((stats.totalExpense / stats.totalBudget) * 100)) : 0;

  return (
    <main className="app-shell">
      <aside className={`sidebar ${mobileOpen ? "open" : ""}`}>
        <div className="brand">
          <div className="brand-mark">PA</div>
          <div>
            <strong>Sistema Administrasaun</strong>
            <span>Postu Administrativo</span>
          </div>
        </div>

        <nav aria-label="Menu utama">
          <p className="nav-label">MENU UTAMA</p>
          {menu.map(([label, icon]) => (
            <button
              className={active === label ? "nav-item active" : "nav-item"}
              key={label}
              onClick={() => {
                setActive(label);
                setMobileOpen(false);
              }}
            >
              <span className="nav-icon">{icon}</span>
              {label}
            </button>
          ))}
        </nav>

        <div className="sidebar-footer">
          <button className={active === "Pengaturan" ? "nav-item active" : "nav-item"} onClick={() => { setActive("Pengaturan"); setMobileOpen(false); }}><span className="nav-icon">⚙</span>Pengaturan</button>
          <div className="user-card">
            <div className="avatar">{initials}</div>
            <div><strong>{currentUser?.displayName ?? "Pengguna"}</strong><span>{currentUser?.role ?? "Memuat..."}</span></div>
            <span className="more">•••</span>
          </div>
        </div>
      </aside>

      {mobileOpen && <button className="backdrop" aria-label="Tutup menu" onClick={() => setMobileOpen(false)} />}

      <section className="content">
        <header className="topbar">
          <button className="menu-button" onClick={() => setMobileOpen(true)} aria-label="Buka menu">☰</button>
          <label className="search">
            <span>⌕</span>
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Cari surat, penduduk, atau dokumen..." />
            <kbd>Ctrl K</kbd>
          </label>
          <div className="top-actions">
            <button className="language">ID <span>⌄</span></button>
            <button className="notification" aria-label="Notifikasi">♢<i /></button>
            <div className="top-avatar" title={currentUser?.email}>{initials}</div>
          </div>
        </header>

        {active === "Surat Masuk" ? <IncomingMail /> : active === "Surat Keluar" ? <OutgoingMail /> : active === "Data Penduduk" ? <ResidentData /> : active === "Laporan Kegiatan" ? <ActivityReports /> : active === "Anggaran" ? <Finance /> : active === "Arsip Dokumen" ? <DocumentArchive /> : active === "Pengaturan" ? <Settings /> : <div className="page">
          <div className="page-heading">
            <div>
              <p className="eyebrow">{new Date().toLocaleDateString("id-ID", { weekday: "long", year: "numeric", month: "long", day: "numeric" }).toUpperCase()}</p>
              <h1>{active}</h1>
              <p>Selamat datang kembali. Berikut ringkasan administrasi hari ini.</p>
            </div>
            <button className="primary-button" onClick={() => alert("Formulir data baru akan dibuat pada tahap berikutnya.")}>
              <span>＋</span> Tambah Data Baru
            </button>
          </div>

          <section className="stats-grid" aria-label="Ringkasan">
            <article className="stat-card blue">
              <div className="stat-top"><span className="stat-icon">↓</span><span className="trend">{stats?.incomingNew ?? 0} baru</span></div>
              <p>Surat Masuk</p><strong>{stats?.incomingTotal ?? 0}</strong><small>{stats?.incomingProcessed ?? 0} sedang diproses</small>
            </article>
            <article className="stat-card cyan">
              <div className="stat-top"><span className="stat-icon">↑</span><span className="trend">{stats?.outgoingDraft ?? 0} draf</span></div>
              <p>Surat Keluar</p><strong>{stats?.outgoingTotal ?? 0}</strong><small>{stats?.outgoingPending ?? 0} menunggu persetujuan</small>
            </article>
            <article className="stat-card amber">
              <div className="stat-top"><span className="stat-icon">♙</span><span className="muted-badge">{new Date().getFullYear()}</span></div>
              <p>Total Penduduk</p><strong>{(stats?.residentTotal ?? 0).toLocaleString("id-ID")}</strong><small>{(stats?.households ?? 0).toLocaleString("id-ID")} kepala keluarga</small>
            </article>
            <article className="stat-card violet">
              <div className="stat-top"><span className="stat-icon">□</span><span className="muted-badge">{stats?.documentTotal ?? 0} file</span></div>
              <p>Arsip Dokumen</p><strong>{fileSize(stats?.storageUsed ?? 0)}</strong><small>Total penyimpanan terpakai</small>
            </article>
          </section>

          <section className="dashboard-grid">
            <article className="panel activity-panel">
              <div className="panel-title">
                <div><h2>Aktivitas Terbaru</h2><p>Perubahan data dan dokumen terakhir</p></div>
                <button onClick={() => setActive("Surat Masuk")}>Lihat Semua →</button>
              </div>
              <div className="activity-list">
                {loading ? <p className="empty">Memuat data aktivitas...</p> : filtered.length ? filtered.map((item, index) => (
                  <div className="activity" key={`${item.type}-${index}`}>
                    <span className={`activity-icon a${index % 4}`}>{activityIcon(item.type)}</span>
                    <div><strong>{item.title}</strong><span>{item.meta}</span></div>
                    <em>{item.badge}</em>
                  </div>
                )) : <p className="empty">Tidak ada aktivitas terbaru.</p>}
              </div>
            </article>

            <article className="panel task-panel">
              <div className="panel-title">
                <div><h2>Tugas Hari Ini</h2><p>{tasks.filter((t) => !t.done).length} tugas perlu diselesaikan</p></div>
                <span className="task-count">{tasks.filter((t) => !t.done).length}</span>
              </div>
              <div className="task-list">
                {tasks.map((task, index) => (
                  <label className={task.done ? "task done" : "task"} key={`${task.label}-${index}`}>
                    <input
                      type="checkbox"
                      checked={task.done}
                      onChange={() => setTasks((old) => old.map((t, i) => i === index ? { ...t, done: !t.done } : t))}
                    />
                    <span>{task.label}</span>
                  </label>
                ))}
              </div>
            </article>
          </section>

          <section className="bottom-grid">
            <article className="panel budget">
              <div className="panel-title"><div><h2>Ringkasan Anggaran</h2><p>Tahun anggaran {new Date().getFullYear()}</p></div><button onClick={() => setActive("Anggaran")}>Detail →</button></div>
              <div className="budget-row">
                <div><span>Total Anggaran</span><strong>{money(stats?.totalBudget ?? 0)}</strong></div>
                <div><span>Realisasi</span><strong>{money(stats?.totalExpense ?? 0)}</strong></div>
                <div><span>Sisa Anggaran</span><strong className="green">{money((stats?.totalBudget ?? 0) - (stats?.totalExpense ?? 0))}</strong></div>
              </div>
              <div className="progress"><i style={{ width: `${budgetPercent}%` }} /></div>
              <small>{budgetPercent}% anggaran telah digunakan</small>
            </article>
            <article className="tip">
              <div className="tip-icon">✓</div>
              <div><strong>Data contoh untuk pembelajaran</strong><p>Belum ada data asli masyarakat atau kantor yang digunakan dalam sistem ini.</p></div>
            </article>
          </section>
        </div>}
      </section>
    </main>
  );
}
