"use client";

import { useMemo, useState } from "react";
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

const activities = [
  { title: "Surat dari Autoridade Municipal", meta: "Surat masuk • Hari ini, 09:42", badge: "Baru" },
  { title: "Reunião mensal ho Chefe de Suco", meta: "Laporan kegiatan • Kemarin, 16:10", badge: "Selesai" },
  { title: "Pembelian tinta printer", meta: "Pengeluaran • 29 Juli 2026", badge: "$48" },
  { title: "Daftar keluarga Suco Laran", meta: "Data penduduk • 28 Juli 2026", badge: "Diperbarui" },
];

const initialTasks = [
  { label: "Tindak lanjuti surat No. 124/AM/VII/2026", done: false },
  { label: "Lengkapi laporan kegiatan bulan Juli", done: false },
  { label: "Verifikasi bukti pengeluaran operasional", done: true },
];

export default function Home() {
  const [active, setActive] = useState("Dashboard");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [tasks, setTasks] = useState(initialTasks);
  const [query, setQuery] = useState("");

  const filtered = useMemo(
    () => activities.filter((item) => item.title.toLowerCase().includes(query.toLowerCase())),
    [query],
  );

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
            <div className="avatar">NP</div>
            <div><strong>Nivio Pereira</strong><span>Administrator</span></div>
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
            <div className="top-avatar">NP</div>
          </div>
        </header>

        {active === "Surat Masuk" ? <IncomingMail /> : active === "Surat Keluar" ? <OutgoingMail /> : active === "Data Penduduk" ? <ResidentData /> : active === "Laporan Kegiatan" ? <ActivityReports /> : active === "Anggaran" ? <Finance /> : active === "Arsip Dokumen" ? <DocumentArchive /> : active === "Pengaturan" ? <Settings /> : <div className="page">
          <div className="page-heading">
            <div>
              <p className="eyebrow">JUMAT, 31 JULI 2026</p>
              <h1>{active}</h1>
              <p>Selamat datang kembali. Berikut ringkasan administrasi hari ini.</p>
            </div>
            <button className="primary-button" onClick={() => alert("Formulir data baru akan dibuat pada tahap berikutnya.")}>
              <span>＋</span> Tambah Data Baru
            </button>
          </div>

          <section className="stats-grid" aria-label="Ringkasan">
            <article className="stat-card blue">
              <div className="stat-top"><span className="stat-icon">↓</span><span className="trend">+12%</span></div>
              <p>Surat Masuk</p><strong>128</strong><small>15 belum ditindaklanjuti</small>
            </article>
            <article className="stat-card cyan">
              <div className="stat-top"><span className="stat-icon">↑</span><span className="trend">+8%</span></div>
              <p>Surat Keluar</p><strong>96</strong><small>7 menunggu persetujuan</small>
            </article>
            <article className="stat-card amber">
              <div className="stat-top"><span className="stat-icon">♙</span><span className="muted-badge">2026</span></div>
              <p>Total Penduduk</p><strong>12.480</strong><small>2.946 kepala keluarga</small>
            </article>
            <article className="stat-card violet">
              <div className="stat-top"><span className="stat-icon">□</span><span className="muted-badge">87%</span></div>
              <p>Arsip Dokumen</p><strong>1.842</strong><small>Penggunaan penyimpanan</small>
            </article>
          </section>

          <section className="dashboard-grid">
            <article className="panel activity-panel">
              <div className="panel-title">
                <div><h2>Aktivitas Terbaru</h2><p>Perubahan data dan dokumen terakhir</p></div>
                <button>Lihat Semua →</button>
              </div>
              <div className="activity-list">
                {filtered.length ? filtered.map((item, index) => (
                  <div className="activity" key={item.title}>
                    <span className={`activity-icon a${index}`}>{["↓", "▤", "$", "♙"][index]}</span>
                    <div><strong>{item.title}</strong><span>{item.meta}</span></div>
                    <em>{item.badge}</em>
                  </div>
                )) : <p className="empty">Tidak ada data yang cocok dengan pencarian.</p>}
              </div>
            </article>

            <article className="panel task-panel">
              <div className="panel-title">
                <div><h2>Tugas Hari Ini</h2><p>{tasks.filter((t) => !t.done).length} tugas perlu diselesaikan</p></div>
                <span className="task-count">{tasks.filter((t) => !t.done).length}</span>
              </div>
              <div className="task-list">
                {tasks.map((task, index) => (
                  <label className={task.done ? "task done" : "task"} key={task.label}>
                    <input
                      type="checkbox"
                      checked={task.done}
                      onChange={() => setTasks((old) => old.map((t, i) => i === index ? { ...t, done: !t.done } : t))}
                    />
                    <span>{task.label}</span>
                  </label>
                ))}
              </div>
              <button className="add-task" onClick={() => setTasks((old) => [...old, { label: "Tugas baru (contoh)", done: false }])}>＋ Tambah Tugas</button>
            </article>
          </section>

          <section className="bottom-grid">
            <article className="panel budget">
              <div className="panel-title"><div><h2>Ringkasan Anggaran</h2><p>Tahun anggaran 2026</p></div><button>Detail →</button></div>
              <div className="budget-row">
                <div><span>Total Anggaran</span><strong>$48.500</strong></div>
                <div><span>Realisasi</span><strong>$31.240</strong></div>
                <div><span>Sisa Anggaran</span><strong className="green">$17.260</strong></div>
              </div>
              <div className="progress"><i style={{ width: "64%" }} /></div>
              <small>64% anggaran telah digunakan</small>
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
