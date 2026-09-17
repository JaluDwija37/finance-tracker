import { prisma } from "./prisma";
import type { WorkspaceData } from "./workspace-types";

const iso = (date: Date) => date.toISOString().slice(0, 10);

export async function getWorkspaceData(userId: string): Promise<WorkspaceData> {
  const [accounts, categories, transactions, budgets, goals, contributions, recurring, assets, trades, prices, snapshots, imports, settings] = await Promise.all([
    prisma.financialAccount.findMany({ where: { userId }, orderBy: { createdAt: "asc" } }),
    prisma.category.findMany({ where: { userId }, orderBy: [{ kind: "asc" }, { sortOrder: "asc" }, { name: "asc" }] }),
    prisma.transaction.findMany({ where: { userId }, orderBy: [{ transactionDate: "desc" }, { createdAt: "desc" }] }),
    prisma.budgetLimit.findMany({ where: { userId }, orderBy: [{ period: "asc" }, { createdAt: "asc" }] }),
    prisma.savingsGoal.findMany({ where: { userId }, orderBy: [{ priority: "desc" }, { name: "asc" }] }),
    prisma.goalContribution.findMany({ where: { userId } }),
    prisma.recurringRule.findMany({ where: { userId }, orderBy: { nextDueDate: "asc" } }),
    prisma.investmentAsset.findMany({ where: { userId }, orderBy: { name: "asc" } }),
    prisma.investmentTransaction.findMany({ where: { userId }, orderBy: [{ transactionDate: "asc" }, { createdAt: "asc" }] }),
    prisma.investmentPriceSnapshot.findMany({ where: { userId }, orderBy: { date: "desc" } }),
    prisma.balanceSnapshot.findMany({ where: { userId }, orderBy: { date: "desc" }, take: 50 }),
    prisma.importBatch.findMany({ where: { userId, status: "COMMITTED" }, orderBy: { createdAt: "desc" }, take: 10 }),
    prisma.userSettings.findUnique({ where: { userId } }),
  ]);
  return {
    accounts: accounts.map(({ id, name, type, openingBalance, openingDate, isArchived }) => ({ id, name, type, openingBalance: openingBalance.toString(), openingDate: iso(openingDate), isArchived })),
    categories: categories.map(({ id, name, kind, parentId, icon, isArchived }) => ({ id, name, kind, parentId, icon, isArchived })),
    transactions: transactions.map(({ id, type, amount, transactionDate, accountId, destinationAccountId, categoryId, adjustmentDirection, note, status, source }) => ({ id, type, amount: amount.toString(), date: iso(transactionDate), accountId, destinationAccountId, categoryId, adjustmentDirection, note, status, source })),
    budgets: budgets.map(({ id, categoryId, period, amount }) => ({ id, categoryId, period, amount: amount.toString() })),
    goals: goals.map(({ id, name, targetAmount, targetDate, linkedAccountId, priority, status, isArchived }) => ({ id, name, targetAmount: targetAmount.toString(), targetDate: targetDate ? iso(targetDate) : null, linkedAccountId, priority, status, isArchived })),
    contributions: contributions.map(({ id, goalId, transactionId, amount }) => ({ id, goalId, transactionId, amount: amount.toString() })),
    recurring: recurring.map(({ id, type, amount, accountId, destinationAccountId, categoryId, dueDay, cadenceMonths, startDate, endDate, nextDueDate, active, note }) => ({ id, type, amount: amount.toString(), accountId, destinationAccountId, categoryId, dueDay, cadenceMonths, startDate: iso(startDate), endDate: endDate ? iso(endDate) : null, nextDueDate: iso(nextDueDate), active, note })),
    assets: assets.map(({ id, name, symbol, assetType, currency, isArchived }) => ({ id, name, symbol, assetType, currency, isArchived })),
    trades: trades.map(({ id, accountId, assetId, type, quantity, unitPrice, totalAmount, transactionDate, deletedAt }) => ({ id, accountId, assetId, type, quantity: quantity.toString(), unitPrice: unitPrice.toString(), totalAmount: totalAmount.toString(), date: iso(transactionDate), deletedAt: deletedAt?.toISOString() ?? null })),
    prices: prices.map(({ id, assetId, date, price }) => ({ id, assetId, date: iso(date), price: price.toString() })),
    snapshots: snapshots.map(({ id, accountId, date, observedBalance, calculatedBalance, difference, note }) => ({ id, accountId, date: iso(date), observedBalance: observedBalance.toString(), calculatedBalance: calculatedBalance.toString(), difference: difference.toString(), note })),
    imports: imports.map(({ id, filename, rowCount, createdAt }) => ({ id, filename, rowCount, createdAt: createdAt.toISOString() })),
    settings: { cycleStartDay: settings?.cycleStartDay ?? 25, currency: settings?.currency ?? "IDR", timezone: settings?.timezone ?? "Asia/Jakarta" },
  };
}
