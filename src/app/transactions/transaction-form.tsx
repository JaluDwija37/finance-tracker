"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { createTransaction, type FormResult } from "../actions";

type Option = { id: string; name: string; kind?: "INCOME" | "EXPENSE" };
const initial: FormResult = { error: "", success: "" };

export function TransactionForm({ accounts, categories, today }: { accounts: Option[]; categories: Option[]; today: string }) {
  const [type, setType] = useState<"EXPENSE" | "INCOME" | "TRANSFER" | "ADJUSTMENT">("EXPENSE");
  const [state, action, pending] = useActionState(createTransaction, initial);
  const form = useRef<HTMLFormElement>(null);
  const allowReset = useRef(false);
  useEffect(() => {
    if (state.success) {
      allowReset.current = true;
      form.current?.reset();
      allowReset.current = false;
    }
  }, [state.success]);
  const matching = categories.filter((category) => category.kind === type);
  return <form ref={form} action={action} onReset={(event) => { if (allowReset.current) setType("EXPENSE"); else event.preventDefault(); }} className="entry-form">
    <div className="field"><label htmlFor="transaction-type">Jenis transaksi</label><select id="transaction-type" name="type" value={type} onChange={(event) => setType(event.target.value as typeof type)}><option value="EXPENSE">Pengeluaran</option><option value="INCOME">Pemasukan</option><option value="TRANSFER">Transfer antar akun</option><option value="ADJUSTMENT">Penyesuaian saldo</option></select></div>
    <div className="form-pair">
      <div className="field"><label htmlFor="transaction-amount">Nominal (Rp)</label><input id="transaction-amount" name="amount" inputMode="numeric" pattern="[0-9]*" required placeholder="0" /></div>
      <div className="field"><label htmlFor="transaction-date">Tanggal</label><input id="transaction-date" name="transactionDate" type="date" required defaultValue={today} /></div>
    </div>
    <div className="field"><label htmlFor="transaction-account">{type === "TRANSFER" ? "Dari akun" : "Akun"}</label><select id="transaction-account" name="accountId" required defaultValue=""><option value="" disabled>Pilih akun</option>{accounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}</select></div>
    {type === "TRANSFER" && <div className="field"><label htmlFor="destination-account">Ke akun</label><select id="destination-account" name="destinationAccountId" required defaultValue=""><option value="" disabled>Pilih akun tujuan</option>{accounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}</select></div>}
    {(type === "EXPENSE" || type === "INCOME") && <div className="field"><label htmlFor="transaction-category">Kategori</label><select key={type} id="transaction-category" name="categoryId" required defaultValue=""><option value="" disabled>Pilih kategori</option>{matching.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></div>}
    {type === "ADJUSTMENT" && <><div className="field"><label htmlFor="adjustment-direction">Arah perubahan</label><select id="adjustment-direction" name="adjustmentDirection" defaultValue="INCREASE"><option value="INCREASE">Tambah saldo</option><option value="DECREASE">Kurangi saldo</option></select></div><p className="field-help">Penyesuaian mengubah saldo, tetapi tidak masuk pengeluaran.</p></>}
    <div className="field"><label htmlFor="transaction-note">{type === "ADJUSTMENT" ? "Alasan" : "Catatan (opsional)"}</label><input id="transaction-note" name="note" maxLength={300} required={type === "ADJUSTMENT"} placeholder={type === "ADJUSTMENT" ? "Mengapa saldo berubah?" : "Keterangan singkat"} /></div>
    {state.error && <p className="form-error" role="alert">{state.error}</p>}
    {state.success && <p className="form-success" role="status">{state.success}</p>}
    <button className="action-button" type="submit" disabled={pending}>{pending ? "Menyimpan…" : "Simpan transaksi"}</button>
  </form>;
}
