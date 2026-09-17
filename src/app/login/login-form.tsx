"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";

export function LoginForm() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") ?? "").trim();
    const password = String(form.get("password") ?? "");
    const result = await authClient.signIn.email({ email, password });
    if (result.error) {
      setError(result.error.status === 429 ? "Terlalu banyak percobaan. Coba lagi dalam satu menit." : "Email atau kata sandi tidak cocok.");
      setBusy(false);
      return;
    }
    router.replace("/");
    router.refresh();
  }

  return (
    <form className="login-form" method="post" onSubmit={submit}>
      <div className="field">
        <label htmlFor="email">Email</label>
        <input id="email" name="email" type="email" autoComplete="username" required placeholder="nama@email.com" />
      </div>
      <div className="field">
        <label htmlFor="password">Kata sandi</label>
        <input id="password" name="password" type="password" autoComplete="current-password" required />
      </div>
      {error && <p className="form-error" role="alert">{error}</p>}
      <button className="action-button" type="submit" disabled={busy}>{busy ? "Memeriksa…" : "Masuk ke catatan"}</button>
    </form>
  );
}
