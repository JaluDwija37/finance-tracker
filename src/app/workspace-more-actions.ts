"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { jakartaToday } from "@/lib/finance";
import { parseRupiah } from "@/lib/money";
import type { WorkspaceResult } from "./workspace-actions";

class InputError extends Error {}
const dateField = z.iso.date();
const id = z.string().trim().min(1);
const optionalId = z.union([z.literal(""), id]).optional();
const positiveMoney = z.string().regex(/^[1-9]\d*$/);
const decimal = z.string().regex(/^\d+(?:\.\d{1,8})?$/);
function units(value: string): bigint {
  const [whole, fraction = ""] = value.split(".");
  return BigInt(whole) * 100_000_000n + BigInt(fraction.padEnd(8, "0"));
}

async function ownerId() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) throw new InputError("Sesi berakhir. Masuk kembali.");
  return session.user.id;
}
function done(success: string): WorkspaceResult { revalidatePath("/"); revalidatePath("/charts"); revalidatePath("/growth"); return { error: "", success }; }
function fail(error: unknown): WorkspaceResult { return { error: error instanceof InputError ? error.message : "Perubahan gagal disimpan. Coba lagi.", success: "" }; }
function asDate(value: string) { return new Date(`${value}T00:00:00Z`); }

const goalFields = z.object({
  id: optionalId, name: z.string().trim().min(2).max(80), targetAmount: positiveMoney,
  targetDate: z.union([z.literal(""), dateField]).optional(), linkedAccountId: optionalId,
  priority: z.coerce.number().int().min(0).max(100).default(0),
  status: z.enum(["ACTIVE", "COMPLETED", "PAUSED"]).default("ACTIVE"),
});

export async function saveGoal(_previous: WorkspaceResult, form: FormData): Promise<WorkspaceResult> {
  try {
    const userId = await ownerId();
    const parsed = goalFields.safeParse(Object.fromEntries(form));
    if (!parsed.success) throw new InputError("Periksa nama, target, tanggal, dan akun tujuan.");
    const value = parsed.data;
    if (value.linkedAccountId && !await prisma.financialAccount.findFirst({ where: { id: value.linkedAccountId, userId, isArchived: false } })) throw new InputError("Akun tujuan tidak tersedia.");
    await prisma.$transaction(async (db) => {
      const data = { name: value.name, targetAmount: parseRupiah(value.targetAmount), targetDate: value.targetDate ? asDate(value.targetDate) : null, linkedAccountId: value.linkedAccountId || null, priority: value.priority, status: value.status };
      if (value.id) {
        const goal = await db.savingsGoal.findFirst({ where: { id: value.id, userId } });
        if (!goal) throw new InputError("Target tidak ditemukan.");
        await db.savingsGoal.update({ where: { id: goal.id }, data });
        await db.auditLog.create({ data: { userId, action: "UPDATE", entity: "SavingsGoal", entityId: goal.id, changes: { targetAmount: value.targetAmount, status: value.status } } });
      } else {
        const goal = await db.savingsGoal.create({ data: { userId, ...data } });
        await db.auditLog.create({ data: { userId, action: "CREATE", entity: "SavingsGoal", entityId: goal.id } });
      }
    });
    return done(value.id ? "Target diperbarui." : "Target ditambahkan.");
  } catch (error) { return fail(error); }
}

export async function setGoalArchived(goalId: string, archived: boolean): Promise<WorkspaceResult> {
  try {
    const userId = await ownerId();
    if (!await prisma.savingsGoal.findFirst({ where: { id: goalId, userId } })) throw new InputError("Target tidak ditemukan.");
    await prisma.$transaction([
      prisma.savingsGoal.update({ where: { id: goalId }, data: { isArchived: archived } }),
      prisma.auditLog.create({ data: { userId, action: archived ? "ARCHIVE" : "RESTORE", entity: "SavingsGoal", entityId: goalId } }),
    ]);
    return done(archived ? "Target diarsipkan. Kontribusi dan transaksi tetap ada." : "Target dipulihkan.");
  } catch (error) { return fail(error); }
}

