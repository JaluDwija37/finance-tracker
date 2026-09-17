import Link from "next/link";
import { LogoutButton } from "./logout-button";

const links = [
  { href: "/", label: "Beranda", icon: "home" },
  { href: "/transactions", label: "Transaksi", icon: "activity" },
  { href: "/budgets", label: "Budget", icon: "target" },
  { href: "/accounts", label: "Akun", icon: "wallet" },
  { href: "/import", label: "Impor", icon: "import" },
] as const;

function NavIcon({ name }: { name: typeof links[number]["icon"] }) {
  const common = { width: 19, height: 19, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.7, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true as const };
  if (name === "home") return <svg {...common}><path d="M3 10.5 12 3l9 7.5V21H3z"/><path d="M9 21v-7h6v7"/></svg>;
  if (name === "activity") return <svg {...common}><path d="M4 5h16M4 12h16M4 19h16"/><circle cx="8" cy="5" r="1" fill="currentColor" stroke="none"/><circle cx="15" cy="12" r="1" fill="currentColor" stroke="none"/><circle cx="11" cy="19" r="1" fill="currentColor" stroke="none"/></svg>;
  if (name === "target") return <svg {...common}><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><path d="M12 9v6M9 12h6"/></svg>;
  if (name === "wallet") return <svg {...common}><rect x="3" y="6" width="18" height="15" rx="2"/><path d="M3 9V5a2 2 0 0 1 2-2h13"/><path d="M16 14h5M16 14h-1"/></svg>;
  return <svg {...common}><path d="M12 3v12m0 0-4-4m4 4 4-4"/><path d="M4 16v4h16v-4"/></svg>;
}

function Navigation({ active, className }: { active: string; className: string }) {
  return <nav className={className} aria-label="Navigasi utama">
    {links.map((link) => <Link key={link.href} href={link.href} aria-current={active === link.href ? "page" : undefined}><NavIcon name={link.icon}/><span>{link.label}</span></Link>)}
  </nav>;
}

export function AppShell({ active, children }: { active: string; children: React.ReactNode }) {
  return <div className="app-shell">
    <aside className="app-sidebar">
      <Link className="wordmark" href="/" aria-label="Finance Tracker, beranda">Finance Tracker</Link>
      <p className="sidebar-caption">UANG, TANPA TEBAK TEBAKAN</p>
      <Navigation active={active} className="desktop-nav" />
      <div className="sidebar-foot"><LogoutButton /></div>
    </aside>
    <div className="app-content">
      <header className="app-header"><Link className="wordmark" href="/" aria-label="Finance Tracker, beranda">Finance Tracker</Link><LogoutButton /></header>
      <main className="app-main">{children}</main>
    </div>
    <Navigation active={active} className="mobile-nav" />
  </div>;
}
