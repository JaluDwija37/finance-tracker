import Link from "next/link";
import { requireUser } from "@/lib/session";
import { getWorkspaceData } from "@/lib/workspace-data";
import { jakartaToday } from "@/lib/finance";
import { monthlyGrowth } from "@/lib/financial-analytics";
import { ReportShell } from "../report-shell";

const money = (value: bigint) => `${value < 0n ? "−" : ""}Rp${(value < 0n ? -value : value).toLocaleString("id-ID")}`;
const signed = (value: bigint) => `${value > 0n ? "+" : ""}${money(value)}`;

function GrowthPlot({ values }: { values: { label: string; netWorth: bigint }[] }) {
  const numbers = values.map((item) => item.netWorth);
  const minimum = numbers.reduce((smallest, value) => value < smallest ? value : smallest, numbers[0]);
  const maximum = numbers.reduce((largest, value) => value > largest ? value : largest, numbers[0]);
  const span = maximum - minimum;
  const points = values.map((item, index) => ({ x: 34 + index * 652 / Math.max(values.length - 1, 1), y: span === 0n ? 110 : 190 - Number((item.netWorth - minimum) * 150n / span), label: item.label, value: item.netWorth }));
  const line = points.map((item, index) => `${index ? "L" : "M"}${item.x.toFixed(1)} ${item.y.toFixed(1)}`).join(" ");
  return <div className="report-growth-plot"><svg viewBox="0 0 720 225" role="img" aria-label={`Grafik kekayaan bersih dari ${values[0].label} sampai ${values[values.length - 1].label}`}><path className="report-grid-line" d="M34 40H686M34 115H686M34 190H686"/><path className="report-growth-line" d={line}/>{points.map((point) => <circle key={point.label} cx={point.x} cy={point.y} r="5" aria-label={`${point.label}: ${money(point.value)}`}/>)}</svg><div className="report-plot-labels"><span>{values[0].label}</span><span>{values[values.length - 1].label}</span></div></div>;
}

export default async function GrowthPage({ searchParams }: { searchParams: Promise<{ months?: string }> }) {
  const user = await requireUser();
  const { months } = await searchParams;
  const count = months === "12" ? 12 : 6;
  const data = await getWorkspaceData(user.id);
  const values = monthlyGrowth(data, jakartaToday(), count);
  const latest = values[values.length - 1];
  const first = values[0];
  const overallChange = latest.netWorth - (first.netWorth - first.change);
  const hasRecords = data.accounts.length > 0 || data.transactions.length > 0 || data.trades.length > 0;
  return <ReportShell active="growth"><div className="ws-page report-page">
    <div className="ws-page-intro"><p className="eyebrow">Perkembangan keuangan</p><h1>Pertumbuhan.</h1><p>Posisi kas dan investasi pada akhir setiap bulan.</p></div>
    <div className="report-range" aria-label="Rentang laporan"><Link href="/growth?months=6" aria-current={count === 6 ? "page" : undefined}>6 bulan</Link><Link href="/growth?months=12" aria-current={count === 12 ? "page" : undefined}>12 bulan</Link></div>
    {hasRecords ? <><section className="report-growth-hero" aria-labelledby="worth-title"><div><p id="worth-title">Kekayaan bersih tercatat</p><strong>{money(latest.netWorth)}</strong><span className={overallChange < 0n ? "negative" : "positive"}>{signed(overallChange)} selama {count} bulan</span></div><p>Bulan berjalan dihitung sampai hari ini. Nilai investasi memakai harga terakhir yang tersedia pada tanggal tersebut; tanpa harga, memakai modal tersisa.</p></section>
      <section className="report-growth-section" aria-labelledby="growth-plot-title"><div className="ws-panel-title"><div><p className="eyebrow">{first.label} sampai {latest.label}</p><h2 id="growth-plot-title">Jejak kekayaan</h2></div></div><GrowthPlot values={values}/></section>
      <section className="report-growth-section" aria-labelledby="growth-table-title"><div className="ws-panel-title"><div><p className="eyebrow">Perubahan tiap bulan</p><h2 id="growth-table-title">Apa yang berubah</h2></div></div><div className="report-growth-table" role="table" aria-label="Rincian pertumbuhan bulanan"><div className="report-growth-head" role="row"><span role="columnheader">Bulan</span><span role="columnheader">Akhir bulan</span><span role="columnheader">Perubahan</span><span role="columnheader">Arus bersih</span><span role="columnheader">Lainnya</span></div>{values.map((item) => <div className="report-growth-row" role="row" key={item.start}><strong role="cell" data-label="Bulan">{item.label}{item.isCurrent ? " *" : ""}</strong><b role="cell" data-label="Akhir bulan">{money(item.netWorth)}</b><span role="cell" data-label="Perubahan" className={item.change < 0n ? "negative" : "positive"}>{signed(item.change)}{item.changePercent !== null ? <small>{item.changePercent.toLocaleString("id-ID", { maximumFractionDigits: 1 })}%</small> : null}</span><span role="cell" data-label="Arus bersih">{signed(item.income - item.expense)}</span><span role="cell" data-label="Lainnya">{signed(item.otherChange)}</span></div>)}</div><p className="ws-hint">* Bulan berjalan. “Lainnya” mencakup koreksi saldo, perubahan harga investasi, dan saldo awal akun baru. Perubahan kekayaan tidak sama dengan keuntungan investasi.</p></section></> : <div className="ws-empty"><strong>Belum ada data pertumbuhan.</strong><p>Tambahkan akun dan catat transaksi agar perubahan bulanan dapat dihitung.</p><Link className="ws-ghost" href="/?view=more&section=accounts">Tambah akun</Link></div>}
  </div></ReportShell>;
}
