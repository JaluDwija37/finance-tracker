"use client";

import { useActionState } from "react";
import { saveBudgetLimit, type BudgetResult } from "./actions";

const initial: BudgetResult = { error: "", success: "" };

export function BudgetForm({ categories }: { categories: { id: string; name: string }[] }) {
  const [state, action, pending] = useActionState(saveBudgetLimit, initial);
  return <form action={action} className="entry-form">
    <div className="field"><label htmlFor="budget-category">Kategori pengeluaran</label><select id="budget-category" name="categoryId" required defaultValue=""><option value="" disabled>Pilih kategori</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></div>
    <div className="form-pair">
      <div className="field"><label htmlFor="budget-period">Periode</label><select id="budget-period" name="period" defaultValue="CYCLE"><option value="DAY">Per hari</option><option value="MONTH">Per bulan</option><option value="CYCLE">Siklus gajian</option><option value="YEAR">Per tahun</option></select></div>
      <div className="field"><label htmlFor="budget-amount">Maksimal (Rp)</label><input id="budget-amount" name="amount" inputMode="numeric" pattern="[1-9][0-9]*" required placeholder="Contoh: 1500000" /></div>
    </div>
    <p className="field-help">Atur satu kategori pada beberapa periode. Pengeluaran dari transaksi yang sama otomatis dihitung untuk tiap batas yang berlaku.</p>
    {state.error && <p className="form-error" role="alert">{state.error}</p>}
    {state.success && <p className="form-success" role="status">{state.success}</p>}
    <button type="submit" className="action-button" disabled={pending || categories.length === 0}>{pending ? "Menyimpan…" : "Simpan batas"}</button>
  </form>;
}
