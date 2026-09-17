"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import type { WorkspaceData, TransactionView } from "@/lib/workspace-types";
import { accountBalances } from "@/lib/workspace-metrics";
import { categoryIcons, suggestedCategoryIcon } from "@/lib/category-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import type { WorkspaceResult } from "./workspace-actions";
import { correctAccountBalance, moveCategoryTransactions, saveAccount, saveBudget, saveCategory, saveTransaction } from "./workspace-actions";
import { saveAsset, saveContribution, saveGoal, savePrice, saveRecurring, saveSettings, saveSnapshot, saveTrade } from "./workspace-more-actions";

export type EditorKind = "account" | "correction" | "category" | "moveCategory" | "transaction" | "budget" | "goal" | "contribution" | "recurring" | "asset" | "trade" | "price" | "snapshot" | "settings";
export type Editor = { kind: EditorKind; id?: string };

const labels: Record<EditorKind, string> = {
  account: "akun", correction: "koreksi saldo", category: "kategori", moveCategory: "pemindahan transaksi", transaction: "transaksi", budget: "budget",
  goal: "target tabungan", contribution: "kontribusi", recurring: "jadwal tetap",
  asset: "aset investasi", trade: "transaksi investasi", price: "harga aset",
  snapshot: "rekonsiliasi", settings: "pengaturan",
};

type Action = (previous: WorkspaceResult, form: FormData) => Promise<WorkspaceResult>;

function ActionForm({ action, children, onSaved, submit }: { action: Action; children: React.ReactNode; onSaved: (message: string) => void; submit: string }) {
  const [state, formAction, pending] = useActionState(action, { error: "", success: "" });
  const handled = useRef("");
  useEffect(() => {
    if (state.success && state.success !== handled.current) {
      handled.current = state.success;
      onSaved(state.success);
    }
  }, [state.success, onSaved]);
  return <form action={formAction} className="workspace-form">
    {children}
    {state.error && <p className="form-error" role="alert">{state.error}</p>}
    <button className="action-button" type="submit" disabled={pending}>{pending ? "Menyimpan…" : submit}</button>
  </form>;
}

