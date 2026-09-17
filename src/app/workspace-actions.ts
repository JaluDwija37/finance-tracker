"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parseRupiah } from "@/lib/money";
import { jakartaToday } from "@/lib/finance";

export type WorkspaceResult = { error: string; success: string };

class InputError extends Error {}
const idField = z.string().trim().min(1);
const moneyField = z.string().regex(/^(0|[1-9]\d*)$/);
const positiveMoney = z.string().regex(/^[1-9]\d*$/);
const dateField = z.iso.date();
const optionalId = z.union([z.literal(""), idField]).optional();

async function ownerId() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) throw new InputError("Sesi berakhir. Masuk kembali.");
  return session.user.id;
}

function dateValue(input: string, allowFuture = false) {
  if (!allowFuture && input > jakartaToday()) throw new InputError("Tanggal belum terjadi.");
  return new Date(`${input}T00:00:00Z`);
}

function fail(error: unknown): WorkspaceResult {
  return { error: error instanceof InputError ? error.message : "Perubahan gagal disimpan. Coba lagi.", success: "" };
}

function done(message: string): WorkspaceResult {
  revalidatePath("/");
  return { error: "", success: message };
}

const accountFields = z.object({
  id: optionalId,
  name: z.string().trim().min(2).max(60),
  type: z.enum(["CASH", "BANK", "EWALLET", "INVESTMENT_CASH", "OTHER_ASSET"]),
  openingBalance: moneyField,
  openingDate: dateField,
});

export async function saveAccount(_previous: WorkspaceResult, form: FormData): Promise<WorkspaceResult> {
  try {
    const userId = await ownerId();
    const parsed = accountFields.safeParse(Object.fromEntries(form));
    if (!parsed.success) throw new InputError("Periksa nama, jenis, saldo awal, dan tanggal akun.");
    const value = parsed.data;
    const data = { name: value.name, type: value.type, openingBalance: parseRupiah(value.openingBalance), openingDate: dateValue(value.openingDate) };
    await prisma.$transaction(async (db) => {
      if (value.id) {
        const account = await db.financialAccount.findFirst({ where: { id: value.id, userId } });
        if (!account) throw new InputError("Akun tidak ditemukan.");
        await db.financialAccount.update({ where: { id: account.id }, data });
        await db.auditLog.create({ data: { userId, action: "UPDATE", entity: "FinancialAccount", entityId: account.id, changes: { name: value.name, openingBalance: value.openingBalance } } });
      } else {
        const account = await db.financialAccount.create({ data: { userId, ...data } });
        await db.auditLog.create({ data: { userId, action: "CREATE", entity: "FinancialAccount", entityId: account.id } });
      }
    });
    return done(value.id ? "Akun diperbarui." : "Akun ditambahkan.");
  } catch (error) { return fail(error); }
}

export async function setAccountArchived(id: string, archived: boolean): Promise<WorkspaceResult> {
  try {
    const userId = await ownerId();
    const account = await prisma.financialAccount.findFirst({ where: { id, userId } });
    if (!account) throw new InputError("Akun tidak ditemukan.");
    await prisma.$transaction([
      prisma.financialAccount.update({ where: { id }, data: { isArchived: archived } }),
      prisma.auditLog.create({ data: { userId, action: archived ? "ARCHIVE" : "RESTORE", entity: "FinancialAccount", entityId: id } }),
    ]);
    return done(archived ? "Akun diarsipkan. Riwayat tetap ada." : "Akun dipulihkan.");
  } catch (error) { return fail(error); }
}

const categoryFields = z.object({
  id: optionalId,
  name: z.string().trim().min(2).max(60),
  kind: z.enum(["INCOME", "EXPENSE"]),
  parentId: optionalId,
});

