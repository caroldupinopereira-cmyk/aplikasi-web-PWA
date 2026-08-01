"use client";

import { useCallback, useEffect, useState } from "react";
import IncomingMail from "./components/IncomingMail";
import OutgoingMail from "./components/OutgoingMail";
import ResidentData from "./components/ResidentData";
import ActivityReports from "./components/ActivityReports";
import Finance from "./components/Finance";
import DocumentArchive from "./components/DocumentArchive";
import DashboardCharts from "./components/DashboardCharts";
import DashboardInsights from "./components/DashboardInsights";
import DashboardActivityFeed, { type DashboardActivity } from "./components/DashboardActivityFeed";
import Settings from "./components/Settings";
import { canUseDashboardQuickAction, dashboardRoleMessage } from "./dashboard-access";

const menu = [
  ["Dashboard", "▦"],
  ["Surat Masuk", "↓"],
  ["Surat Keluar", "↑"],
  ["Data Penduduk", "♙"],
  ["Laporan Kegiatan", "▤"],
  ["Anggaran", "$"],
  ["Arsip Dokumen", "□"],
];

const quickActions = [
  { label: "Surat Masuk", module: "Surat Masuk", description: "Catat surat yang diterima", mode: "create" },
  { label: "Surat Keluar", module: "Surat Keluar", description: "Buat surat untuk dikirim", mode: "create" },
  { label: "Data Penduduk", module: "Data Penduduk", description: "Tambahkan data penduduk", mode: "create" },
  { label: "Laporan Kegiatan", module: "Laporan Kegiatan", description: "Buat laporan kegiatan", mode: "create" },
  { label: "Anggaran", module: "Anggaran", description: "Tambahkan alokasi anggaran", mode: "budget" },
  { label: "Pengeluaran", module: "Anggaran", description: "Catat pengeluaran baru", mode: "expense" },
  { label: "Arsip Dokumen", module: "Arsip Dokumen", description: "Unggah dokumen ke arsip", mode: "create" },
];

type DashboardData = {
  currentUser: {
    email: string;
    displayName: string;
    role: string;
  };
  filters: {
    selectedYear: number;
    availableYears: number[];
  };
  stats: {
    incomingTotal: number;
    incomingUnfollowed: number;
    outgoingTotal: number;
    outgoingPending: number;
    residentTotal: number;
    householdHeads: number;
    documentTotal: number;
    budgetYear: number;
    totalBudget: number;
    totalExpense: number;
    remainingBudget: number;
    budgetUsagePercent: number;
    reportsTotal: number;
    reportsDraft: number;
    reportsComplete: number;
    reportsThisMonth: number;
    unverifiedExpenseCount: number;
    unverifiedExpenseAmount: number;
  };
  insights: {
    residentsByGender: Array<{ label: string; value: number }>;
  };
  charts: {
    incomingByMonth: number[];
    outgoingByMonth: number[];
    expensesByMonth: number[];
  };
  recentActivities: DashboardActivity[];
};

