"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

type Budget = { id: number; budgetYear: number; programName: string; category: string; amountCents: number; notes: string };
type Expense = { id: number; receiptNumber: string; expenseDate: string; description: string; category: string; programName: string; payee: string; paymentMethod: string; amountCents: number; status: string; notes: string };

const expenseBlank = { receiptNumber: "", expenseDate: "2026-07-31", description: "", category: "Operasional", programName: "", payee: "", paymentMethod: "Tunai", amount: 0, notes: "" };
const budgetBlank = { budgetYear: 2026, programName: "", category: "Operasional", amount: 0, notes: "" };
const money = (cents: number) => `$${(cents / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function Finance() {
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialog, setDialog] = useState<"budget" | "expense" | null>(null);
  const [query, setQuery] = useState("");
  const [month, setMonth] = useState("Semua");
  const [expenseForm, setExpenseForm] = useState(expenseBlank);
  const [budgetForm, setBudgetForm] = useState(budgetBlank);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  async function loadFinance() {
    setLoading(true);
    try {
      const response = await fetch("/api/finance"); const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Gagal memuat keuangan.");
      setBudgets(data.budgets); setExpenses(data.expenses);
    } catch { setMessage("Database sedang disiapkan. Coba muat ulang beberapa saat lagi."); }
    finally { setLoading(false); }
  }
  useEffect(() => { void loadFinance(); }, []);

  const months = useMemo(() => Array.from(new Set(expenses.map((e) => e.expenseDate.slice(0, 7)))).sort().reverse(), [expenses]);
  const filtered = useMemo(() => {
    const text = query.toLowerCase();
    return expenses.filter((e) => [e.receiptNumber, e.description, e.programName, e.payee].some((v) => v.toLowerCase().includes(text)) && (month === "Semua" || e.expenseDate.startsWith(month)));
  }, [expenses, query, month]);

  const totalBudget = budgets.reduce((sum, b) => sum + b.amountCents, 0);
  const totalExpense = expenses.reduce((sum, e) => sum + e.amountCents, 0);
  const verified = expenses.filter((e) => e.status === "Diverifikasi").reduce((sum, e) => sum + e.amountCents, 0);
  const percent = totalBudget ? Math.min(100, Math.round(totalExpense / totalBudget * 100)) : 0;

  async function submitBudget(event: FormEvent) {
    event.preventDefault(); setSaving(true);
    try {
      const response = await fetch("/api/finance", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ kind: "budget", ...budgetForm }) });
      const data = await response.json(); if (!response.ok) throw new Error(data.error);
      setBudgets((old) => [data.budget, ...old]); setBudgetForm(budgetBlank); setDialog(null); setMessage("Alokasi anggaran berhasil disimpan.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Gagal menyimpan anggaran."); } finally { setSaving(false); }
  }

  async function submitExpense(event: FormEvent) {
    event.preventDefault(); setSaving(true);
    try {
      const response = await fetch("/api/finance", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ kind: "expense", ...expenseForm }) });
      const data = await response.json(); if (!response.ok) throw new Error(data.error);
      setExpenses((old) => [data.expense, ...old]); setExpenseForm(expenseBlank); setDialog(null); setMessage("Pengeluaran berhasil dicatat.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Gagal mencatat pengeluaran."); } finally { setSaving(false); }
  }

  async function verify(id: number, status: string) {
    const response = await fetch("/api/finance", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, status }) });
    if (response.ok) setExpenses((old) => old.map((e) => e.id === id ? { ...e, status } : e));
  }

  return <div className="page mail-page finance-page">
    <div className="page-heading"><div><p className="eyebrow">KEUANGAN KANTOR</p><h1>Anggaran & Pengeluaran</h1><p>Pantau alokasi, realisasi, bukti transaksi, dan sisa anggaran.</p></div><div className="finance-actions"><button className="secondary-button" onClick={() => setDialog("budget")}>＋ Alokasi Anggaran</button><button className="primary-button mail-add" onClick={() => setDialog("expense")}><span>＋</span> Catat Pengeluaran</button></div></div>
    <section className="mail-stats finance-stats">
      <article><span>Total Anggaran</span><strong>{money(totalBudget)}</strong><small>Tahun anggaran 2026</small></article>
      <article><span>Total Realisasi</span><strong>{money(totalExpense)}</strong><small>{percent}% telah digunakan</small></article>
      <article><span>Terverifikasi</span><strong>{money(verified)}</strong><small>Bukti telah diperiksa</small></article>
      <article><span>Sisa Anggaran</span><strong>{money(totalBudget - totalExpense)}</strong><small>Saldo tersedia</small></article>
    </section>
    <div className="finance-progress"><div><span>Realisasi Anggaran</span><strong>{percent}%</strong></div><div className="progress"><i style={{ width: `${percent}%` }} /></div></div>
    {message && <div className="mail-message">{message}<button onClick={() => setMessage("")}>×</button></div>}
    <section className="panel mail-table-panel"><div className="mail-toolbar">
      <label className="mail-search"><span>⌕</span><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Cari bukti, uraian, program, atau penerima..." /></label>
      <label className="filter-label">Bulan<select value={month} onChange={(e) => setMonth(e.target.value)}><option>Semua</option>{months.map((m) => <option key={m}>{m}</option>)}</select></label>
      <button className="refresh-button" onClick={() => void loadFinance()}>↻ Muat Ulang</button>
    </div><div className="table-wrap"><table className="mail-table finance-table">
      <thead><tr><th>No.</th><th>Transaksi</th><th>Tanggal & Program</th><th>Penerima</th><th>Jumlah</th><th>Verifikasi</th></tr></thead>
      <tbody>{loading ? <tr><td colSpan={6} className="table-empty">Memuat transaksi...</td></tr> : filtered.length === 0 ? <tr><td colSpan={6} className="table-empty">Belum ada pengeluaran yang sesuai.</td></tr> : filtered.map((e, i) => <tr key={e.id}>
        <td>{i + 1}</td><td><strong>{e.description}</strong><small>{e.receiptNumber} • {e.category}</small></td><td><strong>{e.expenseDate}</strong><small>{e.programName}</small></td><td><strong>{e.payee}</strong><small>{e.paymentMethod}</small></td><td className="amount-cell">{money(e.amountCents)}</td>
        <td><select aria-label={`Verifikasi ${e.receiptNumber}`} className={`status-select ${e.status === "Diverifikasi" ? "status-selesai" : "status-draf"}`} value={e.status} onChange={(ev) => void verify(e.id, ev.target.value)}><option>Belum Diverifikasi</option><option>Diverifikasi</option></select></td>
      </tr>)}</tbody>
    </table></div><div className="table-footer">Menampilkan {filtered.length} dari {expenses.length} transaksi</div></section>

    {dialog && <div className="modal-layer" role="presentation" onMouseDown={(e) => e.target === e.currentTarget && setDialog(null)}>
      <section className="mail-modal" role="dialog" aria-modal="true" aria-labelledby="finance-form-title"><div className="modal-heading"><div><p className="eyebrow">FORMULIR KEUANGAN</p><h2 id="finance-form-title">{dialog === "budget" ? "Tambah Alokasi Anggaran" : "Catat Pengeluaran"}</h2></div><button aria-label="Tutup formulir" onClick={() => setDialog(null)}>×</button></div>
      {dialog === "budget" ? <form onSubmit={submitBudget}><div className="form-grid">
        <label>Tahun Anggaran<input type="number" value={budgetForm.budgetYear} onChange={(e) => setBudgetForm({ ...budgetForm, budgetYear: Number(e.target.value) })} /></label>
        <label>Kategori<select value={budgetForm.category} onChange={(e) => setBudgetForm({ ...budgetForm, category: e.target.value })}><option>Operasional</option><option>Program</option><option>Perjalanan</option><option>Perlengkapan</option><option>Pemeliharaan</option></select></label>
        <label className="wide">Nama Program *<input required value={budgetForm.programName} onChange={(e) => setBudgetForm({ ...budgetForm, programName: e.target.value })} placeholder="Nama program atau kegiatan" /></label>
        <label className="wide">Jumlah Anggaran (USD) *<input required min="0.01" step="0.01" type="number" value={budgetForm.amount} onChange={(e) => setBudgetForm({ ...budgetForm, amount: Number(e.target.value) })} /></label>
        <label className="wide">Catatan<textarea rows={3} value={budgetForm.notes} onChange={(e) => setBudgetForm({ ...budgetForm, notes: e.target.value })} /></label>
      </div><div className="form-actions"><button type="button" onClick={() => setDialog(null)}>Batal</button><button className="save-button" disabled={saving}>Simpan Anggaran</button></div></form> :
      <form onSubmit={submitExpense}><div className="form-grid">
        <label>Nomor Bukti *<input required value={expenseForm.receiptNumber} onChange={(e) => setExpenseForm({ ...expenseForm, receiptNumber: e.target.value })} placeholder="Contoh: BKT-2026-001" /></label>
        <label>Tanggal *<input required type="date" value={expenseForm.expenseDate} onChange={(e) => setExpenseForm({ ...expenseForm, expenseDate: e.target.value })} /></label>
        <label className="wide">Uraian Pengeluaran *<input required value={expenseForm.description} onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })} placeholder="Barang atau jasa yang dibayar" /></label>
        <label>Kategori<select value={expenseForm.category} onChange={(e) => setExpenseForm({ ...expenseForm, category: e.target.value })}><option>Operasional</option><option>Perjalanan</option><option>Perlengkapan</option><option>Pemeliharaan</option><option>Kegiatan</option></select></label>
        <label>Metode Pembayaran<select value={expenseForm.paymentMethod} onChange={(e) => setExpenseForm({ ...expenseForm, paymentMethod: e.target.value })}><option>Tunai</option><option>Transfer</option><option>Cek</option></select></label>
        <label>Program/Kegiatan *<input required value={expenseForm.programName} onChange={(e) => setExpenseForm({ ...expenseForm, programName: e.target.value })} placeholder="Program terkait" /></label>
        <label>Penerima *<input required value={expenseForm.payee} onChange={(e) => setExpenseForm({ ...expenseForm, payee: e.target.value })} placeholder="Nama penerima pembayaran" /></label>
        <label className="wide">Jumlah (USD) *<input required min="0.01" step="0.01" type="number" value={expenseForm.amount} onChange={(e) => setExpenseForm({ ...expenseForm, amount: Number(e.target.value) })} /></label>
        <label className="wide">Catatan<textarea rows={3} value={expenseForm.notes} onChange={(e) => setExpenseForm({ ...expenseForm, notes: e.target.value })} /></label>
      </div><div className="form-actions"><button type="button" onClick={() => setDialog(null)}>Batal</button><button className="save-button" disabled={saving}>Simpan Pengeluaran</button></div></form>}
      </section>
    </div>}
  </div>;
}