const contributionFields = z.object({ id: optionalId, goalId: id, transactionId: id, amount: positiveMoney });

export async function saveContribution(_previous: WorkspaceResult, form: FormData): Promise<WorkspaceResult> {
  try {
    const userId = await ownerId();
    const parsed = contributionFields.safeParse(Object.fromEntries(form));
    if (!parsed.success) throw new InputError("Pilih target, transfer, dan nominal kontribusi.");
    const value = parsed.data;
    const [goal, transaction] = await Promise.all([
      prisma.savingsGoal.findFirst({ where: { id: value.goalId, userId, isArchived: false } }),
      prisma.transaction.findFirst({ where: { id: value.transactionId, userId, status: "POSTED", deletedAt: null, type: "TRANSFER" } }),
    ]);
    if (!goal || !transaction) throw new InputError("Target atau transfer tidak tersedia.");
    if (goal.linkedAccountId && transaction.destinationAccountId !== goal.linkedAccountId) throw new InputError("Transfer harus menuju akun yang terkait dengan target.");
    const existing = value.id ? await prisma.goalContribution.findFirst({ where: { id: value.id, userId } }) : null;
    if (value.id && !existing) throw new InputError("Kontribusi tidak ditemukan.");
    const used = await prisma.goalContribution.findMany({ where: { userId, transactionId: value.transactionId, id: value.id ? { not: value.id } : undefined } });
    if (used.reduce((sum, item) => sum + item.amount, 0n) + parseRupiah(value.amount) > transaction.amount) throw new InputError("Total kontribusi melebihi nominal transfer.");
    await prisma.$transaction(async (db) => {
      const data = { goalId: value.goalId, transactionId: value.transactionId, amount: parseRupiah(value.amount) };
      const item = existing ? await db.goalContribution.update({ where: { id: existing.id }, data }) : await db.goalContribution.create({ data: { userId, ...data } });
      await db.auditLog.create({ data: { userId, action: existing ? "UPDATE" : "CREATE", entity: "GoalContribution", entityId: item.id, changes: { amount: value.amount } } });
    });
    return done("Kontribusi ditautkan ke transfer. Saldo tidak bertambah dua kali.");
  } catch (error) { return fail(error); }
}

export async function deleteContribution(contributionId: string): Promise<WorkspaceResult> {
  try {
    const userId = await ownerId();
    const item = await prisma.goalContribution.findFirst({ where: { id: contributionId, userId } });
    if (!item) throw new InputError("Kontribusi tidak ditemukan.");
    await prisma.$transaction([
      prisma.goalContribution.delete({ where: { id: item.id } }),
      prisma.auditLog.create({ data: { userId, action: "UNLINK", entity: "GoalContribution", entityId: item.id, changes: { transactionId: item.transactionId, amount: item.amount.toString() } } }),
    ]);
    return done("Tautan kontribusi dilepas. Transfer tetap ada.");
  } catch (error) { return fail(error); }
}

const recurringFields = z.object({
  id: optionalId, type: z.enum(["INCOME", "EXPENSE", "TRANSFER"]), amount: positiveMoney,
  accountId: id, destinationAccountId: optionalId, categoryId: optionalId,
  dueDay: z.coerce.number().int().min(1).max(28), cadenceMonths: z.coerce.number().int().min(1).max(12),
  startDate: dateField, endDate: z.union([z.literal(""), dateField]).optional(),
  nextDueDate: dateField, note: z.string().trim().max(300).optional(),
  active: z.union([z.literal("true"), z.literal("false")]).default("true"),
});

