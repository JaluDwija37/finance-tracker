"use client";

export default function ErrorPage() {
  return <main className="state-page"><p className="eyebrow">Finance Tracker</p><h1>Catatan belum terbuka.</h1><p className="muted">Data gagal dimuat. Coba lagi untuk mengambilnya.</p><button className="action-button" type="button" onClick={() => window.location.reload()}>Coba lagi</button></main>;
}
