import type { ReactNode } from "react";

export function WorkspaceIcon({ name, size = 21 }: { name: string; size?: number }) {
  const paths: Record<string, ReactNode> = {
    home: <><path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z"/><path d="M9 21v-7h6v7"/></>,
    list: <><path d="M8 6h13M8 12h13M8 18h13"/><path d="M3 6h.01M3 12h.01M3 18h.01"/></>,
    chart: <><rect x="3" y="3" width="18" height="18" rx="3"/><path d="M7 16V9m5 7V6m5 10v-4"/></>,
    trend: <><path d="M3 17 9 11l4 3 8-8"/><path d="M16 6h5v5"/></>,
    target: <><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/></>,
    more: <><circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/></>,
    plus: <path d="M12 5v14M5 12h14"/>,
    close: <path d="M5 5 19 19M19 5 5 19"/>,
    arrow: <path d="M5 12h14m-6-6 6 6-6 6"/>,
    wallet: <><rect x="3" y="6" width="18" height="15" rx="2"/><path d="M3 10h18M6 6V4a1 1 0 0 1 1-1h12"/></>,
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}