export async function saveCategory(_previous: WorkspaceResult, form: FormData): Promise<WorkspaceResult> {
  try {
    const userId = await ownerId();
    const parsed = categoryFields.safeParse(Object.fromEntries(form));
    if (!parsed.success) throw new InputError("Periksa nama, jenis, dan kategori induk.");
    const value = parsed.data;
    const parentId = value.parentId || null;
    if (value.id === parentId) throw new InputError("Kategori tidak bisa menjadi induknya sendiri.");
    await prisma.$transaction(async (db) => {
      if (parentId) {
        const parent = await db.category.findFirst({ where: { id: parentId, userId, kind: value.kind, parentId: null, isArchived: false } });
        if (!parent) throw new InputError("Kategori induk tidak valid.");
      }
      const duplicate = await db.category.findFirst({ where: { userId, kind: value.kind, parentId, name: value.name, id: value.id ? { not: value.id } : undefined } });
      if (duplicate) throw new InputError("Nama kategori sudah dipakai pada kelompok ini.");
      if (value.id) {
        const existing = await db.category.findFirst({ where: { id: value.id, userId } });
        if (!existing) throw new InputError("Kategori tidak ditemukan.");
        if (existing.kind !== value.kind) {
          const [transactions, budgets, recurring, children] = await Promise.all([
            db.transaction.count({ where: { userId, categoryId: value.id } }),
            db.budgetLimit.count({ where: { userId, categoryId: value.id } }),
            db.recurringRule.count({ where: { userId, categoryId: value.id } }),
            db.category.count({ where: { userId, parentId: value.id } }),
          ]);
          if (transactions || budgets || recurring || children) throw new InputError("Jenis kategori yang sudah dipakai tidak dapat diubah.");
        }
        if (parentId && await db.category.count({ where: { userId, parentId: value.id } })) throw new InputError("Kategori dengan subkategori tidak bisa dipindah ke induk lain.");
        await db.category.update({ where: { id: value.id }, data: { name: value.name, kind: value.kind, parentId } });
        await db.auditLog.create({ data: { userId, action: "UPDATE", entity: "Category", entityId: value.id, changes: { name: value.name, kind: value.kind } } });
      } else {
        const category = await db.category.create({ data: { userId, name: value.name, kind: value.kind, parentId } });
        await db.auditLog.create({ data: { userId, action: "CREATE", entity: "Category", entityId: category.id } });
      }
    });
    return done(value.id ? "Kategori diperbarui." : "Kategori ditambahkan.");
  } catch (error) { return fail(error); }
}

export async function setCategoryArchived(id: string, archived: boolean): Promise<WorkspaceResult> {
  try {
    const userId = await ownerId();
    const category = await prisma.category.findFirst({ where: { id, userId } });
    if (!category) throw new InputError("Kategori tidak ditemukan.");
    if (archived && await prisma.category.count({ where: { userId, parentId: id, isArchived: false } })) throw new InputError("Arsipkan subkategori terlebih dahulu.");
    await prisma.$transaction([
      prisma.category.update({ where: { id }, data: { isArchived: archived } }),
      prisma.auditLog.create({ data: { userId, action: archived ? "ARCHIVE" : "RESTORE", entity: "Category", entityId: id } }),
    ]);
    return done(archived ? "Kategori diarsipkan. Riwayat tetap ada." : "Kategori dipulihkan.");
  } catch (error) { return fail(error); }
}

const transactionFields = z.object({
  id: optionalId,
  type: z.enum(["INCOME", "EXPENSE", "TRANSFER", "ADJUSTMENT"]),
  amount: positiveMoney,
  transactionDate: dateField,
  accountId: idField,
  destinationAccountId: optionalId,
  categoryId: optionalId,
  adjustmentDirection: z.union([z.literal(""), z.enum(["INCREASE", "DECREASE"])]).optional(),
  note: z.string().trim().max(300).optional(),
});

export async function saveTransaction(_previous: WorkspaceResult, form: FormData): Promise<WorkspaceResult> {
  try {
    const userId = await ownerId();
    const parsed = transactionFields.safeParse(Object.fromEntries(form));
    if (!parsed.success) throw new InputError("Periksa jenis, tanggal, akun, dan nominal transaksi.");
    const value = parsed.data;
    const existing = value.id ? await prisma.transaction.findFirst({ where: { id: value.id, userId } }) : null;
    if (value.id && !existing) throw new InputError("Transaksi tidak ditemukan.");
    const accounts = await prisma.financialAccount.findMany({ where: { userId, id: { in: [value.accountId, value.destinationAccountId || ""] } } });
    if (!accounts.some((account) => account.id === value.accountId && (existing || !account.isArchived))) throw new InputError("Akun asal tidak tersedia.");
    if (value.type === "TRANSFER" && (!value.destinationAccountId || value.destinationAccountId === value.accountId || !accounts.some((account) => account.id === value.destinationAccountId && (existing || !account.isArchived)))) throw new InputError("Pilih akun tujuan yang berbeda.");
    let categoryId: string | null = null;
    if (value.type === "INCOME" || value.type === "EXPENSE") {
      const category = await prisma.category.findFirst({ where: { id: value.categoryId, userId, kind: value.type } });
      if (!category || (category.isArchived && !existing)) throw new InputError("Pilih kategori yang sesuai.");
      categoryId = category.id;
    }
    if (value.type === "ADJUSTMENT" && (!value.adjustmentDirection || !value.note)) throw new InputError("Koreksi saldo memerlukan arah dan alasan.");
    const data = {
      type: value.type, amount: parseRupiah(value.amount), transactionDate: dateValue(value.transactionDate),
      accountId: value.accountId, destinationAccountId: value.type === "TRANSFER" ? value.destinationAccountId : null,
      categoryId, adjustmentDirection: value.type === "ADJUSTMENT" ? value.adjustmentDirection as "INCREASE" | "DECREASE" : null,
      note: value.note || null,
    };
    await prisma.$transaction(async (db) => {
      const transaction = existing
        ? await db.transaction.update({ where: { id: existing.id }, data })
        : await db.transaction.create({ data: { userId, ...data, status: "POSTED", source: "MANUAL" } });
      await db.auditLog.create({ data: { userId, action: existing ? "UPDATE" : "CREATE", entity: "Transaction", entityId: transaction.id, changes: { type: value.type, amount: value.amount } } });
    });
    return done(existing ? "Transaksi diperbarui. Saldo dihitung ulang." : "Transaksi dicatat.");
  } catch (error) { return fail(error); }
}

