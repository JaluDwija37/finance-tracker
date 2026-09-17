import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { LoginForm } from "./login-form";

export default async function LoginPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (session) redirect("/");
  return (
    <main className="login-shell">
      <section className="login-editorial" aria-label="Finance Tracker">
        <span className="wordmark">FINANCE<span>TRACKER</span><i>.</i></span>
        <h2>Semua uangmu.<br /><span>Dalam satu pandangan.</span></h2>
        <p>Catat yang masuk, yang keluar, dan yang berpindah. Lihat posisi keuanganmu dari angka yang kamu masukkan sendiri.</p>
      </section>
      <div className="login-content">
        <p className="eyebrow">Akses pribadi</p>
        <h1>Masuk.</h1>
        <p className="muted">Gunakan email dan kata sandi pemilik untuk melanjutkan.</p>
        <LoginForm />
        <p className="login-footer">Akun baru dibuat langsung oleh pemilik aplikasi.</p>
      </div>
    </main>
  );
}
