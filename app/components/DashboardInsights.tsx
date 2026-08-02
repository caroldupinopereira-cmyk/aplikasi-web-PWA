"use client";

import { classifyBudget } from "../api/dashboard/calculations";
import { useLanguage } from "./LanguageProvider";

type GenderSummary = {
  label: string;
  value: number;
};

type DashboardInsightsProps = {
  year: number;
  reportsTotal: number;
  reportsDraft: number;
  reportsComplete: number;
  reportsThisMonth: number;
  unverifiedExpenseCount: number;
  unverifiedExpenseAmount: number;
  totalBudget: number;
  totalExpense: number;
  budgetUsagePercent: number;
  residentsByGender: GenderSummary[];
};

const money = (cents: number) =>
  `$${(cents / 100).toLocaleString("en-US", {
    maximumFractionDigits: 0,
  })}`;

export default function DashboardInsights({
  year,
  reportsTotal,
  reportsDraft,
  reportsComplete,
  reportsThisMonth,
  unverifiedExpenseCount,
  unverifiedExpenseAmount,
  totalBudget,
  totalExpense,
  budgetUsagePercent,
  residentsByGender,
}: DashboardInsightsProps) {
  const { t } = useLanguage();
  const residentTotal = residentsByGender.reduce((sum, item) => sum + item.value, 0);
  const budgetLevel = classifyBudget(totalBudget, totalExpense, budgetUsagePercent);
  const budgetStatus =
    budgetLevel === "neutral"
      ? { level: "neutral", title: t("Anggaran belum tersedia"), text: `${t("Belum ada anggaran untuk tahun")} ${year}.` }
      : budgetLevel === "danger"
        ? { level: "danger", title: t("Anggaran terlampaui"), text: `${t("Realisasi melebihi anggaran sebesar")} ${money(totalExpense - totalBudget)}.` }
        : budgetLevel === "warning"
          ? { level: "warning", title: t("Anggaran hampir habis"), text: `${budgetUsagePercent}% ${t("anggaran tahun")} ${year} ${t("telah digunakan.")}` }
          : { level: "safe", title: t("Penggunaan anggaran terkendali"), text: `${budgetUsagePercent}% ${t("anggaran tahun")} ${year} ${t("telah digunakan.")}` };

  return (
    <section className="insights-grid" aria-label={t("Ringkasan operasional")}>
      <article className="panel insight-panel">
        <div className="panel-title">
          <div><h2>{t("Laporan Kegiatan")}</h2><p>{t("Status laporan tahun")} {year}</p></div>
          <span className="insight-total">{reportsTotal}</span>
        </div>
        <div className="insight-metrics">
          <div><span>{t("Bulan ini")}</span><strong>{reportsThisMonth}</strong></div>
          <div><span>{t("Draf")}</span><strong>{reportsDraft}</strong></div>
          <div><span>{t("Selesai")}</span><strong>{reportsComplete}</strong></div>
        </div>
        {reportsTotal === 0 && <p className="insight-empty">{t("Belum ada laporan kegiatan pada tahun")} {year}.</p>}
      </article>

      <article className="panel insight-panel">
        <div className="panel-title">
          <div><h2>{t("Komposisi Penduduk")}</h2><p>{t("Jumlah agregat tanpa identitas pribadi")}</p></div>
          <span className="insight-total">{residentTotal}</span>
        </div>
        <div className="gender-summary">
          {residentsByGender.length ? residentsByGender.map((item, index) => {
            const percent = residentTotal ? Math.round((item.value / residentTotal) * 100) : 0;
            return (
              <div key={item.label}>
                <span>{t(item.label)}<strong>{item.value} ({percent}%)</strong></span>
                <i><b className={`gender-fill g${index % 3}`} style={{ width: `${percent}%` }} /></i>
              </div>
            );
          }) : <p className="insight-empty">{t("Belum ada data penduduk.")}</p>}
        </div>
      </article>

      <article className="panel insight-panel">
        <div className="panel-title">
          <div><h2>{t("Peringatan Administrasi")}</h2><p>{t("Hal yang perlu diperhatikan")}</p></div>
        </div>
        <div className="warning-list">
          <div className={`warning-item ${budgetStatus.level}`}>
            <strong>{budgetStatus.title}</strong>
            <span>{budgetStatus.text}</span>
          </div>
          <div className={`warning-item ${unverifiedExpenseCount ? "warning" : "safe"}`}>
            <strong>{unverifiedExpenseCount ? `${unverifiedExpenseCount} ${t("pengeluaran belum diverifikasi")}` : t("Verifikasi pengeluaran selesai")}</strong>
            <span>{unverifiedExpenseCount ? `${t("Total menunggu verifikasi")}: ${money(unverifiedExpenseAmount)}.` : `${t("Tidak ada pengeluaran tahun")} ${year} ${t("yang menunggu verifikasi.")}`}</span>
          </div>
        </div>
      </article>
    </section>
  );
}