export async function saveRecurring(_previous: WorkspaceResult, form: FormData): Promise<WorkspaceResult> {
  try {
    const userId = await ownerId();
    const parsed = recurringFields.safeParse(Object.fromEntries(form));
    if (!parsed.success) throw new InputError("Periksa detail transaksi berulang.");
    const value = parsed.data;
    if (value.endDate && value.endDate < value.startDate) throw new InputError("Tanggal selesai mendahului tanggal mulai.");
    if (value.nextDueDate < value.startDate || (value.endDate && value.nextDueDate > value.endDate)) throw new InputError("Tanggal jatuh tempo di luar masa berlaku.");
    const accounts = await prisma.financialAccount.findMany({ where: { userId, isArchived: false, id: { in: [value.accountId, value.destinationAccountId || ""] } } });
    if (!accounts.some((account) => account.id === value.accountId)) throw new InputError("Akun tidak tersedia.");
    if (value.type === "TRANSFER" && (!value.destinationAccountId || value.destinationAccountId === value.accountId || !accounts.some((account) => account.id === value.destinationAccountId))) throw new InputError("Akun tujuan tidak valid.");
    let categoryId: string | null = null;
    if (value.type !== "TRANSFER") {
      const category = await prisma.category.findFirst({ where: { id: value.categoryId, userId, kind: value.type, isArchived: false } });
      if (!category) throw new InputError("Kategori tidak sesuai.");
      categoryId = category.id;
    }
    await prisma.$transaction(async (db) => {
      const data = { type: value.type, amount: parseRupiah(value.amount), accountId: value.accountId, destinationAccountId: value.type === "TRANSFER" ? value.destinationAccountId : null, categoryId, dueDay: value.dueDay, cadenceMonths: value.cadenceMonths, startDate: asDate(value.startDate), endDate: value.endDate ? asDate(value.endDate) : null, nextDueDate: asDate(value.nextDueDate), note: value.note || null, active: value.active === "true" };
      if (value.id) {
        const rule = await db.recurringRule.findFirst({ where: { id: value.id, userId } });
        if (!rule) throw new InputError("Jadwal tidak ditemukan.");
        await db.recurringRule.update({ where: { id: rule.id }, data });
        await db.auditLog.create({ data: { userId, action: "UPDATE", entity: "RecurringRule", entityId: rule.id } });
      } else {
        const rule = await db.recurringRule.create({ data: { userId, ...data } });
        await db.auditLog.create({ data: { userId, action: "CREATE", entity: "RecurringRule", entityId: rule.id } });
      }
    });
    return done(value.id ? "Jadwal diperbarui." : "Jadwal ditambahkan.");
  } catch (error) { return fail(error); }
}

export async function deleteRecurring(ruleId: string): Promise<WorkspaceResult> {
  try {
    const userId = await ownerId();
    const rule = await prisma.recurringRule.findFirst({ where: { id: ruleId, userId } });
    if (!rule) throw new InputError("Jadwal tidak ditemukan.");
    await prisma.$transaction([
      prisma.recurringRule.delete({ where: { id: ruleId } }),
      prisma.auditLog.create({ data: { userId, action: "DELETE", entity: "RecurringRule", entityId: ruleId } }),
    ]);
    return done("Jadwal dihapus. Transaksi yang sudah dicatat tetap ada.");
  } catch (error) { return fail(error); }
}

