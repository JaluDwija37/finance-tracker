import Link from "next/link";
import { WorkspaceIcon } from "./workspace-icon";

type ReportPage = "charts" | "growth";

const links = [
  { href: "/?view=home", label: "Beranda", icon: "home" },
  { href: "/?view=transactions", label: "Transaksi", icon: "list" },
  { href: "/?view=budget", label: "Budget", icon: "chart" },
  { href: "/?view=goals", label: "Target", icon: "target" },
  { href: "/charts", label: "Chart", icon: "chart" },
  { href: "/growth", label: "Pertumbuhan", icon: "trend" },
  { href: "/?view=more", label: "Lainnya", icon: "more" },
];

export function ReportShell({ active, children }: { active: ReportPage; children: React.ReactNode }) {
  return <div className="ws-shell report-shell">
    <aside className="ws-sidebar"><div className="ws-brand"><div><strong>Finance Tracker</strong><small>Ruang keuangan pribadi</small></div></div><nav aria-label="Navigasi utama">{links.map((item) => <Link key={item.href} href={item.href} aria-current={item.href === `/${active}` ? "page" : undefined}><WorkspaceIcon name={item.icon}/>{item.label}</Link>)}</nav><div className="ws-sidebar-foot"><small>Angka mengikuti catatanmu.</small></div></aside>
    <main className="ws-main report-main"><header className="ws-header"><div className="ws-mobile-brand"><strong>Finance Tracker</strong></div><Link className="report-back" href="/?view=more&section=reports">← Laporan</Link></header><nav className="report-switch" aria-label="Jenis laporan"><Link href="/charts" aria-current={active === "charts" ? "page" : undefined}>Chart</Link><Link href="/growth" aria-current={active === "growth" ? "page" : undefined}>Pertumbuhan</Link></nav>{children}</main>
    <nav className="ws-bottom-nav" aria-label="Navigasi utama">{links.filter((item) => ["Beranda", "Transaksi", "Budget", "Target", "Lainnya"].includes(item.label)).map((item) => <Link key={item.href} href={item.href} aria-current={item.label === "Lainnya" ? "page" : undefined}><WorkspaceIcon name={item.icon}/><span>{item.label}</span></Link>)}</nav>
  </div>;
}
