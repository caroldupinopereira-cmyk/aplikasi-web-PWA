"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Pagination from "./Pagination";
import { exportToCSV } from "../utils/export";
import { useToast, ToastContainer } from "./Toast";

type Budget = { id: number; budgetYear: number; programName: string; category: string; amountCents: number; notes: string };
type Expense = { id: number; receiptNumber: string; expenseDate: string; description: string; category: string; programName: string; payee: string; paymentMethod: string; amountCents: number; status: string; notes: string };

const expenseBlank = { receiptNumber: "", expenseDate: new Date().toISOString().slice(0, 10), description: "", category: "Operasional", programName: "", payee: "", paymentMethod: "Tunai", amount: 0, notes: "" };
const budgetBlank = { budgetYear: new Date().getFullYear(), programName: "", category: "Operasional", amount: 0, notes: "" };
const money = (cents: number) => `$${(cents / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function Finance() {
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialog, setDialog] = useState<"budget" | "expense" | null>(null);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [query, setQuery] = useState("");
  const [month, setMonth] = useState("Semua");
  const [expenseForm, setExpenseForm] = useState(expenseBlank);
  const [budgetForm, setBudgetForm] = useState(budgetBlank);
  const [saving, setSaving] = useState(false);
  const { toasts, addToast, dismiss } = useToast();
  const [page, setPage] = useState(1);
  const perPage = 15;

  async function loadFinance() {
    setLoading(true);
    try {
      const response = await fetch("/api/finance"); const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Gagal memuat keuangan.");
      setBudgets(data.budgets); setExpenses(data.expenses);
    } catch { addToast("Database sedang disiapkan. Coba muat ulang beberapa saat lagi.", "error"); }
    finally { setLoading(false); }
  }
  useEffect(() => { void loadFinance(); }, []);

  const months = useMemo(() => Array.from(new Set(expenses.map((e) => e.expenseDate.slice(0, 7)))).sort().reverse(), [expenses]);
  const filtered = useMemo(() => {
    const text = query.toLowerCase();
    return expenses.filter((e) => [e.receiptNumber, e.description, e.programName, e.payee].some((v) => v.toLowerCase().includes(text)) && (month === "Semua" || e.expenseDate.startsWith(month)));
  }, [expenses, query, month]);

  const paged = useMemo(() => {
    const start = (page - 1) * perPage;
    return filtered.slice(start, start + perPage);
  }, [filtered, page]);

  const totalBudget = budgets.reduce((sum, b) => sum + b.amountCents, 0);
  const totalExpense = expenses.reduce((sum, e) => sum + e.amountCents, 0);
  const verified = expenses.filter((e) => e.status === "Diverifikasi").reduce((sum, e) => sum + e.amountCents, 0);
  const percent = totalBudget ? Math.min(100, Math.round(totalExpense / totalBudget * 100)) : 0;

  function openExpenseForm(expense?: Expense) {
    setPage(1);
    if (expense) {
      setEditingExpense(expense);
      setExpenseForm({
        receiptNumber: expense.receiptNumber,
        expenseDate: expense.expenseDate,
        description: expense.description,
        category: expense.category,
        programName: expense.programName,
        payee: expense.payee,
        paymentMethod: expense.paymentMethod,
        amount: expense.amountCents / 100,
        notes: expense.notes,
      });
    } else {
      setEditingExpense(null);
      setExpenseForm(expenseBlank);
    }
    setDialog("expense");
  }

  async function submitBudget(event: FormEvent) {
    event.preventDefault(); setSaving(true);
    try {
      const response = await fetch("/api/finance", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ kind: "budget", ...budgetForm }) });
      const data = await response.json(); if (!response.ok) throw new Error(data.error);
      setBudgets((old) => [data.budget, ...old]); setBudgetForm(budgetBlank); setDialog(null); addToast("Alokasi anggaran berhasil disimpan.", "success");
    } catch (error) { addToast(error instanceof Error ? error.message : "Gagal menyimpan anggaran.", "error"); } finally { setSaving(false); }
  }

  async function submitExpense(event: FormEvent) {
    event.preventDefault(); setSaving(true);
    try {
      if (editingExpense) {
        const response = await fetch("/api/finance", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: editingExpense.id, ...expenseForm, amountCents: Math.round(expenseForm.amount * 100) }) });
        const data = await response.json(); if (!response.ok) throw new Error(data.error);
        setExpenses((old) => old.map((e) => e.id === editingExpense.id ? { ...e, ...data.expense } : e));
        addToast("Pengeluaran berhasil diperbarui.", "success");
      } else {
        const response = await fetch("/api/finance", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ kind: "expense", ...expenseForm }) });
        const data = await response.json(); if (!response.ok) throw new Error(data.error);
        setExpenses((old) => [data.expense, ...old]);
        addToast("Pengeluaran berhasil dicatat.", "success");
      }
      setExpenseForm(expenseBlank); setEditingExpense(null); setDialog(null);
    } catch (error) { addToast(error instanceof Error ? error.message : "Gagal mencatat pengeluaran.", "error"); } finally { setSaving(false); }
  }

  async function verify(id: number, status: string) {
    const response = await fetch("/api/finance", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, status }) });
    if (response.ok) setExpenses((old) => old.map((e) => e.id === id ? { ...e, status } : e));
  }

  async function removeExpense(id: number) {
    if (!confirm("Hapus pengeluaran ini? Tindakan ini tidak dapat dibatalkan.")) return;
    try {
      const response = await fetch("/api/finance", {
        method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }),
      });
      if (!response.ok) throw new Error("Gagal menghapus pengeluaran.");
      setExpenses((old) => old.filter((e) => e.id !== id));
      addToast("Pengeluaran berhasil dihapus.", "success");
    } catch (error) {
      addToast(error instanceof Error ? error.message : "Gagal menghapus pengeluaran.", "error");
    }
  }

  async function removeBudget(id: number) {
    if (!confirm("Hapus alokasi anggaran ini? Tindakan ini tidak dapat dibatalkan.")) return;
    try {
      const response = await fetch("/api/finance", {
        method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, kind: "budget" }),
      });
      if (!response.ok) throw new Error("Gagal menghapus anggaran.");
      setBudgets((old) => old.filter((b) => b.id !== id));
      addToast("Anggaran berhasil dihapus.", "success");
    } catch (error) {
      addToast(error instanceof Error ? error.message : "Gagal menghapus anggaran.", "error");
    }
  }

  return <div className="page mail-page finance-page">
    <div className="page-heading"><div><p className="eyebrow">KEUANGAN KANTOR</p><h1>Anggaran & Pengeluaran</h1><p>Pantau alokasi, realisasi, bukti transaksi, dan sisa anggaran.</p></div><div className="finance-actions"><button className="secondary-button" onClick={() => { setEditingExpense(null); setBudgetForm(budgetBlank); setDialog("budget"); }}>＋ Alokasi Anggaran</button><button className="primary-button mail-add" onClick={() => openExpenseForm()}><span>＋</span> Catat Pengeluaran</button></div></div>
    <section className="mail-stats finance-stats">
      <article><span>Total Anggaran</span><strong>{money(totalBudget)}</strong><small>Tahun anggaran {new Date().getFullYear()}</small></article>
      <article><span>Total Realisasi</span><strong>{money(totalExpense)}</strong><small>{percent}% telah digunakan</small></article>
      <article><span>Terverifikasi</span><strong>{money(verified)}</strong><small>Bukti telah diperiksa</small></article>
      <article><span>Sisa Anggaran</span><strong>{money(totalBudget - totalExpense)}</strong><small>Saldo tersedia</small></article>
    </section>
    <div className="finance-progress"><div><span>Realisasi Anggaran</span><strong>{percent}%</strong></div><div className="progress"><i style={{ width: `${percent}%` }} /></div></div>

    {budgets.length > 0 && <section className="panel mail-table-panel" style={{ marginTop: 16 }}>
      <div className="panel-title"><div><h2>Alokasi Anggaran</h2><p>Daftar program yang dialokasikan</p></div></div>
      <div className="table-wrap"><table className="mail-table finance-table">
        <thead><tr><th>No.</th><th>Program</th><th>Kategori</th><th>Jumlah</th><th>Catatan</th><th>Aksi</th></tr></thead>
        <tbody>{budgets.map((b, i) => <tr key={b.id}>
          <td>{i + 1}</td><td><strong>{b.programName}</strong><small>Tahun {b.budgetYear}</small></td><td><span className="category-pill">{b.category}</span></td><td className="amount-cell">{money(b.amountCents)}</td><td>{b.notes || "—"}</td>
          <td className="actions-cell"><button className="action-btn delete" onClick={() => void removeBudget(b.id)} title="Hapus">✕</button></td>
        </tr>)}</tbody>
      </table></div>
    </section>}

    <section className="panel mail-table-panel" style={{ marginTop: 16 }}><div className="mail-toolbar">
      <label className="mail-search"><span>⌕</span><input value={query} onChange={(e) => { setQuery(e.target.value); setPage(1); }} placeholder="Cari bukti, uraian, program, atau penerima..." /></label>
      <label className="filter-label">Bulan<select value={month} onChange={(e) => { setMonth(e.target.value); setPage(1); }}><option>Semua</option>{months.map((m) => <option key={m}>{m}</option>)}</select></label>
      <button className="refresh-button" onClick={() => void loadFinance()}>↻ Muat Ulang</button>
      <button className="export-button" onClick={() => exportToCSV(filtered.map((e, i) => ({ No: i + 1, "Nomor Bukti": e.receiptNumber, Uraian: e.description, Tanggal: e.expenseDate, Kategori: e.category, Program: e.programName, Penerima: e.payee, "Metode Bayar": e.paymentMethod, Jumlah: `$${(e.amountCents / 100).toFixed(2)}`, Status: e.status, Catatan: e.notes })), "pengeluaran")}>↓ Export CSV</button>
    </div><div className="table-wrap"><table className="mail-table finance-table">
      <thead><tr><th>No.</th><th>Transaksi</th><th>Tanggal & Program</th><th>Penerima</th><th>Jumlah</th><th>Verifikasi</th><th>Aksi</th></tr></thead>
      <tbody>{loading ? <tr><td colSpan={7} className="table-empty">Memuat transaksi...</td></tr> : filtered.length === 0 ? <tr><td colSpan={7} className="table-empty">Belum ada pengeluaran yang sesuai.</td></tr> : paged.map((e, i) => <tr key={e.id}>
        <td>{(page - 1) * perPage + i + 1}</td><td><strong>{e.description}</strong><small>{e.receiptNumber} • {e.category}</small></td><td><strong>{e.expenseDate}</strong><small>{e.programName}</small></td><td><strong>{e.payee}</strong><small>{e.paymentMethod}</small></td><td className="amount-cell">{money(e.amountCents)}</td>
        <td><select aria-label={`Verifikasi ${e.receiptNumber}`} className={`status-select ${e.status === "Diverifikasi" ? "status-selesai" : "status-draf"}`} value={e.status} onChange={(ev) => void verify(e.id, ev.target.value)}><option>Belum Diverifikasi</option><option>Diverifikasi</option></select></td>
        <td className="actions-cell">
          <button className="action-btn edit" onClick={() => openExpenseForm(e)} title="Edit">✎</button>
          <button className="action-btn delete" onClick={() => void removeExpense(e.id)} title="Hapus">✕</button>
        </td>
      </tr>)}</tbody>
    </table></div><div className="table-footer">Menampilkan {paged.length} dari {filtered.length} transaksi</div>
      <Pagination currentPage={page} totalItems={filtered.length} perPage={perPage} onPageChange={setPage} />
    </section>

    {dialog && <div className="modal-layer" role="presentation" onMouseDown={(e) => e.target === e.currentTarget && setDialog(null)}>
      <section className="mail-modal" role="dialog" aria-modal="true" aria-labelledby="finance-form-title"><div className="modal-heading"><div><p className="eyebrow">FORMULIR KEUANGAN</p><h2 id="finance-form-title">{dialog === "budget" ? "Tambah Alokasi Anggaran" : editingExpense ? "Edit Pengeluaran" : "Catat Pengeluaran"}</h2></div><button aria-label="Tutup formulir" onClick={() => setDialog(null)}>×</button></div>
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
      </div><div className="form-actions"><button type="button" onClick={() => setDialog(null)}>Batal</button><button className="save-button" disabled={saving}>{editingExpense ? "Perbarui Pengeluaran" : "Simpan Pengeluaran"}</button></div></form>}
      </section>
    </div>}
    <ToastContainer toasts={toasts} dismiss={dismiss} />
  </div>;
}