export async function createRecurringDraft(ruleId: string): Promise<WorkspaceResult> {
  try {
    const userId = await ownerId();
    const rule = await prisma.recurringRule.findFirst({ where: { id: ruleId, userId, active: true } });
    if (!rule) throw new InputError("Jadwal aktif tidak ditemukan.");
    const due = rule.nextDueDate.toISOString().slice(0, 10);
    if (rule.endDate && due > rule.endDate.toISOString().slice(0, 10)) throw new InputError("Jadwal sudah selesai.");
    const externalId = `${rule.id}:${due}`;
    if (await prisma.transaction.findFirst({ where: { userId, source: "RECURRING", externalId } })) throw new InputError("Draft untuk tanggal ini sudah ada.");
    const next = new Date(Date.UTC(rule.nextDueDate.getUTCFullYear(), rule.nextDueDate.getUTCMonth() + rule.cadenceMonths, rule.dueDay));
    await prisma.$transaction(async (db) => {
      const transaction = await db.transaction.create({ data: { userId, type: rule.type, amount: rule.amount, transactionDate: rule.nextDueDate, accountId: rule.accountId, destinationAccountId: rule.destinationAccountId, categoryId: rule.categoryId, note: rule.note, status: "DRAFT", source: "RECURRING", externalId, recurringOccurrenceDate: rule.nextDueDate } });
      await db.recurringRule.update({ where: { id: rule.id }, data: { nextDueDate: next, active: rule.endDate ? next <= rule.endDate : true } });
      await db.auditLog.create({ data: { userId, action: "CREATE_DRAFT", entity: "Transaction", entityId: transaction.id, changes: { recurringRuleId: rule.id, due } } });
    });
    return done("Draft dibuat. Konfirmasi transaksi saat pembayaran benar-benar terjadi.");
  } catch (error) { return fail(error); }
}

export async function confirmRecurringDraft(transactionId: string): Promise<WorkspaceResult> {
  try {
    const userId = await ownerId();
    const transaction = await prisma.transaction.findFirst({ where: { id: transactionId, userId, source: "RECURRING", status: "DRAFT" } });
    if (!transaction) throw new InputError("Draft tidak ditemukan.");
    if (transaction.transactionDate.toISOString().slice(0, 10) > jakartaToday()) throw new InputError("Transaksi belum terjadi. Ubah tanggal saat sudah dibayar.");
    await prisma.$transaction([
      prisma.transaction.update({ where: { id: transactionId }, data: { status: "POSTED" } }),
      prisma.auditLog.create({ data: { userId, action: "POST", entity: "Transaction", entityId: transactionId } }),
    ]);
    return done("Draft dikonfirmasi dan masuk saldo.");
  } catch (error) { return fail(error); }
}

const assetFields = z.object({ id: optionalId, name: z.string().trim().min(2).max(80), symbol: z.string().trim().max(20).optional(), assetType: z.string().trim().min(2).max(40) });

export async function saveAsset(_previous: WorkspaceResult, form: FormData): Promise<WorkspaceResult> {
  try {
    const userId = await ownerId();
    const parsed = assetFields.safeParse(Object.fromEntries(form));
    if (!parsed.success) throw new InputError("Periksa nama, simbol, dan jenis aset.");
    const value = parsed.data;
    await prisma.$transaction(async (db) => {
      const data = { name: value.name, symbol: value.symbol || null, assetType: value.assetType };
      if (value.id) {
        const asset = await db.investmentAsset.findFirst({ where: { id: value.id, userId } });
        if (!asset) throw new InputError("Aset tidak ditemukan.");
        await db.investmentAsset.update({ where: { id: asset.id }, data });
        await db.auditLog.create({ data: { userId, action: "UPDATE", entity: "InvestmentAsset", entityId: asset.id } });
      } else {
        const asset = await db.investmentAsset.create({ data: { userId, ...data } });
        await db.auditLog.create({ data: { userId, action: "CREATE", entity: "InvestmentAsset", entityId: asset.id } });
      }
    });
    return done(value.id ? "Aset diperbarui." : "Aset ditambahkan.");
  } catch (error) { return fail(error); }
}

export async function setAssetArchived(assetId: string, archived: boolean): Promise<WorkspaceResult> {
  try {
    const userId = await ownerId();
    if (!await prisma.investmentAsset.findFirst({ where: { id: assetId, userId } })) throw new InputError("Aset tidak ditemukan.");
    await prisma.$transaction([
      prisma.investmentAsset.update({ where: { id: assetId }, data: { isArchived: archived } }),
      prisma.auditLog.create({ data: { userId, action: archived ? "ARCHIVE" : "RESTORE", entity: "InvestmentAsset", entityId: assetId } }),
    ]);
    return done(archived ? "Aset diarsipkan. Riwayat perdagangan tetap ada." : "Aset dipulihkan.");
  } catch (error) { return fail(error); }
}

