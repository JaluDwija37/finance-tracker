"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parseRupiah } from "@/lib/money";
import { jakartaToday } from "@/lib/finance";

export type FormResult = { error: string; success: string };
const emptyResult: FormResult = { error: "", success: "" };

const dateField = z.iso.date();
const amountField = z.string().regex(/^(0|[1-9]\d*)$/, "Nominal harus berisi angka rupiah.");
const accountSchema = z.object({
  name: z.string().trim().min(2).max(60),
  type: z.enum(["CASH", "BANK", "EWALLET", "INVESTMENT_CASH", "OTHER_ASSET"]),
  openingBalance: amountField,
  openingDate: dateField,
});
const transactionSchema = z.object({
  type: z.enum(["INCOME", "EXPENSE", "TRANSFER", "ADJUSTMENT"]),
  amount: amountField,
  transactionDate: dateField,
  accountId: z.string().min(1),
  destinationAccountId: z.string().optional(),
  categoryId: z.string().optional(),
  adjustmentDirection: z.enum(["INCREASE", "DECREASE"]).optional(),
  note: z.string().trim().max(300).optional(),
});

async function currentUserId(): Promise<string | null> {
  const session = await auth.api.getSession({ headers: await headers() });
  return session?.user.id ?? null;
}

export async function createAccount(_previous: FormResult, data: FormData): Promise<FormResult> {
  const userId = await currentUserId();
  if (!userId) return { ...emptyResult, error: "Sesi berakhir. Masuk kembali." };
  const input = accountSchema.safeParse(Object.fromEntries(data));
  if (!input.success) return { ...emptyResult, error: "Periksa nama, jenis akun, saldo awal, dan tanggal." };
  if (input.data.openingDate > jakartaToday()) return { ...emptyResult, error: "Tanggal saldo awal belum terjadi." };
  const amount = parseRupiah(input.data.openingBalance);
  try {
    await prisma.$transaction(async (db) => {
      const account = await db.financialAccount.create({ data: {
        userId, name: input.data.name, type: input.data.type,
        openingBalance: amount, openingDate: new Date(`${input.data.openingDate}T00:00:00Z`),
      } });
      await db.auditLog.create({ data: { userId, action: "CREATE", entity: "FinancialAccount", entityId: account.id } });
    });
  } catch {
    return { ...emptyResult, error: "Akun tidak tersimpan. Coba nama lain atau ulangi." };
  }
  revalidatePath("/");
  revalidatePath("/accounts");
  revalidatePath("/transactions");
  return { ...emptyResult, success: "Akun berhasil ditambahkan." };
}

export async function createTransaction(_previous: FormResult, data: FormData): Promise<FormResult> {
  const userId = await currentUserId();
  if (!userId) return { ...emptyResult, error: "Sesi berakhir. Masuk kembali." };
  const input = transactionSchema.safeParse(Object.fromEntries(data));
  if (!input.success) return { ...emptyResult, error: "Periksa tanggal, nominal, akun, dan jenis transaksi." };
  const value = input.data;
  if (value.transactionDate > jakartaToday()) return { ...emptyResult, error: "Tanggal transaksi belum terjadi." };
  const amount = parseRupiah(value.amount);
  if (amount <= 0n) return { ...emptyResult, error: "Nominal harus lebih dari nol." };
  const ids = [value.accountId, value.destinationAccountId].filter((id): id is string => Boolean(id));
  const ownedAccounts = await prisma.financialAccount.findMany({ where: { userId, id: { in: ids }, isArchived: false } });
  if (!ownedAccounts.some((account) => account.id === value.accountId)) return { ...emptyResult, error: "Akun asal tidak ditemukan." };
  if (value.type === "TRANSFER" && (!value.destinationAccountId || value.destinationAccountId === value.accountId || !ownedAccounts.some((account) => account.id === value.destinationAccountId))) {
    return { ...emptyResult, error: "Pilih akun tujuan yang berbeda." };
  }
  let categoryId: string | null = null;
  if (value.type === "INCOME" || value.type === "EXPENSE") {
    const category = await prisma.category.findFirst({ where: { userId, id: value.categoryId, kind: value.type, isArchived: false } });
    if (!category) return { ...emptyResult, error: "Pilih kategori yang sesuai." };
    categoryId = category.id;
  }
  if (value.type === "ADJUSTMENT" && (!value.adjustmentDirection || !value.note)) {
    return { ...emptyResult, error: "Penyesuaian perlu arah dan alasan." };
  }
  try {
    await prisma.$transaction(async (db) => {
      const transaction = await db.transaction.create({ data: {
        userId, type: value.type, amount,
        transactionDate: new Date(`${value.transactionDate}T00:00:00Z`),
        accountId: value.accountId,
        destinationAccountId: value.type === "TRANSFER" ? value.destinationAccountId : null,
        categoryId,
        adjustmentDirection: value.type === "ADJUSTMENT" ? value.adjustmentDirection : null,
        note: value.note || null,
      } });
      await db.auditLog.create({ data: {
        userId, action: "CREATE", entity: "Transaction", entityId: transaction.id,
        changes: { type: value.type, amount: amount.toString() },
      } });
    });
  } catch {
    return { ...emptyResult, error: "Transaksi tidak tersimpan. Periksa isian lalu coba lagi." };
  }
  revalidatePath("/");
  revalidatePath("/accounts");
  revalidatePath("/transactions");
  return { ...emptyResult, success: "Transaksi berhasil dicatat." };
}
