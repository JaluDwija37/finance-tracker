"use client";

import { useActionState } from "react";
import { importMoneyManager, type ImportResult } from "./actions";

const initial: ImportResult = { error: "", success: "" };

export function ImportForm() {
  const [state, action, pending] = useActionState(importMoneyManager, initial);
  return <form action={action} className="entry-form">
    <div className="field"><label htmlFor="workbook">File ekspor Money Manager (.xlsx)</label><input id="workbook" name="workbook" type="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" required /></div>
    <p className="field-help">Maksimal 10 MB. File yang sama aman diunggah ulang; sistem mengenalinya dari isi file.</p>
    {state.error && <p className="form-error" role="alert">{state.error}</p>}
    {state.success && <p className="form-success" role="status">{state.success}</p>}
    <button className="action-button" type="submit" disabled={pending}>{pending ? "Mengimpor…" : "Impor workbook"}</button>
  </form>;
}
