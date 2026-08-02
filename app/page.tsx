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
import UserProfile from "./components/UserProfile";
import LanguageSwitcher from "./components/LanguageSwitcher";
import { useLanguage } from "./components/LanguageProvider";
import Icon, { type IconName } from "./components/Icon";
import { formatLongDate } from "./i18n";
import { canUseDashboardQuickAction, dashboardRoleMessage } from "./dashboard-access";

const menu = [
  ["Dashboard", "dashboard"],
  ["Surat Masuk", "inbox"],
  ["Surat Keluar", "send"],
  ["Data Penduduk", "users"],
  ["Laporan Kegiatan", "report"],
  ["Anggaran", "wallet"],
  ["Arsip Dokumen", "archive"],
] satisfies Array<[string, IconName]>;

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

type GlobalSearchResult = {
  id: number;
  module: string;
  title: string;
  detail: string;
  date: string;
};

const money = (cents: number) => `$${(cents / 100).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

export default function Home() {
  const { locale, t } = useLanguage();
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
  const [globalResults, setGlobalResults] = useState<GlobalSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  const loadDashboard = useCallback(() => {
    let activeRequest = true;
    setLoading(true);
    setDashboardError("");
    fetch(`/api/dashboard?year=${selectedYear}`)
      .then(async (response) => {
        const result = await response.json();
        if (response.status === 401) {
          window.location.assign("/login");
          throw new Error("Akses staf perlu diperiksa.");
        }
        if (
          response.status === 403 &&
          result.code === "PASSWORD_CHANGE_REQUIRED"
        ) {
          window.location.assign("/change-password");
          throw new Error("Kata sandi perlu diganti.");
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
    if (query.trim().length < 2) {
      return;
    }
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setSearching(true);
      try {
        const response = await fetch(
          `/api/search?q=${encodeURIComponent(query.trim())}`,
          { signal: controller.signal },
        );
        const result = await response.json();
        if (response.ok) setGlobalResults(result.results ?? []);
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

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
  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.assign("/login");
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
          <p className="nav-label">{t("MENU UTAMA")}</p>
          {menu.map(([label, icon]) => (
            <button
              className={active === label ? "nav-item active" : "nav-item"}
              key={label}
              onClick={() => {
                openModule(label);
              }}
            >
              <span className="nav-icon"><Icon name={icon} /></span>
              {t(label)}
            </button>
          ))}
        </nav>

        <div className="sidebar-footer">
          <button className={active === "Pengaturan" ? "nav-item active" : "nav-item"} onClick={() => { setActive("Pengaturan"); setMobileOpen(false); }}><span className="nav-icon"><Icon name="settings" /></span>{t("Pengaturan")}</button>
          <button className="user-card" onClick={() => { setActive("Profil"); setMobileOpen(false); }}>
            <div className="avatar">{initials}</div>
            <div><strong>{currentUser?.displayName ?? "Pengguna"}</strong><span>{t(currentUser?.role ?? "Memuat...")}</span></div>
            <span className="more">•••</span>
          </button>
          <button className="dashboard-logout" onClick={logout}>{t("Keluar dari akun")}</button>
        </div>
      </aside>

      {mobileOpen && <button className="backdrop" aria-label={t("Tutup menu")} onClick={() => setMobileOpen(false)} />}

      <section className="content">
        <header className="topbar">
          <button className="menu-button" onClick={() => setMobileOpen(true)} aria-label={t("Buka menu")}><Icon name="menu" /></button>
          <div className="search">
            <span><Icon name="search" /></span>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => setSearchOpen(true)}
              placeholder={t("Cari surat, penduduk, laporan, atau arsip...")}
            />
            {searchOpen && query.trim().length >= 2 && (
              <div className="global-search-results">
                <div><strong>{t("Hasil pencarian")}</strong><button onClick={() => setSearchOpen(false)}>×</button></div>
                {searching ? <p>{t("Memuat hasil...")}</p> : globalResults.length === 0 ? <p>{t("Tidak ada data yang cocok.")}</p> : globalResults.map((result) => (
                  <button key={`${result.module}-${result.id}`} onClick={() => { openModule(result.module); setSearchOpen(false); }}>
                    <span>{t(result.module)}</span><strong>{result.title}</strong><small>{result.detail}</small>
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="top-actions">
            <LanguageSwitcher />
            <div className="notification-wrap">
              <button
                className="notification"
                aria-label={`${notificationCount} ${t("notifikasi administrasi")}`}
                aria-expanded={notificationOpen}
                aria-haspopup="dialog"
                onClick={() => setNotificationOpen((open) => !open)}
              >
                <Icon name="bell" size={20} />
                {notificationCount > 0 && <i />}
              </button>
              {notificationOpen && (
                <div className="notification-menu" role="dialog" aria-label="Notifikasi administrasi">
                  <div className="notification-heading">
                    <div><strong>{t("Perlu Perhatian")}</strong><span>{notificationCount} {t("item perlu diperiksa")}</span></div>
                    <button onClick={() => setNotificationOpen(false)} aria-label={t("Tutup notifikasi")}>×</button>
                  </div>
                  {notificationCount > 0 ? (
                    <>
                      {(stats?.incomingUnfollowed ?? 0) > 0 && <button onClick={() => openModule("Surat Masuk")}>
                        <span>{t("Surat masuk")}</span>
                        <strong>{stats?.incomingUnfollowed ?? 0}</strong>
                        <small>{t("Belum ditindaklanjuti")}</small>
                      </button>}
                      {(stats?.outgoingPending ?? 0) > 0 && <button onClick={() => openModule("Surat Keluar")}>
                        <span>{t("Surat keluar")}</span>
                        <strong>{stats?.outgoingPending ?? 0}</strong>
                        <small>{t("Menunggu persetujuan")}</small>
                      </button>}
                      {(stats?.unverifiedExpenseCount ?? 0) > 0 && <button onClick={() => openModule("Anggaran")}>
                        <span>{t("Pengeluaran")}</span>
                        <strong>{stats?.unverifiedExpenseCount ?? 0}</strong>
                        <small>{t("Belum diverifikasi")} · {selectedYear}</small>
                      </button>}
                    </>
                  ) : <p>{t("Tidak ada data yang memerlukan perhatian saat ini.")}</p>}
                </div>
              )}
            </div>
            <div className="top-avatar" title={currentUser?.email}>{initials}</div>
          </div>
        </header>

        {active === "Surat Masuk" ? <IncomingMail initialOpenCreate={quickCreate?.module === active} /> : active === "Surat Keluar" ? <OutgoingMail initialOpenCreate={quickCreate?.module === active} /> : active === "Data Penduduk" ? <ResidentData initialOpenCreate={quickCreate?.module === active} /> : active === "Laporan Kegiatan" ? <ActivityReports initialOpenCreate={quickCreate?.module === active} /> : active === "Anggaran" ? <Finance openDialog={quickCreate?.module === active && (quickCreate.mode === "budget" || quickCreate.mode === "expense") ? quickCreate.mode : null} /> : active === "Arsip Dokumen" ? <DocumentArchive initialOpenCreate={quickCreate?.module === active} /> : active === "Pengaturan" ? <Settings /> : active === "Profil" ? <UserProfile /> : <div className="page">
          <div className="page-heading">
            <div>
              <p className="eyebrow">{formatLongDate(new Date(), locale).toUpperCase()}</p>
              <h1>{t(active)}</h1>
              <p>{t("Selamat datang kembali. Berikut ringkasan administrasi hari ini.")}</p>
              <span className={`role-guidance role-${(currentUser?.role ?? "loading").toLowerCase()}`}>
                <strong>{t(currentUser?.role ?? "Memuat akses")}</strong>
                {t(dashboardRoleMessage(currentUser?.role))}
              </span>
              <small className="last-updated">{lastUpdated ? `${t("Terakhir diperbarui pukul")} ${lastUpdated} · ${t("otomatis setiap 5 menit")}` : t("Menunggu data terbaru...")}</small>
            </div>
            <div className="dashboard-actions">
              <label className="dashboard-year">
                <span>{t("Tahun")}</span>
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
                <Icon name="refresh" /> {loading ? t("Memuat...") : t("Muat Ulang")}
              </button>
              {availableQuickActions.length > 0 && <div className="quick-action">
                <button
                  className="primary-button"
                  aria-expanded={quickMenuOpen}
                  aria-haspopup="menu"
                  onClick={() => setQuickMenuOpen((open) => !open)}
                >
                <span><Icon name="plus" /></span> {t("Tambah Data Baru")}
                </button>
                {quickMenuOpen && (
                  <div className="quick-menu" role="menu">
                    <strong>{t("Pilih modul")}</strong>
                    {availableQuickActions.map((action) => (
                      <button key={action.label} role="menuitem" onClick={() => openQuickCreate(action.module, action.mode)}>
                        <span>{t(action.label)}</span>
                        <small>{t(action.description)}</small>
                      </button>
                    ))}
                  </div>
                )}
              </div>}
            </div>
          </div>

          <section className="stats-grid" aria-label={t("Ringkasan")}>
            <article className="stat-card blue">
              <div className="stat-top"><span className="stat-icon"><Icon name="inbox" /></span><span className="trend">{stats?.incomingUnfollowed ?? 0} {t("belum ditindaklanjuti")}</span></div>
              <p>{t("Surat Masuk")}</p><strong>{stats?.incomingTotal ?? 0}</strong><small>{t("Total surat masuk tersimpan")}</small>
            </article>
            <article className="stat-card cyan">
              <div className="stat-top"><span className="stat-icon"><Icon name="send" /></span><span className="trend">{stats?.outgoingPending ?? 0} {t("menunggu")}</span></div>
              <p>{t("Surat Keluar")}</p><strong>{stats?.outgoingTotal ?? 0}</strong><small>{stats?.outgoingPending ?? 0} {t("Menunggu persetujuan")}</small>
            </article>
            <article className="stat-card amber">
              <div className="stat-top"><span className="stat-icon"><Icon name="users" /></span><span className="muted-badge">{new Date().getFullYear()}</span></div>
              <p>{t("Data Penduduk")}</p><strong>{(stats?.residentTotal ?? 0).toLocaleString("id-ID")}</strong><small>{(stats?.householdHeads ?? 0).toLocaleString("id-ID")} {t("kepala keluarga")}</small>
            </article>
            <article className="stat-card violet">
              <div className="stat-top"><span className="stat-icon"><Icon name="archive" /></span><span className="muted-badge">{stats?.documentTotal ?? 0} {t("file")}</span></div>
              <p>{t("Arsip Dokumen")}</p><strong>{stats?.documentTotal ?? 0}</strong><small>{t("Total dokumen yang diarsipkan")}</small>
            </article>
          </section>

          {dashboardError && (
            <section className="dashboard-error" role="alert">
              <div>
                <strong>{t("Dashboard belum dapat dimuat")}</strong>
                <p>{t(dashboardError)}</p>
              </div>
              <button onClick={loadDashboard}>{t("Coba Lagi")}</button>
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
                <div><h2>{t("Status Data")}</h2><p>{t("Ringkasan data yang perlu diperhatikan")}</p></div>
                <span className="task-count">{(stats?.incomingUnfollowed ?? 0) + (stats?.outgoingPending ?? 0)}</span>
              </div>
              <div className="task-list">
                {loading ? <p className="empty">{t("Memuat status data...")}</p> : dashboardError ? <p className="empty">{t("Status data tidak dapat ditampilkan.")}</p> : (stats?.incomingUnfollowed ?? 0) + (stats?.outgoingPending ?? 0) === 0 ? (
                  <p className="empty">{t("Tidak ada surat yang menunggu tindak lanjut atau persetujuan.")}</p>
                ) : (
                  <>
                    <div className="task"><span>{stats?.incomingUnfollowed ?? 0} {t("surat masuk belum ditindaklanjuti")}</span></div>
                    <div className="task"><span>{stats?.outgoingPending ?? 0} {t("surat keluar menunggu persetujuan")}</span></div>
                  </>
                )}
              </div>
            </article>
          </section>

          <section className="bottom-grid">
            <article className="panel budget">
              <div className="panel-title"><div><h2>{t("Ringkasan Anggaran")}</h2><p>{t("Tahun anggaran")} {stats?.budgetYear ?? new Date().getFullYear()}</p></div><button onClick={() => setActive("Anggaran")}>{t("Detail")} →</button></div>
              <div className="budget-row">
                <div><span>{t("Total Anggaran")}</span><strong>{money(stats?.totalBudget ?? 0)}</strong></div>
                <div><span>{t("Realisasi")}</span><strong>{money(stats?.totalExpense ?? 0)}</strong></div>
                <div><span>{t("Sisa Anggaran")}</span><strong className="green">{money(stats?.remainingBudget ?? 0)}</strong></div>
              </div>
              <div className="progress"><i style={{ width: `${progressPercent}%` }} /></div>
              <small>{budgetPercent}% {t("anggaran telah digunakan")}</small>
            </article>
            <article className="tip">
              <div className="tip-icon"><Icon name="check" /></div>
              <div><strong>{t("Data contoh untuk pembelajaran")}</strong><p>{t("Belum ada data asli masyarakat atau kantor yang digunakan dalam sistem ini.")}</p></div>
            </article>
          </section>
        </div>}
      </section>
    </main>
  );
}