export async function setTransactionVoided(id: string, voided: boolean): Promise<WorkspaceResult> {
  try {
    const userId = await ownerId();
    const transaction = await prisma.transaction.findFirst({ where: { id, userId } });
    if (!transaction) throw new InputError("Transaksi tidak ditemukan.");
    await prisma.$transaction([
      prisma.transaction.update({ where: { id }, data: { status: voided ? "VOID" : "POSTED", deletedAt: voided ? new Date() : null } }),
      prisma.auditLog.create({ data: { userId, action: voided ? "VOID" : "RESTORE", entity: "Transaction", entityId: id } }),
    ]);
    return done(voided ? "Transaksi dibatalkan. Saldo dan laporan dihitung ulang." : "Transaksi dipulihkan.");
  } catch (error) { return fail(error); }
}

const budgetFields = z.object({ id: optionalId, categoryId: idField, period: z.enum(["DAY", "MONTH", "CYCLE", "YEAR"]), amount: positiveMoney });

export async function saveBudget(_previous: WorkspaceResult, form: FormData): Promise<WorkspaceResult> {
  try {
    const userId = await ownerId();
    const parsed = budgetFields.safeParse(Object.fromEntries(form));
    if (!parsed.success) throw new InputError("Periksa kategori, periode, dan batas budget.");
    const value = parsed.data;
    const category = await prisma.category.findFirst({ where: { id: value.categoryId, userId, kind: "EXPENSE", isArchived: false } });
    if (!category) throw new InputError("Kategori pengeluaran tidak tersedia.");
    await prisma.$transaction(async (db) => {
      const budget = value.id
        ? await db.budgetLimit.findFirst({ where: { id: value.id, userId } })
        : null;
      if (value.id && !budget) throw new InputError("Budget tidak ditemukan.");
      const saved = budget
        ? await db.budgetLimit.update({ where: { id: budget.id }, data: { categoryId: value.categoryId, period: value.period, amount: parseRupiah(value.amount) } })
        : await db.budgetLimit.upsert({ where: { userId_categoryId_period: { userId, categoryId: value.categoryId, period: value.period } }, create: { userId, categoryId: value.categoryId, period: value.period, amount: parseRupiah(value.amount) }, update: { amount: parseRupiah(value.amount) } });
      await db.auditLog.create({ data: { userId, action: budget ? "UPDATE" : "UPSERT", entity: "BudgetLimit", entityId: saved.id, changes: { amount: value.amount, period: value.period } } });
    });
    return done("Batas budget disimpan.");
  } catch (error) { return fail(error); }
}

export async function deleteBudget(id: string): Promise<WorkspaceResult> {
  try {
    const userId = await ownerId();
    const budget = await prisma.budgetLimit.findFirst({ where: { id, userId } });
    if (!budget) throw new InputError("Budget tidak ditemukan.");
    await prisma.$transaction([
      prisma.budgetLimit.delete({ where: { id } }),
      prisma.auditLog.create({ data: { userId, action: "DELETE", entity: "BudgetLimit", entityId: id, changes: { categoryId: budget.categoryId, period: budget.period, amount: budget.amount.toString() } } }),
    ]);
    return done("Batas budget dihapus. Transaksi tetap ada.");
  } catch (error) { return fail(error); }
}