const tradeFields = z.object({ id: optionalId, accountId: id, assetId: id, type: z.enum(["BUY", "SELL", "DIVIDEND", "FEE"]), quantity: decimal, unitPrice: decimal, totalAmount: positiveMoney, date: dateField });

async function checkAssetLedger(userId: string, assetId: string, excludeId?: string, candidate?: { type: "BUY" | "SELL" | "DIVIDEND" | "FEE"; quantity: string; date: string }) {
  const trades = await prisma.investmentTransaction.findMany({ where: { userId, assetId, deletedAt: null, id: excludeId ? { not: excludeId } : undefined }, orderBy: [{ transactionDate: "asc" }, { createdAt: "asc" }] });
  const entries = trades.map((item) => ({ type: item.type, quantity: item.quantity.toString(), date: item.transactionDate.toISOString().slice(0, 10) }));
  if (candidate) entries.push(candidate);
  entries.sort((a, b) => a.date.localeCompare(b.date));
  let held = 0n;
  for (const item of entries) {
    if (item.type === "BUY") held += units(item.quantity);
    if (item.type === "SELL") held -= units(item.quantity);
    if (held < 0n) throw new InputError("Unit yang dijual melebihi kepemilikan pada tanggal tersebut.");
  }
}

export async function saveTrade(_previous: WorkspaceResult, form: FormData): Promise<WorkspaceResult> {
  try {
    const userId = await ownerId();
    const parsed = tradeFields.safeParse(Object.fromEntries(form));
    if (!parsed.success) throw new InputError("Periksa aset, akun investasi, jumlah, harga, dan tanggal.");
    const value = parsed.data;
    if (value.date > jakartaToday()) throw new InputError("Tanggal transaksi investasi belum terjadi.");
    const [account, asset, existing] = await Promise.all([
      prisma.financialAccount.findFirst({ where: { id: value.accountId, userId, type: "INVESTMENT_CASH" } }),
      prisma.investmentAsset.findFirst({ where: { id: value.assetId, userId } }),
      value.id ? prisma.investmentTransaction.findFirst({ where: { id: value.id, userId } }) : Promise.resolve(null),
    ]);
    if (!account || !asset || (value.id && !existing)) throw new InputError("Akun, aset, atau transaksi investasi tidak tersedia.");
    if ((value.type === "BUY" || value.type === "SELL") && Number(value.quantity) <= 0) throw new InputError("Jumlah unit harus lebih dari nol.");
    if (existing?.deletedAt) throw new InputError("Pulihkan transaksi yang dibatalkan sebelum mengubahnya.");
    await checkAssetLedger(userId, value.assetId, existing?.id, { type: value.type, quantity: value.quantity, date: value.date });
    if (existing && existing.assetId !== value.assetId) await checkAssetLedger(userId, existing.assetId, existing.id);
    await prisma.$transaction(async (db) => {
      const data = { accountId: value.accountId, assetId: value.assetId, type: value.type, quantity: value.quantity, unitPrice: value.unitPrice, totalAmount: parseRupiah(value.totalAmount), transactionDate: asDate(value.date) };
      const trade = existing ? await db.investmentTransaction.update({ where: { id: existing.id }, data }) : await db.investmentTransaction.create({ data: { userId, ...data } });
      await db.auditLog.create({ data: { userId, action: existing ? "UPDATE" : "CREATE", entity: "InvestmentTransaction", entityId: trade.id, changes: { type: value.type, amount: value.totalAmount } } });
    });
    return done(existing ? "Transaksi investasi diperbarui." : "Transaksi investasi dicatat.");
  } catch (error) { return fail(error); }
}

