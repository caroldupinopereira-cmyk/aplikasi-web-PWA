type DashboardChartsProps = {
  year: number;
  incoming: number[];
  outgoing: number[];
  expenses: number[];
  totalBudget: number;
  totalExpense: number;
};

const months = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
const money = (cents: number) =>
  `$${(cents / 100).toLocaleString("en-US", {
    maximumFractionDigits: 0,
  })}`;

function height(value: number, maximum: number) {
  if (value <= 0 || maximum <= 0) return "0%";
  return `${Math.max(4, Math.round((value / maximum) * 100))}%`;
}

export default function DashboardCharts({
  year,
  incoming,
  outgoing,
  expenses,
  totalBudget,
  totalExpense,
}: DashboardChartsProps) {
  const maximumLetters = Math.max(0, ...incoming, ...outgoing);
  const maximumExpense = Math.max(0, ...expenses);
  const hasLetters = incoming.some(Boolean) || outgoing.some(Boolean);
  const hasExpenses = expenses.some(Boolean);
  const comparisonMaximum = Math.max(totalBudget, totalExpense, 1);

  return (
    <section className="charts-grid" aria-label={`Grafik Dashboard tahun ${year}`}>
      <article className="panel chart-panel">
        <div className="panel-title">
          <div>
            <h2>Surat per Bulan</h2>
            <p>Surat masuk dan keluar tahun {year}</p>
          </div>
          <div className="chart-legend">
            <span><i className="incoming-dot" />Masuk</span>
            <span><i className="outgoing-dot" />Keluar</span>
          </div>
        </div>
        <div className="monthly-chart">
          {months.map((month, index) => (
            <div className="month-column" key={month}>
              <div className="bar-pair">
                <i
                  className="chart-bar incoming-bar"
                  style={{ height: height(incoming[index] ?? 0, maximumLetters) }}
                  title={`${month}: ${incoming[index] ?? 0} surat masuk`}
                />
                <i
                  className="chart-bar outgoing-bar"
                  style={{ height: height(outgoing[index] ?? 0, maximumLetters) }}
                  title={`${month}: ${outgoing[index] ?? 0} surat keluar`}
                />
              </div>
              <span>{month}</span>
            </div>
          ))}
          {!hasLetters && <p className="chart-empty">Belum ada data surat pada tahun {year}.</p>}
        </div>
      </article>

      <article className="panel chart-panel">
        <div className="panel-title">
          <div>
            <h2>Realisasi Keuangan</h2>
            <p>Pengeluaran per bulan tahun {year}</p>
          </div>
        </div>
        <div className="monthly-chart expense-chart">
          {months.map((month, index) => (
            <div className="month-column" key={month}>
              <div className="bar-pair single">
                <i
                  className="chart-bar expense-bar"
                  style={{ height: height(expenses[index] ?? 0, maximumExpense) }}
                  title={`${month}: ${money(expenses[index] ?? 0)}`}
                />
              </div>
              <span>{month}</span>
            </div>
          ))}
          {!hasExpenses && <p className="chart-empty">Belum ada pengeluaran pada tahun {year}.</p>}
        </div>
        <div className="budget-comparison">
          <div>
            <span>Anggaran <strong>{money(totalBudget)}</strong></span>
            <i><b style={{ width: `${(totalBudget / comparisonMaximum) * 100}%` }} /></i>
          </div>
          <div>
            <span>Realisasi <strong>{money(totalExpense)}</strong></span>
            <i><b className="expense-fill" style={{ width: `${(totalExpense / comparisonMaximum) * 100}%` }} /></i>
          </div>
        </div>
      </article>
    </section>
  );
}