const money = (cents: number) => `$${(cents / 100).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

export default function Home() {
  const [active, setActive] = useState("Dashboard");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [dashboardError, setDashboardError] = useState("");
  const [quickMenuOpen, setQuickMenuOpen] = useState(false);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [quickCreate, setQuickCreate] = useState<{ module: string; mode: string } | null>(null);
  const [lastUpdated, setLastUpdated] = useState("");
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const loadDashboard = useCallback(() => {
    let activeRequest = true;
    setLoading(true);
    setDashboardError("");
    fetch(`/api/dashboard?year=${selectedYear}`)
      .then(async (response) => {
        const result = await response.json();
        if (response.status === 401) {
          window.location.assign("/portal");
          throw new Error("Akses staf perlu diperiksa.");
        }
        if (!response.ok) throw new Error(result.error || "Gagal memuat dashboard.");
        return result as DashboardData;
      })
      .then((result) => {
        if (!activeRequest) return;
        setData(result);
        setLastUpdated(new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }));
      })
      .catch((error: unknown) => {
        if (!activeRequest) return;
        setData(null);
        setDashboardError(error instanceof Error ? error.message : "Dashboard tidak dapat dimuat.");
      })
      .finally(() => {
        if (activeRequest) setLoading(false);
      });
    return () => { activeRequest = false; };
  }, [selectedYear]);

  useEffect(() => {
    if (active !== "Dashboard") return;
    let cancelRequest: (() => void) | undefined;
    const timer = window.setTimeout(() => {
      cancelRequest = loadDashboard();
    }, 0);
    return () => {
      window.clearTimeout(timer);
      cancelRequest?.();
    };
  }, [active, loadDashboard]);

  useEffect(() => {
    if (active !== "Dashboard") return;
    let cancelRequest: (() => void) | undefined;
    const interval = window.setInterval(() => {
      cancelRequest?.();
      cancelRequest = loadDashboard();
    }, 5 * 60 * 1000);
    return () => {
      window.clearInterval(interval);
      cancelRequest?.();
    };
  }, [active, loadDashboard]);

  const selectedData = data?.filters.selectedYear === selectedYear ? data : null;

  const stats = selectedData?.stats;
  const currentUser = data?.currentUser;
  const availableQuickActions = quickActions.filter((action) =>
    canUseDashboardQuickAction(currentUser?.role, action.module),
  );
  const initials = currentUser?.displayName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "PA";
  const budgetPercent = stats?.budgetUsagePercent ?? 0;
  const progressPercent = Math.min(100, Math.max(0, budgetPercent));
  const notificationCount =
    (stats?.incomingUnfollowed ?? 0) +
    (stats?.outgoingPending ?? 0) +
    (stats?.unverifiedExpenseCount ?? 0);
  const openModule = (module: string) => {
    setActive(module);
    setQuickMenuOpen(false);
    setNotificationOpen(false);
    setQuickCreate(null);
    setMobileOpen(false);
    setQuery("");
  };
  const openQuickCreate = (module: string, mode: string) => {
    setQuickCreate({ module, mode });
    setActive(module);
    setQuickMenuOpen(false);
    setNotificationOpen(false);
    setQuery("");
  };

  return (
    <main className="app-shell">
      <aside className={`sidebar ${mobileOpen ? "open" : ""}`}>
        <div className="brand">
          <div className="brand-mark" role="img" aria-label="Logo Posto Administrativo" />
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
                openModule(label);
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
            <input
              value={active === "Dashboard" ? query : ""}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={active === "Dashboard" ? "Cari aktivitas terbaru..." : "Gunakan pencarian di dalam modul"}
              disabled={active !== "Dashboard"}
            />
          </label>
          <div className="top-actions">
            <button className="language">ID <span>⌄</span></button>
            <div className="notification-wrap">
              <button
                className="notification"
                aria-label={`${notificationCount} notifikasi administrasi`}
                aria-expanded={notificationOpen}
                aria-haspopup="dialog"
                onClick={() => setNotificationOpen((open) => !open)}
              >
                ♢
                {notificationCount > 0 && <i />}
              </button>
              {notificationOpen && (
                <div className="notification-menu" role="dialog" aria-label="Notifikasi administrasi">
                  <div className="notification-heading">
                    <div><strong>Perlu Perhatian</strong><span>{notificationCount} item perlu diperiksa</span></div>
                    <button onClick={() => setNotificationOpen(false)} aria-label="Tutup notifikasi">×</button>
                  </div>
                  {notificationCount > 0 ? (
                    <>
                      {(stats?.incomingUnfollowed ?? 0) > 0 && <button onClick={() => openModule("Surat Masuk")}>
                        <span>Surat masuk</span>
                        <strong>{stats?.incomingUnfollowed ?? 0}</strong>
                        <small>Belum ditindaklanjuti</small>
                      </button>}
                      {(stats?.outgoingPending ?? 0) > 0 && <button onClick={() => openModule("Surat Keluar")}>
                        <span>Surat keluar</span>
                        <strong>{stats?.outgoingPending ?? 0}</strong>
                        <small>Menunggu persetujuan</small>
                      </button>}
                      {(stats?.unverifiedExpenseCount ?? 0) > 0 && <button onClick={() => openModule("Anggaran")}>
                        <span>Pengeluaran</span>
                        <strong>{stats?.unverifiedExpenseCount ?? 0}</strong>
                        <small>Belum diverifikasi · {selectedYear}</small>
                      </button>}
                    </>
                  ) : <p>Tidak ada data yang memerlukan perhatian saat ini.</p>}
                </div>
              )}
            </div>
            <div className="top-avatar" title={currentUser?.email}>{initials}</div>
          </div>
        </header>

        {active === "Surat Masuk" ? <IncomingMail initialOpenCreate={quickCreate?.module === active} /> : active === "Surat Keluar" ? <OutgoingMail initialOpenCreate={quickCreate?.module === active} /> : active === "Data Penduduk" ? <ResidentData initialOpenCreate={quickCreate?.module === active} /> : active === "Laporan Kegiatan" ? <ActivityReports initialOpenCreate={quickCreate?.module === active} /> : active === "Anggaran" ? <Finance openDialog={quickCreate?.module === active && (quickCreate.mode === "budget" || quickCreate.mode === "expense") ? quickCreate.mode : null} /> : active === "Arsip Dokumen" ? <DocumentArchive initialOpenCreate={quickCreate?.module === active} /> : active === "Pengaturan" ? <Settings /> : <div className="page">
          <div className="page-heading">
            <div>
              <p className="eyebrow">{new Date().toLocaleDateString("id-ID", { weekday: "long", year: "numeric", month: "long", day: "numeric" }).toUpperCase()}</p>
              <h1>{active}</h1>
              <p>Selamat datang kembali. Berikut ringkasan administrasi hari ini.</p>
              <span className={`role-guidance role-${(currentUser?.role ?? "loading").toLowerCase()}`}>
                <strong>{currentUser?.role ?? "Memuat akses"}</strong>
                {dashboardRoleMessage(currentUser?.role)}
              </span>
              <small className="last-updated">{lastUpdated ? `Terakhir diperbarui pukul ${lastUpdated} · otomatis setiap 5 menit` : "Menunggu data terbaru..."}</small>
            </div>
            <div className="dashboard-actions">
              <label className="dashboard-year">
                <span>Tahun</span>
                <select
                  value={selectedYear}
                  onChange={(event) => {
                    setSelectedYear(Number(event.target.value));
                    setQuery("");
                    setQuickMenuOpen(false);
                  }}
                  disabled={loading}
                >
                  {(data?.filters.availableYears ?? [selectedYear]).map((year) => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
              </label>
              <button className="dashboard-refresh" onClick={loadDashboard} disabled={loading}>
                <span aria-hidden="true">↻</span> {loading ? "Memuat..." : "Segarkan"}
              </button>
              {availableQuickActions.length > 0 && <div className="quick-action">
                <button
                  className="primary-button"
                  aria-expanded={quickMenuOpen}
                  aria-haspopup="menu"
                  onClick={() => setQuickMenuOpen((open) => !open)}
                >
                  <span>＋</span> Tambah Data Baru
                </button>
                {quickMenuOpen && (
                  <div className="quick-menu" role="menu">
                    <strong>Pilih modul</strong>
                    {availableQuickActions.map((action) => (
                      <button key={action.label} role="menuitem" onClick={() => openQuickCreate(action.module, action.mode)}>
                        <span>{action.label}</span>
                        <small>{action.description}</small>
                      </button>
                    ))}
                  </div>
                )}
              </div>}
            </div>
          </div>

          <section className="stats-grid" aria-label="Ringkasan">
            <article className="stat-card blue">
              <div className="stat-top"><span className="stat-icon">↓</span><span className="trend">{stats?.incomingUnfollowed ?? 0} belum ditindaklanjuti</span></div>
              <p>Surat Masuk</p><strong>{stats?.incomingTotal ?? 0}</strong><small>Total surat masuk tersimpan</small>
            </article>
            <article className="stat-card cyan">
              <div className="stat-top"><span className="stat-icon">↑</span><span className="trend">{stats?.outgoingPending ?? 0} menunggu</span></div>
              <p>Surat Keluar</p><strong>{stats?.outgoingTotal ?? 0}</strong><small>{stats?.outgoingPending ?? 0} menunggu persetujuan</small>
            </article>
            <article className="stat-card amber">
              <div className="stat-top"><span className="stat-icon">♙</span><span className="muted-badge">{new Date().getFullYear()}</span></div>
              <p>Total Penduduk</p><strong>{(stats?.residentTotal ?? 0).toLocaleString("id-ID")}</strong><small>{(stats?.householdHeads ?? 0).toLocaleString("id-ID")} kepala keluarga</small>
            </article>
            <article className="stat-card violet">
              <div className="stat-top"><span className="stat-icon">□</span><span className="muted-badge">{stats?.documentTotal ?? 0} file</span></div>
              <p>Arsip Dokumen</p><strong>{stats?.documentTotal ?? 0}</strong><small>Total dokumen yang diarsipkan</small>
            </article>
          </section>

          {dashboardError && (
            <section className="dashboard-error" role="alert">
              <div>
                <strong>Dashboard belum dapat dimuat</strong>
                <p>{dashboardError}</p>
              </div>
              <button onClick={loadDashboard}>Coba Lagi</button>
            </section>
          )}

          <DashboardCharts
            year={selectedYear}
            incoming={selectedData?.charts.incomingByMonth ?? []}
            outgoing={selectedData?.charts.outgoingByMonth ?? []}
            expenses={selectedData?.charts.expensesByMonth ?? []}
            totalBudget={stats?.totalBudget ?? 0}
            totalExpense={stats?.totalExpense ?? 0}
          />

          <DashboardInsights
            year={selectedYear}
            reportsTotal={stats?.reportsTotal ?? 0}
            reportsDraft={stats?.reportsDraft ?? 0}
            reportsComplete={stats?.reportsComplete ?? 0}
            reportsThisMonth={stats?.reportsThisMonth ?? 0}
            unverifiedExpenseCount={stats?.unverifiedExpenseCount ?? 0}
            unverifiedExpenseAmount={stats?.unverifiedExpenseAmount ?? 0}
            totalBudget={stats?.totalBudget ?? 0}
            totalExpense={stats?.totalExpense ?? 0}
            budgetUsagePercent={stats?.budgetUsagePercent ?? 0}
            residentsByGender={selectedData?.insights.residentsByGender ?? []}
          />

          <section className="dashboard-grid">
            <DashboardActivityFeed
              activities={selectedData?.recentActivities ?? []}
              query={query}
              year={selectedYear}
              loading={loading}
              error={Boolean(dashboardError)}
              onOpenModule={openModule}
            />

            <article className="panel task-panel">
              <div className="panel-title">
                <div><h2>Status Data</h2><p>Ringkasan data yang perlu diperhatikan</p></div>
                <span className="task-count">{(stats?.incomingUnfollowed ?? 0) + (stats?.outgoingPending ?? 0)}</span>
              </div>
              <div className="task-list">
                {loading ? <p className="empty">Memuat status data...</p> : dashboardError ? <p className="empty">Status data tidak dapat ditampilkan.</p> : (stats?.incomingUnfollowed ?? 0) + (stats?.outgoingPending ?? 0) === 0 ? (
                  <p className="empty">Tidak ada surat yang menunggu tindak lanjut atau persetujuan.</p>
                ) : (
                  <>
                    <div className="task"><span>{stats?.incomingUnfollowed ?? 0} surat masuk belum ditindaklanjuti</span></div>
                    <div className="task"><span>{stats?.outgoingPending ?? 0} surat keluar menunggu persetujuan</span></div>
                  </>
                )}
              </div>
            </article>
          </section>

          <section className="bottom-grid">
            <article className="panel budget">
              <div className="panel-title"><div><h2>Ringkasan Anggaran</h2><p>Tahun anggaran {stats?.budgetYear ?? new Date().getFullYear()}</p></div><button onClick={() => setActive("Anggaran")}>Detail →</button></div>
              <div className="budget-row">
                <div><span>Total Anggaran</span><strong>{money(stats?.totalBudget ?? 0)}</strong></div>
                <div><span>Realisasi</span><strong>{money(stats?.totalExpense ?? 0)}</strong></div>
                <div><span>Sisa Anggaran</span><strong className="green">{money(stats?.remainingBudget ?? 0)}</strong></div>
              </div>
              <div className="progress"><i style={{ width: `${progressPercent}%` }} /></div>
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