export async function setTradeVoided(tradeId: string, voided: boolean): Promise<WorkspaceResult> {
  try {
    const userId = await ownerId();
    const trade = await prisma.investmentTransaction.findFirst({ where: { id: tradeId, userId } });
    if (!trade) throw new InputError("Transaksi investasi tidak ditemukan.");
    if (voided) await checkAssetLedger(userId, trade.assetId, trade.id);
    else await checkAssetLedger(userId, trade.assetId, trade.id, { type: trade.type, quantity: trade.quantity.toString(), date: trade.transactionDate.toISOString().slice(0, 10) });
    await prisma.$transaction([
      prisma.investmentTransaction.update({ where: { id: tradeId }, data: { deletedAt: voided ? new Date() : null } }),
      prisma.auditLog.create({ data: { userId, action: voided ? "VOID" : "RESTORE", entity: "InvestmentTransaction", entityId: tradeId } }),
    ]);
    return done(voided ? "Transaksi investasi dibatalkan." : "Transaksi investasi dipulihkan.");
  } catch (error) { return fail(error); }
}

const priceFields = z.object({ id: optionalId, assetId: id, date: dateField, price: decimal });

export async function savePrice(_previous: WorkspaceResult, form: FormData): Promise<WorkspaceResult> {
  try {
    const userId = await ownerId();
    const parsed = priceFields.safeParse(Object.fromEntries(form));
    if (!parsed.success || Number(parsed.data.price) <= 0) throw new InputError("Periksa aset, tanggal, dan harga per unit.");
    const value = parsed.data;
    if (value.date > jakartaToday()) throw new InputError("Tanggal harga belum terjadi.");
    if (!await prisma.investmentAsset.findFirst({ where: { id: value.assetId, userId } })) throw new InputError("Aset tidak ditemukan.");
    await prisma.$transaction(async (db) => {
      const data = { assetId: value.assetId, date: asDate(value.date), price: value.price };
      const item = value.id
        ? await db.investmentPriceSnapshot.findFirst({ where: { id: value.id, userId } })
        : null;
      if (value.id && !item) throw new InputError("Harga tidak ditemukan.");
      const saved = item ? await db.investmentPriceSnapshot.update({ where: { id: item.id }, data }) : await db.investmentPriceSnapshot.upsert({ where: { assetId_date: { assetId: value.assetId, date: asDate(value.date) } }, create: { userId, ...data }, update: { price: value.price } });
      await db.auditLog.create({ data: { userId, action: item ? "UPDATE" : "UPSERT", entity: "InvestmentPriceSnapshot", entityId: saved.id, changes: { price: value.price } } });
    });
    return done("Harga aset disimpan.");
  } catch (error) { return fail(error); }
}

export async function deletePrice(priceId: string): Promise<WorkspaceResult> {
  try {
    const userId = await ownerId();
    const price = await prisma.investmentPriceSnapshot.findFirst({ where: { id: priceId, userId } });
    if (!price) throw new InputError("Harga tidak ditemukan.");
    await prisma.$transaction([
      prisma.investmentPriceSnapshot.delete({ where: { id: priceId } }),
      prisma.auditLog.create({ data: { userId, action: "DELETE", entity: "InvestmentPriceSnapshot", entityId: priceId, changes: { assetId: price.assetId, price: price.price.toString() } } }),
    ]);
    return done("Harga aset dihapus.");
  } catch (error) { return fail(error); }
}

const snapshotFields = z.object({ id: optionalId, accountId: id, date: dateField, observedBalance: z.string().regex(/^-?(0|[1-9]\d*)$/), note: z.string().trim().max(300).optional() });

