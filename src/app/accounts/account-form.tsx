"use client";

import { useActionState, useEffect, useRef } from "react";
import { createAccount, type FormResult } from "../actions";

const initial: FormResult = { error: "", success: "" };

export function AccountForm({ today }: { today: string }) {
  const [state, action, pending] = useActionState(createAccount, initial);
  const form = useRef<HTMLFormElement>(null);
  const allowReset = useRef(false);
  useEffect(() => {
    if (state.success) {
      allowReset.current = true;
      form.current?.reset();
      allowReset.current = false;
    }
  }, [state.success]);
  return (
    <form ref={form} action={action} onReset={(event) => { if (!allowReset.current) event.preventDefault(); }} className="entry-form">
      <div className="field"><label htmlFor="account-name">Nama akun</label><input id="account-name" name="name" required minLength={2} maxLength={60} placeholder="Contoh: rekening utama" /></div>
      <div className="field"><label htmlFor="account-type">Jenis</label><select id="account-type" name="type" defaultValue="BANK"><option value="BANK">Bank</option><option value="CASH">Uang tunai</option><option value="EWALLET">Dompet digital</option><option value="INVESTMENT_CASH">Kas investasi</option><option value="OTHER_ASSET">Aset lain</option></select></div>
      <div className="form-pair">
        <div className="field"><label htmlFor="opening-balance">Saldo awal (Rp)</label><input id="opening-balance" name="openingBalance" inputMode="numeric" pattern="[0-9]*" required defaultValue="0" /></div>
        <div className="field"><label htmlFor="opening-date">Per tanggal</label><input id="opening-date" name="openingDate" type="date" required defaultValue={today} /></div>
      </div>
      <p className="field-help">Saldo awal dipakai sebagai titik mulai, bukan pemasukan.</p>
      {state.error && <p className="form-error" role="alert">{state.error}</p>}
      {state.success && <p className="form-success" role="status">{state.success}</p>}
      <button className="action-button" type="submit" disabled={pending}>{pending ? "Menyimpan…" : "Simpan akun"}</button>
    </form>
  );
}