const Field = ({ label, name, children }: { label: string; name: string; children: React.ReactNode }) => <div className="field"><label htmlFor={`work-${name}`}>{label}</label>{children}</div>;
const Input = ({ name, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { name: string }) => <input id={`work-${name}`} name={name} {...props} />;
const Select = ({ name, children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement> & { name: string }) => <select id={`work-${name}`} name={name} {...props}>{children}</select>;

function CorrectionFields({ data, accountId }: { data: WorkspaceData; accountId?: string }) {
  const [selected, setSelected] = useState(accountId ?? data.accounts.find((item) => !item.isArchived)?.id ?? "");
  const [observed, setObserved] = useState("");
  const current = accountBalances(data).get(selected) ?? 0n;
  const valid = /^-?(0|[1-9]\d*)$/.test(observed);
  const difference = valid ? BigInt(observed) - current : null;
  const format = (value: bigint) => `Rp${value.toLocaleString("id-ID")}`;
  return <>
    <Field label="Akun" name="accountId"><Select name="accountId" required value={selected} onChange={(event) => setSelected(event.target.value)}>{data.accounts.filter((item) => !item.isArchived).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</Select></Field>
    <p className="field-help">Saldo di catatan sekarang: <strong>{format(current)}</strong></p>
    <Field label="Saldo nyata saat ini (Rp)" name="observedBalance"><Input name="observedBalance" inputMode="numeric" pattern="-?(0|[1-9][0-9]*)" required value={observed} onChange={(event) => setObserved(event.target.value)} placeholder="Masukkan saldo yang terlihat di akun" /></Field>
    {difference !== null && <p className="ws-correction-preview" role="status">{difference === 0n ? "Saldo sudah sesuai." : `${difference > 0n ? "Tambah" : "Kurangi"} ${format(difference < 0n ? -difference : difference)} lewat transaksi koreksi.`}</p>}
    <Field label="Alasan koreksi" name="reason"><Input name="reason" required minLength={5} maxLength={250} placeholder="Contoh: selisih setelah mencocokkan rekening" /></Field>
    <p className="field-help">Riwayat lama tetap ada. Selisih akan muncul sebagai transaksi Koreksi saldo hari ini.</p>
  </>;
}

function MoveCategoryFields({ data, initialSourceId }: { data: WorkspaceData; initialSourceId?: string }) {
  const [sourceId, setSourceId] = useState(initialSourceId ?? "");
  const source = data.categories.find((item) => item.id === sourceId);
  const count = data.transactions.filter((item) => item.categoryId === sourceId).length;
  return <>
    <Field label="Dari kategori" name="sourceId"><Select name="sourceId" required value={sourceId} onChange={(event) => setSourceId(event.target.value)}><option value="" disabled>Pilih asal</option>{data.categories.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.kind === "EXPENSE" ? "pengeluaran" : "pemasukan"}</option>)}</Select></Field>
    <Field label="Ke kategori" name="destinationId"><Select name="destinationId" key={sourceId} required defaultValue=""><option value="" disabled>Pilih tujuan</option>{data.categories.filter((item) => !item.isArchived && item.id !== sourceId && (!source || item.kind === source.kind)).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</Select></Field>
    {source && <p className="ws-correction-preview">{count} transaksi dalam kategori {source.name} akan dipindahkan.</p>}
    <p className="field-help">Nominal dan saldo tidak berubah. Budget dan jadwal tetap memakai kategori asal.</p>
  </>;
}

function TransactionFields({ data, item, today }: { data: WorkspaceData; item?: TransactionView; today: string }) {
  const [type, setType] = useState<TransactionView["type"]>(item?.type ?? "EXPENSE");
  return <>
    <input type="hidden" name="id" value={item?.id ?? ""} />
    <Field label="Jenis" name="type"><Select name="type" value={type} onChange={(event) => setType(event.target.value as TransactionView["type"])}><option value="EXPENSE">Pengeluaran</option><option value="INCOME">Pemasukan</option><option value="TRANSFER">Transfer antar akun</option><option value="ADJUSTMENT">Koreksi saldo</option></Select></Field>
    <div className="form-pair"><Field label="Nominal (Rp)" name="amount"><Input name="amount" inputMode="numeric" pattern="[1-9][0-9]*" required defaultValue={item?.amount ?? ""} placeholder="0" /></Field><Field label="Tanggal" name="transactionDate"><Input name="transactionDate" type="date" required defaultValue={item?.date ?? today} /></Field></div>
    <Field label={type === "TRANSFER" ? "Dari akun" : "Akun"} name="accountId"><Select name="accountId" required defaultValue={item?.accountId ?? ""}><option value="" disabled>Pilih akun</option>{data.accounts.filter((account) => !account.isArchived || account.id === item?.accountId).map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}</Select></Field>
    {type === "TRANSFER" && <Field label="Ke akun" name="destinationAccountId"><Select name="destinationAccountId" required defaultValue={item?.destinationAccountId ?? ""}><option value="" disabled>Pilih akun tujuan</option>{data.accounts.filter((account) => !account.isArchived || account.id === item?.destinationAccountId).map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}</Select></Field>}
    {(type === "INCOME" || type === "EXPENSE") && <Field label="Kategori" name="categoryId"><Select key={type} name="categoryId" required defaultValue={item?.categoryId ?? ""}><option value="" disabled>Pilih kategori</option>{data.categories.filter((category) => category.kind === type && (!category.isArchived || category.id === item?.categoryId)).map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</Select></Field>}
    {type === "ADJUSTMENT" && <Field label="Arah koreksi" name="adjustmentDirection"><Select name="adjustmentDirection" defaultValue={item?.adjustmentDirection ?? "INCREASE"}><option value="INCREASE">Tambah saldo</option><option value="DECREASE">Kurangi saldo</option></Select></Field>}
    <Field label={type === "ADJUSTMENT" ? "Alasan koreksi" : "Catatan"} name="note"><Input name="note" maxLength={300} required={type === "ADJUSTMENT"} defaultValue={item?.note ?? ""} placeholder={type === "ADJUSTMENT" ? "Mengapa saldo berubah?" : "Opsional"} /></Field>
  </>;
}

function RecurringFields({ data, item, today }: { data: WorkspaceData; item?: WorkspaceData["recurring"][number]; today: string }) {
  const [type, setType] = useState<"EXPENSE" | "INCOME" | "TRANSFER">(item?.type === "INCOME" || item?.type === "TRANSFER" ? item.type : "EXPENSE");
  return <>
    <input type="hidden" name="id" value={item?.id ?? ""} />
    <Field label="Jenis" name="type"><Select name="type" value={type} onChange={(event) => setType(event.target.value as typeof type)}><option value="EXPENSE">Pengeluaran tetap</option><option value="INCOME">Pemasukan tetap</option><option value="TRANSFER">Transfer tetap</option></Select></Field>
    <Field label="Nominal (Rp)" name="amount"><Input name="amount" inputMode="numeric" pattern="[1-9][0-9]*" required defaultValue={item?.amount ?? ""} /></Field>
    <Field label="Akun asal" name="accountId"><Select name="accountId" required defaultValue={item?.accountId ?? ""}><option value="" disabled>Pilih akun</option>{data.accounts.filter((account) => !account.isArchived).map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}</Select></Field>
    {type === "TRANSFER" ? <Field label="Akun tujuan" name="destinationAccountId"><Select name="destinationAccountId" required defaultValue={item?.destinationAccountId ?? ""}><option value="" disabled>Pilih akun</option>{data.accounts.filter((account) => !account.isArchived).map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}</Select></Field> : <Field label="Kategori" name="categoryId"><Select key={type} name="categoryId" required defaultValue={item?.categoryId ?? ""}><option value="" disabled>Pilih kategori</option>{data.categories.filter((category) => category.kind === type && !category.isArchived).map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</Select></Field>}
    <div className="form-pair"><Field label="Tanggal tiap bulan" name="dueDay"><Input name="dueDay" type="number" min={1} max={28} required defaultValue={item?.dueDay ?? 25} /></Field><Field label="Ulang tiap (bulan)" name="cadenceMonths"><Input name="cadenceMonths" type="number" min={1} max={12} required defaultValue={item?.cadenceMonths ?? 1} /></Field></div>
    <div className="form-pair"><Field label="Mulai" name="startDate"><Input name="startDate" type="date" required defaultValue={item?.startDate ?? today} /></Field><Field label="Selesai (opsional)" name="endDate"><Input name="endDate" type="date" defaultValue={item?.endDate ?? ""} /></Field></div>
    <Field label="Jatuh tempo berikutnya" name="nextDueDate"><Input name="nextDueDate" type="date" required defaultValue={item?.nextDueDate ?? today} /></Field>
    <Field label="Catatan" name="note"><Input name="note" maxLength={300} defaultValue={item?.note ?? ""} /></Field>
    <Field label="Status" name="active"><Select name="active" defaultValue={String(item?.active ?? true)}><option value="true">Aktif</option><option value="false">Jeda</option></Select></Field>
    <p className="field-help">Jadwal membuat draft. Saldo berubah setelah kamu mengonfirmasi pembayaran.</p>
  </>;
}

export function WorkspaceEditorForm({ editor, data, today, onSaved }: { editor: Editor; data: WorkspaceData; today: string; onSaved: (message: string) => void }) {
  const { kind, id } = editor;
  const account = data.accounts.find((item) => item.id === id);
  const category = data.categories.find((item) => item.id === id);
  const transaction = data.transactions.find((item) => item.id === id);
  const budget = data.budgets.find((item) => item.id === id);
  const goal = data.goals.find((item) => item.id === id);
  const contribution = data.contributions.find((item) => item.id === id);
  const recurring = data.recurring.find((item) => item.id === id);
  const asset = data.assets.find((item) => item.id === id);
  const trade = data.trades.find((item) => item.id === id);
  const price = data.prices.find((item) => item.id === id);
  const snapshot = data.snapshots.find((item) => item.id === id);
  const title = kind === "settings" ? "Pengaturan" : kind === "correction" ? "Koreksi saldo" : kind === "moveCategory" ? "Pindahkan transaksi kategori" : `${id ? "Ubah" : "Tambah"} ${labels[kind]}`;

  return <><p className="eyebrow">Finance Tracker</p><h2 id="editor-title">{title}</h2>
    {kind === "account" && <ActionForm action={saveAccount} onSaved={onSaved} submit={id ? "Simpan perubahan" : "Tambah akun"}>
      <input type="hidden" name="id" value={account?.id ?? ""} />
      <Field label="Nama akun" name="name"><Input name="name" required minLength={2} maxLength={60} defaultValue={account?.name ?? ""} placeholder="Contoh: rekening utama" /></Field>
      <Field label="Jenis" name="type"><Select name="type" defaultValue={account?.type ?? "BANK"}><option value="BANK">Bank</option><option value="CASH">Tunai</option><option value="EWALLET">Dompet digital</option><option value="INVESTMENT_CASH">Kas investasi</option><option value="OTHER_ASSET">Aset lain</option></Select></Field>
      <div className="form-pair"><Field label="Saldo awal (Rp)" name="openingBalance"><Input name="openingBalance" inputMode="numeric" pattern="[0-9]*" required defaultValue={account?.openingBalance ?? "0"} /></Field><Field label="Per tanggal" name="openingDate"><Input name="openingDate" type="date" required defaultValue={account?.openingDate ?? today} /></Field></div>
      {id && <p className="field-help">Mengubah saldo awal menghitung ulang saldo akun dari seluruh riwayat.</p>}
    </ActionForm>}
    {kind === "correction" && <ActionForm action={correctAccountBalance} onSaved={onSaved} submit="Catat koreksi saldo"><CorrectionFields data={data} accountId={account?.id}/></ActionForm>}
    {kind === "category" && <ActionForm action={saveCategory} onSaved={onSaved} submit={id ? "Simpan perubahan" : "Tambah kategori"}>
      <input type="hidden" name="id" value={category?.id ?? ""} />
      <Field label="Nama kategori" name="name"><Input name="name" required minLength={2} maxLength={60} defaultValue={category?.name ?? ""} /></Field>
      <Field label="Jenis" name="kind"><Select name="kind" defaultValue={category?.kind ?? "EXPENSE"}><option value="EXPENSE">Pengeluaran</option><option value="INCOME">Pemasukan</option></Select></Field>
      <Field label="Kategori induk" name="parentId"><Select name="parentId" defaultValue={category?.parentId ?? ""}><option value="">Tidak ada</option>{data.categories.filter((item) => !item.parentId && !item.isArchived && item.id !== id).map((item) => <option key={item.id} value={item.id}>{item.name} ({item.kind === "EXPENSE" ? "pengeluaran" : "pemasukan"})</option>)}</Select></Field>
      <fieldset className="ws-icon-picker"><legend>Ikon kategori</legend><div>{categoryIcons.map((item) => <label key={item.key}><input type="radio" name="icon" value={item.key} defaultChecked={(category?.icon ?? suggestedCategoryIcon(category?.name ?? "")) === item.key}/><span><FontAwesomeIcon icon={item.icon}/><small>{item.label}</small></span></label>)}</div></fieldset>
    </ActionForm>}
    {kind === "moveCategory" && <ActionForm action={moveCategoryTransactions} onSaved={onSaved} submit="Pindahkan transaksi"><MoveCategoryFields data={data} initialSourceId={category?.id}/></ActionForm>}
    {kind === "transaction" && <ActionForm action={saveTransaction} onSaved={onSaved} submit={id ? "Simpan perubahan" : "Catat transaksi"}><TransactionFields data={data} item={transaction} today={today} /></ActionForm>}
    {kind === "budget" && <ActionForm action={saveBudget} onSaved={onSaved} submit={id ? "Simpan batas" : "Tambah batas"}>
      <input type="hidden" name="id" value={budget?.id ?? ""} />
      <Field label="Kategori pengeluaran" name="categoryId"><Select name="categoryId" required defaultValue={budget?.categoryId ?? ""}><option value="" disabled>Pilih kategori</option>{data.categories.filter((item) => item.kind === "EXPENSE" && !item.isArchived).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</Select></Field>
      <div className="form-pair"><Field label="Periode" name="period"><Select name="period" defaultValue={budget?.period ?? "CYCLE"}><option value="DAY">Harian</option><option value="MONTH">Bulanan</option><option value="CYCLE">Siklus gajian</option><option value="YEAR">Tahunan</option></Select></Field><Field label="Maksimal (Rp)" name="amount"><Input name="amount" inputMode="numeric" pattern="[1-9][0-9]*" required defaultValue={budget?.amount ?? ""} /></Field></div>
      <p className="field-help">Batas pada periode berbeda membaca transaksi kategori yang sama.</p>
    </ActionForm>}
    {kind === "goal" && <ActionForm action={saveGoal} onSaved={onSaved} submit={id ? "Simpan target" : "Tambah target"}>
      <input type="hidden" name="id" value={goal?.id ?? ""} />
      <Field label="Nama target" name="name"><Input name="name" required minLength={2} maxLength={80} defaultValue={goal?.name ?? ""} placeholder="Contoh: dana darurat" /></Field>
      <Field label="Target (Rp)" name="targetAmount"><Input name="targetAmount" inputMode="numeric" pattern="[1-9][0-9]*" required defaultValue={goal?.targetAmount ?? ""} /></Field>
      <div className="form-pair"><Field label="Batas waktu" name="targetDate"><Input name="targetDate" type="date" defaultValue={goal?.targetDate ?? ""} /></Field><Field label="Prioritas 0–100" name="priority"><Input name="priority" type="number" min={0} max={100} defaultValue={goal?.priority ?? 0} /></Field></div>
      <Field label="Akun tujuan" name="linkedAccountId"><Select name="linkedAccountId" defaultValue={goal?.linkedAccountId ?? ""}><option value="">Tidak dibatasi</option>{data.accounts.filter((item) => !item.isArchived).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</Select></Field>
      <Field label="Status" name="status"><Select name="status" defaultValue={goal?.status ?? "ACTIVE"}><option value="ACTIVE">Aktif</option><option value="PAUSED">Jeda</option><option value="COMPLETED">Selesai</option></Select></Field>
    </ActionForm>}
    {kind === "contribution" && <ActionForm action={saveContribution} onSaved={onSaved} submit={id ? "Simpan kontribusi" : "Tautkan transfer"}>
      <input type="hidden" name="id" value={contribution?.id ?? ""} />
      <Field label="Target" name="goalId"><Select name="goalId" required defaultValue={contribution?.goalId ?? ""}><option value="" disabled>Pilih target</option>{data.goals.filter((item) => !item.isArchived).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</Select></Field>
      <Field label="Transfer yang sudah terjadi" name="transactionId"><Select name="transactionId" required defaultValue={contribution?.transactionId ?? ""}><option value="" disabled>Pilih transfer</option>{data.transactions.filter((item) => item.type === "TRANSFER" && item.status === "POSTED").map((item) => <option key={item.id} value={item.id}>{item.date} · {data.accounts.find((account) => account.id === item.destinationAccountId)?.name ?? "Akun"} · Rp{Number(item.amount).toLocaleString("id-ID")}</option>)}</Select></Field>
      <Field label="Porsi untuk target (Rp)" name="amount"><Input name="amount" inputMode="numeric" pattern="[1-9][0-9]*" required defaultValue={contribution?.amount ?? ""} /></Field>
      <p className="field-help">Kontribusi menautkan transfer yang nyata. Saldo tidak bertambah lagi.</p>
    </ActionForm>}
    {kind === "recurring" && <ActionForm action={saveRecurring} onSaved={onSaved} submit={id ? "Simpan jadwal" : "Tambah jadwal"}><RecurringFields data={data} item={recurring} today={today} /></ActionForm>}
    {kind === "asset" && <ActionForm action={saveAsset} onSaved={onSaved} submit={id ? "Simpan aset" : "Tambah aset"}>
      <input type="hidden" name="id" value={asset?.id ?? ""} />
      <Field label="Nama aset" name="name"><Input name="name" required minLength={2} maxLength={80} defaultValue={asset?.name ?? ""} placeholder="Contoh: reksa dana pasar uang" /></Field>
      <Field label="Simbol (opsional)" name="symbol"><Input name="symbol" maxLength={20} defaultValue={asset?.symbol ?? ""} /></Field>
      <Field label="Jenis aset" name="assetType"><Input name="assetType" required minLength={2} maxLength={40} defaultValue={asset?.assetType ?? "Reksa dana"} /></Field>
    </ActionForm>}
    {kind === "trade" && <ActionForm action={saveTrade} onSaved={onSaved} submit={id ? "Simpan transaksi" : "Catat investasi"}>
      <input type="hidden" name="id" value={trade?.id ?? ""} />
      <Field label="Aset" name="assetId"><Select name="assetId" required defaultValue={trade?.assetId ?? ""}><option value="" disabled>Pilih aset</option>{data.assets.filter((item) => !item.isArchived).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</Select></Field>
      <Field label="Kas investasi" name="accountId"><Select name="accountId" required defaultValue={trade?.accountId ?? ""}><option value="" disabled>Pilih akun</option>{data.accounts.filter((item) => item.type === "INVESTMENT_CASH" && !item.isArchived).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</Select></Field>
      <Field label="Jenis" name="type"><Select name="type" defaultValue={trade?.type ?? "BUY"}><option value="BUY">Beli</option><option value="SELL">Jual</option><option value="DIVIDEND">Dividen</option><option value="FEE">Biaya</option></Select></Field>
      <div className="form-pair"><Field label="Unit" name="quantity"><Input name="quantity" inputMode="decimal" required defaultValue={trade?.quantity ?? "0"} /></Field><Field label="Harga per unit (Rp)" name="unitPrice"><Input name="unitPrice" inputMode="decimal" required defaultValue={trade?.unitPrice ?? "0"} /></Field></div>
      <div className="form-pair"><Field label="Total (Rp)" name="totalAmount"><Input name="totalAmount" inputMode="numeric" pattern="[1-9][0-9]*" required defaultValue={trade?.totalAmount ?? ""} /></Field><Field label="Tanggal" name="date"><Input name="date" type="date" required defaultValue={trade?.date ?? today} /></Field></div>
      <p className="field-help">Beli dan jual mengubah kas investasi dan jumlah unit. Transfer ke akun investasi dicatat terpisah.</p>
    </ActionForm>}
    {kind === "price" && <ActionForm action={savePrice} onSaved={onSaved} submit={id ? "Simpan harga" : "Catat harga"}>
      <input type="hidden" name="id" value={price?.id ?? ""} />
      <Field label="Aset" name="assetId"><Select name="assetId" required defaultValue={price?.assetId ?? ""}><option value="" disabled>Pilih aset</option>{data.assets.filter((item) => !item.isArchived).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</Select></Field>
      <div className="form-pair"><Field label="Tanggal" name="date"><Input name="date" type="date" required defaultValue={price?.date ?? today} /></Field><Field label="Harga per unit (Rp)" name="price"><Input name="price" inputMode="decimal" required defaultValue={price?.price ?? ""} /></Field></div>
    </ActionForm>}
    {kind === "snapshot" && <ActionForm action={saveSnapshot} onSaved={onSaved} submit={id ? "Simpan pemeriksaan" : "Catat pemeriksaan"}>
      <input type="hidden" name="id" value={snapshot?.id ?? ""} />
      <Field label="Akun" name="accountId"><Select name="accountId" required defaultValue={snapshot?.accountId ?? ""}><option value="" disabled>Pilih akun</option>{data.accounts.filter((item) => !item.isArchived).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</Select></Field>
      <div className="form-pair"><Field label="Tanggal" name="date"><Input name="date" type="date" required defaultValue={snapshot?.date ?? today} /></Field><Field label="Saldo teramati (Rp)" name="observedBalance"><Input name="observedBalance" inputMode="numeric" required defaultValue={snapshot?.observedBalance ?? ""} /></Field></div>
      <Field label="Catatan" name="note"><Input name="note" maxLength={300} defaultValue={snapshot?.note ?? ""} /></Field>
      <p className="field-help">Selisih ditampilkan untuk ditinjau. Aplikasi tidak otomatis membuat pengeluaran atau koreksi saldo.</p>
    </ActionForm>}
    {kind === "settings" && <ActionForm action={saveSettings} onSaved={onSaved} submit="Simpan pengaturan"><Field label="Tanggal mulai siklus gajian" name="cycleStartDay"><Input name="cycleStartDay" type="number" min={1} max={28} required defaultValue={data.settings.cycleStartDay} /></Field></ActionForm>}
  </>;
}
