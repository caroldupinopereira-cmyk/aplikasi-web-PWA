"use client";

import { useMemo, useState } from "react";

export type DashboardActivity = {
  title: string;
  meta: string;
  badge: string;
  type: string;
  date: string;
  actorName: string;
};

type DashboardActivityFeedProps = {
  activities: DashboardActivity[];
  query: string;
  year: number;
  loading: boolean;
  error: boolean;
  onOpenModule: (module: string) => void;
};

const moduleTargets: Record<string, string> = {
  "Surat Masuk": "Surat Masuk",
  "Surat Keluar": "Surat Keluar",
  "Data Penduduk": "Data Penduduk",
  "Laporan Kegiatan": "Laporan Kegiatan",
  Keuangan: "Anggaran",
  "Arsip Dokumen": "Arsip Dokumen",
  Pengaturan: "Pengaturan",
  Keamanan: "Pengaturan",
};

const activityIcon = (type: string) =>
  type === "incoming" ? "↓"
    : type === "outgoing" ? "↑"
      : type === "resident" ? "♙"
        : type === "report" ? "▤"
          : type === "document" ? "□"
            : type === "settings" ? "⚙"
              : type === "expense" ? "$"
                : "•";

function activityTime(value: string) {
  const normalized = value.includes("T") ? value : `${value.replace(" ", "T")}Z`;
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("id-ID", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function DashboardActivityFeed({
  activities,
  query,
  year,
  loading,
  error,
  onOpenModule,
}: DashboardActivityFeedProps) {
  const [moduleFilter, setModuleFilter] = useState("Semua");
  const [showAll, setShowAll] = useState(false);
  const modules = useMemo(
    () => Array.from(new Set(activities.map((item) => item.badge))).sort(),
    [activities],
  );
  const filtered = useMemo(() => {
    const search = query.trim().toLowerCase();
    return activities.filter((item) => {
      const matchesModule = moduleFilter === "Semua" || item.badge === moduleFilter;
      const matchesSearch = !search || [
        item.title,
        item.meta,
        item.actorName,
        item.badge,
      ].some((value) => value.toLowerCase().includes(search));
      return matchesModule && matchesSearch;
    });
  }, [activities, moduleFilter, query]);
  const visibleActivities = showAll ? filtered : filtered.slice(0, 8);

  return (
    <article className="panel activity-panel">
      <div className="panel-title activity-heading">
        <div><h2>Aktivitas Terbaru</h2><p>Riwayat perubahan tahun {year}</p></div>
        <label className="activity-filter">
          <span>Modul</span>
          <select value={moduleFilter} onChange={(event) => setModuleFilter(event.target.value)}>
            <option>Semua</option>
            {modules.map((module) => <option key={module}>{module}</option>)}
          </select>
        </label>
      </div>
      <div className="activity-list">
        {loading ? <p className="empty">Memuat data aktivitas...</p> : visibleActivities.length ? visibleActivities.map((item, index) => {
          const target = moduleTargets[item.badge];
          return (
            <div className="activity activity-detailed" key={`${item.type}-${item.date}-${index}`}>
              <span className={`activity-icon a${index % 4}`}>{activityIcon(item.type)}</span>
              <div className="activity-copy">
                <strong>{item.title}</strong>
                <span>{item.meta}</span>
                <small>{item.actorName} · {activityTime(item.date)}</small>
              </div>
              <div className="activity-side">
                <em>{item.badge}</em>
                {target && <button onClick={() => onOpenModule(target)}>Buka →</button>}
              </div>
            </div>
          );
        }) : <p className="empty">{error ? "Aktivitas tidak dapat ditampilkan." : `Tidak ada aktivitas yang cocok pada tahun ${year}.`}</p>}
      </div>
      {filtered.length > 8 && (
        <button className="activity-more" onClick={() => setShowAll((value) => !value)}>
          {showAll ? "Tampilkan lebih sedikit" : `Lihat semua ${filtered.length} aktivitas`}
        </button>
      )}
    </article>
  );
}
