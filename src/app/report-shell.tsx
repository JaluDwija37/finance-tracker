import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBars, faBullseye, faChartColumn, faChartLine, faEllipsis, faHouse, faList, faWallet } from "@fortawesome/free-solid-svg-icons";

type ReportPage = "charts" | "growth";

const links = [
  { href: "/?view=home", label: "Beranda", icon: faHouse },
  { href: "/?view=transactions", label: "Transaksi", icon: faList },
  { href: "/?view=budget", label: "Budget", icon: faWallet },
  { href: "/?view=goals", label: "Target", icon: faBullseye },
  { href: "/charts", label: "Chart", icon: faChartColumn },
  { href: "/growth", label: "Pertumbuhan", icon: faChartLine },
  { href: "/?view=more", label: "Lainnya", icon: faEllipsis },
];

export function ReportShell({ active, children }: { active: ReportPage; children: React.ReactNode }) {
  return <div className="ws-shell report-shell">
    <aside className="ws-sidebar"><div className="ws-brand"><div><strong>Finance Tracker</strong><small>Ruang keuangan pribadi</small></div></div><nav aria-label="Navigasi utama">{links.map((item) => <Link key={item.href} href={item.href} aria-current={item.href === `/${active}` ? "page" : undefined}><FontAwesomeIcon icon={item.icon}/>{item.label}</Link>)}</nav><div className="ws-sidebar-foot"><small>Angka mengikuti catatanmu.</small></div></aside>
    <main className="ws-main report-main"><header className="ws-header"><div className="ws-mobile-brand"><strong>Finance Tracker</strong></div><details className="report-menu"><summary><FontAwesomeIcon icon={faBars}/> <span>Menu</span></summary><nav aria-label="Pindah halaman">{links.map((item) => <Link key={item.href} href={item.href} aria-current={item.href === `/${active}` ? "page" : undefined}>{item.label}</Link>)}</nav></details></header>{children}</main>
    <nav className="ws-bottom-nav" aria-label="Navigasi utama">{links.filter((item) => ["Beranda", "Transaksi", "Budget", "Target", "Lainnya"].includes(item.label)).map((item) => <Link key={item.href} href={item.href} aria-current={item.label === "Lainnya" ? "page" : undefined}><FontAwesomeIcon icon={item.icon}/><span>{item.label}</span></Link>)}</nav>
  </div>;
}
