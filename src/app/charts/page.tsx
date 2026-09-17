import Link from "next/link";
import { requireUser } from "@/lib/session";
import { getWorkspaceData } from "@/lib/workspace-data";
import { jakartaToday } from "@/lib/finance";
import { categoryExpenses, monthlyCashFlow } from "@/lib/financial-analytics";
import { CategoryIcon } from "../category-icon";
import { ReportShell } from "../report-shell";

const money = (value: bigint) => `Rp${value.toLocaleString("id-ID")}`;
const percent = (value: number | null) => value === null ? "Belum ada pemasukan" : `${value.toLocaleString("id-ID", { maximumFractionDigits: 1 })}%`;

export default async function ChartsPage({ searchParams }: { searchParams: Promise<{ months?: string }> }) {
  const user = await requireUser();
  const { months } = await searchParams;
  const count = months === "12" ? 12 : 6;
  const data = await getWorkspaceData(user.id);
  const rows = monthlyCashFlow(data, jakartaToday(), count);
  const income = rows.reduce((sum, row) => sum + row.income, 0n);
  const expense = rows.reduce((sum, row) => sum + row.expense, 0n);
  const rate = income > 0n ? Number(expense * 10_000n / income) / 100 : null;
  const max = rows.reduce((largest, row) => row.income > largest ? row.income : row.expense > largest ? row.expense : largest, 0n);
  const categories = categoryExpenses(data, rows[0].start, rows[rows.length - 1].end);
  const barWidth = (value: bigint) => max > 0n ? `${Number(value * 100n / max)}%` : "0%";
  return <ReportShell active="charts"><div className="ws-page report-page">
    <div className="ws-page-intro"><p className="eyebrow">Analisis arus uang</p><h1>Chart.</h1><p>Pemasukan dan pengeluaran dari transaksi yang sudah dicatat.</p></div>
    <div className="report-range" aria-label="Rentang laporan"><Link href="/charts?months=6" aria-current={count === 6 ? "page" : undefined}>6 bulan</Link><Link href="/charts?months=12" aria-current={count === 12 ? "page" : undefined}>12 bulan</Link></div>
    <section aria-labelledby="cashflow-title"><div className="ws-panel-title"><div><p className="eyebrow">{rows[0].label} sampai {rows[rows.length - 1].label}</p><h2 id="cashflow-title">Masuk dan keluar</h2></div></div><div className="report-summary"><div><span>Total masuk</span><strong>{money(income)}</strong></div><div><span>Total keluar</span><strong>{money(expense)}</strong></div><div><span>Pengeluaran / pemasukan</span><strong>{percent(rate)}</strong></div></div>
      {income === 0n && expense === 0n ? <div className="ws-empty"><strong>Belum ada arus uang pada rentang ini.</strong><p>Catat pemasukan atau pengeluaran untuk melihat perbandingannya.</p></div> : <div className="report-bars" role="list" aria-label="Perbandingan per bulan">{rows.map((row) => <div className="report-bar-month" role="listitem" key={row.start}><div className="report-bar-heading"><strong>{row.label}{row.isCurrent ? " · berjalan" : ""}</strong><span>{row.income > 0n ? `${percent(row.expenseRate)} terpakai` : row.expense > 0n ? "Tanpa pemasukan" : "Belum ada transaksi"}</span></div><div className="report-bar-row"><span>Masuk</span><div className="report-track"><i className="report-income" style={{ width: barWidth(row.income) }}/></div><b>{money(row.income)}</b></div><div className="report-bar-row"><span>Keluar</span><div className="report-track"><i className="report-expense" style={{ width: barWidth(row.expense) }}/></div><b>{money(row.expense)}</b></div></div>)}</div>}
    </section>
    <section className="report-category-section" aria-labelledby="category-title"><div className="ws-panel-title"><div><p className="eyebrow">Porsi pengeluaran</p><h2 id="category-title">Menurut kategori</h2></div></div>{categories.length ? <div className="report-category-list">{categories.map((item) => <div className="report-category-row" key={item.id}><CategoryIcon icon={item.icon} name={item.name}/><div><strong>{item.name}</strong><div className="report-track"><i className="report-expense" style={{ width: `${item.percent}%` }}/></div></div><b>{money(item.amount)}</b><span>{percent(item.percent)}</span></div>)}</div> : <div className="ws-empty"><strong>Belum ada pengeluaran.</strong><p>Kategori akan muncul setelah transaksi pengeluaran dicatat.</p></div>}</section>
    <p className="ws-hint">Transfer, koreksi saldo, dan transaksi yang dibatalkan tidak dihitung sebagai pemasukan atau pengeluaran. Persentase bisa melebihi 100% jika pengeluaran melampaui pemasukan.</p>
  </div></ReportShell>;
}