export async function saveSnapshot(_previous: WorkspaceResult, form: FormData): Promise<WorkspaceResult> {
  try {
    const userId = await ownerId();
    const parsed = snapshotFields.safeParse(Object.fromEntries(form));
    if (!parsed.success) throw new InputError("Periksa akun, tanggal, dan saldo hasil pengecekan.");
    const value = parsed.data;
    if (value.date > jakartaToday()) throw new InputError("Tanggal rekonsiliasi belum terjadi.");
    const account = await prisma.financialAccount.findFirst({ where: { id: value.accountId, userId } });
    if (!account) throw new InputError("Akun tidak ditemukan.");
    if (value.date < account.openingDate.toISOString().slice(0, 10)) throw new InputError("Tanggal pemeriksaan mendahului tanggal awal akun.");
    const [transactions, trades] = await Promise.all([
      prisma.transaction.findMany({ where: { userId, status: "POSTED", deletedAt: null, transactionDate: { lte: asDate(value.date) }, OR: [{ accountId: account.id }, { destinationAccountId: account.id }] } }),
      prisma.investmentTransaction.findMany({ where: { userId, accountId: account.id, deletedAt: null, transactionDate: { lte: asDate(value.date) } } }),
    ]);
    let calculated = account.openingBalance;
    for (const transaction of transactions) {
      if (transaction.type === "TRANSFER") calculated += transaction.accountId === account.id ? -transaction.amount : transaction.amount;
      else if (transaction.accountId === account.id) calculated += transaction.type === "INCOME" ? transaction.amount : transaction.type === "EXPENSE" ? -transaction.amount : transaction.adjustmentDirection === "INCREASE" ? transaction.amount : -transaction.amount;
    }
    for (const trade of trades) calculated += trade.type === "SELL" || trade.type === "DIVIDEND" ? trade.totalAmount : -trade.totalAmount;
    const observed = BigInt(value.observedBalance);
    await prisma.$transaction(async (db) => {
      const data = { accountId: account.id, date: asDate(value.date), observedBalance: observed, calculatedBalance: calculated, difference: observed - calculated, note: value.note || null };
      const item = value.id ? await db.balanceSnapshot.findFirst({ where: { id: value.id, userId } }) : null;
      if (value.id && !item) throw new InputError("Rekonsiliasi tidak ditemukan.");
      const saved = item ? await db.balanceSnapshot.update({ where: { id: item.id }, data }) : await db.balanceSnapshot.upsert({ where: { accountId_date: { accountId: account.id, date: asDate(value.date) } }, create: { userId, ...data }, update: data });
      await db.auditLog.create({ data: { userId, action: item ? "UPDATE" : "UPSERT", entity: "BalanceSnapshot", entityId: saved.id, changes: { observed: observed.toString(), difference: (observed - calculated).toString() } } });
    });
    return done("Rekonsiliasi disimpan. Selisih tidak otomatis menjadi pengeluaran.");
  } catch (error) { return fail(error); }
}

export async function deleteSnapshot(snapshotId: string): Promise<WorkspaceResult> {
  try {
    const userId = await ownerId();
    if (!await prisma.balanceSnapshot.findFirst({ where: { id: snapshotId, userId } })) throw new InputError("Rekonsiliasi tidak ditemukan.");
    await prisma.$transaction([
      prisma.balanceSnapshot.delete({ where: { id: snapshotId } }),
      prisma.auditLog.create({ data: { userId, action: "DELETE", entity: "BalanceSnapshot", entityId: snapshotId } }),
    ]);
    return done("Rekonsiliasi dihapus. Transaksi tidak berubah.");
  } catch (error) { return fail(error); }
}

export async function saveSettings(_previous: WorkspaceResult, form: FormData): Promise<WorkspaceResult> {
  try {
    const userId = await ownerId();
    const parsed = z.object({ cycleStartDay: z.coerce.number().int().min(1).max(28) }).safeParse(Object.fromEntries(form));
    if (!parsed.success) throw new InputError("Tanggal mulai siklus harus 1 sampai 28.");
    await prisma.$transaction([
      prisma.userSettings.upsert({ where: { userId }, create: { userId, cycleStartDay: parsed.data.cycleStartDay }, update: { cycleStartDay: parsed.data.cycleStartDay } }),
      prisma.auditLog.create({ data: { userId, action: "UPDATE", entity: "UserSettings", entityId: userId, changes: { cycleStartDay: parsed.data.cycleStartDay } } }),
    ]);
    return done("Pengaturan siklus diperbarui.");
  } catch (error) { return fail(error); }
}
