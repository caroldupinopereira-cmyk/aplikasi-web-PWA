import { classifyBudget } from "../api/dashboard/calculations";

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
  const residentTotal = residentsByGender.reduce((sum, item) => sum + item.value, 0);
  const budgetLevel = classifyBudget(totalBudget, totalExpense, budgetUsagePercent);
  const budgetStatus =
    budgetLevel === "neutral"
      ? { level: "neutral", title: "Anggaran belum tersedia", text: `Belum ada anggaran untuk tahun ${year}.` }
      : budgetLevel === "danger"
        ? { level: "danger", title: "Anggaran terlampaui", text: `Realisasi melebihi anggaran sebesar ${money(totalExpense - totalBudget)}.` }
        : budgetLevel === "warning"
          ? { level: "warning", title: "Anggaran hampir habis", text: `${budgetUsagePercent}% anggaran tahun ${year} telah digunakan.` }
          : { level: "safe", title: "Penggunaan anggaran terkendali", text: `${budgetUsagePercent}% anggaran tahun ${year} telah digunakan.` };

  return (
    <section className="insights-grid" aria-label="Ringkasan operasional">
      <article className="panel insight-panel">
        <div className="panel-title">
          <div><h2>Laporan Kegiatan</h2><p>Status laporan tahun {year}</p></div>
          <span className="insight-total">{reportsTotal}</span>
        </div>
        <div className="insight-metrics">
          <div><span>Bulan ini</span><strong>{reportsThisMonth}</strong></div>
          <div><span>Draf</span><strong>{reportsDraft}</strong></div>
          <div><span>Selesai</span><strong>{reportsComplete}</strong></div>
        </div>
        {reportsTotal === 0 && <p className="insight-empty">Belum ada laporan kegiatan pada tahun {year}.</p>}
      </article>

      <article className="panel insight-panel">
        <div className="panel-title">
          <div><h2>Komposisi Penduduk</h2><p>Jumlah agregat tanpa identitas pribadi</p></div>
          <span className="insight-total">{residentTotal}</span>
        </div>
        <div className="gender-summary">
          {residentsByGender.length ? residentsByGender.map((item, index) => {
            const percent = residentTotal ? Math.round((item.value / residentTotal) * 100) : 0;
            return (
              <div key={item.label}>
                <span>{item.label}<strong>{item.value} ({percent}%)</strong></span>
                <i><b className={`gender-fill g${index % 3}`} style={{ width: `${percent}%` }} /></i>
              </div>
            );
          }) : <p className="insight-empty">Belum ada data penduduk.</p>}
        </div>
      </article>

      <article className="panel insight-panel">
        <div className="panel-title">
          <div><h2>Peringatan Administrasi</h2><p>Hal yang perlu diperhatikan</p></div>
        </div>
        <div className="warning-list">
          <div className={`warning-item ${budgetStatus.level}`}>
            <strong>{budgetStatus.title}</strong>
            <span>{budgetStatus.text}</span>
          </div>
          <div className={`warning-item ${unverifiedExpenseCount ? "warning" : "safe"}`}>
            <strong>{unverifiedExpenseCount ? `${unverifiedExpenseCount} pengeluaran belum diverifikasi` : "Verifikasi pengeluaran selesai"}</strong>
            <span>{unverifiedExpenseCount ? `Total menunggu verifikasi: ${money(unverifiedExpenseAmount)}.` : `Tidak ada pengeluaran tahun ${year} yang menunggu verifikasi.`}</span>
          </div>
        </div>
      </article>
    </section>
  );
}
