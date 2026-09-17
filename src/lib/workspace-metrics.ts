import { cycleForDate } from "./cycle";
import { periodWindow } from "./budgets";
import type { WorkspaceData, TransactionView } from "./workspace-types";

const SCALE = 100_000_000n;

function decimal8(value: string): bigint {
  const [whole, fraction = ""] = value.split(".");
  return BigInt(whole) * SCALE + BigInt(fraction.padEnd(8, "0"));
}

export function posted(transaction: TransactionView) {
  return transaction.status === "POSTED";
}

export function accountBalances(data: WorkspaceData) {
  const balances = new Map(data.accounts.map((account) => [account.id, BigInt(account.openingBalance)]));
  for (const item of data.transactions) {
    if (!posted(item)) continue;
    const amount = BigInt(item.amount);
    if (item.type === "TRANSFER") {
      balances.set(item.accountId, (balances.get(item.accountId) ?? 0n) - amount);
      if (item.destinationAccountId) balances.set(item.destinationAccountId, (balances.get(item.destinationAccountId) ?? 0n) + amount);
    } else {
      const delta = item.type === "INCOME" || item.type === "ADJUSTMENT" && item.adjustmentDirection === "INCREASE" ? amount : -amount;
      balances.set(item.accountId, (balances.get(item.accountId) ?? 0n) + delta);
    }
  }
  for (const trade of data.trades) {
    if (trade.deletedAt) continue;
    const amount = BigInt(trade.totalAmount);
    const delta = trade.type === "SELL" || trade.type === "DIVIDEND" ? amount : -amount;
    balances.set(trade.accountId, (balances.get(trade.accountId) ?? 0n) + delta);
  }
  return balances;
}

export function portfolioFor(data: WorkspaceData) {
  const holdings = new Map(data.assets.map((asset) => [asset.id, { quantity: 0n, cost: 0n, marketValue: 0n, hasPrice: false }]));
  for (const trade of data.trades) {
    if (trade.deletedAt || (trade.type !== "BUY" && trade.type !== "SELL")) continue;
    const item = holdings.get(trade.assetId);
    if (!item) continue;
    const quantity = decimal8(trade.quantity);
    if (trade.type === "BUY") {
      item.quantity += quantity;
      item.cost += BigInt(trade.totalAmount);
    } else if (item.quantity > 0n) {
      const disposedCost = item.cost * quantity / item.quantity;
      item.quantity -= quantity;
      item.cost -= disposedCost;
      if (item.quantity < 0n) item.quantity = 0n;
    }
  }
  for (const asset of data.assets) {
    const item = holdings.get(asset.id)!;
    const latest = data.prices.find((price) => price.assetId === asset.id);
    item.hasPrice = Boolean(latest);
    item.marketValue = latest ? item.quantity * decimal8(latest.price) / (SCALE * SCALE) : item.cost;
  }
  return holdings;
}

export function cycleSummary(data: WorkspaceData, today: string) {
  const cycle = cycleForDate(today, data.settings.cycleStartDay);
  let income = 0n;
  let expense = 0n;
  const categories = new Map<string, bigint>();
  for (const item of data.transactions) {
    if (!posted(item) || item.date < cycle.start || item.date > cycle.end) continue;
    if (item.type === "INCOME") income += BigInt(item.amount);
    if (item.type === "EXPENSE") {
      expense += BigInt(item.amount);
      if (item.categoryId) categories.set(item.categoryId, (categories.get(item.categoryId) ?? 0n) + BigInt(item.amount));
    }
  }
  return { ...cycle, income, expense, net: income - expense, categories };
}

export function budgetProgress(data: WorkspaceData, today: string) {
  return data.budgets.map((budget) => {
    const window = periodWindow(today, budget.period, data.settings.cycleStartDay);
    const spent = data.transactions.reduce((sum, item) => sum + (posted(item) && item.type === "EXPENSE" && item.categoryId === budget.categoryId && item.date >= window.start && item.date <= window.end ? BigInt(item.amount) : 0n), 0n);
    const amount = BigInt(budget.amount);
    return { ...budget, ...window, spent, remaining: amount - spent, percent: Number(spent * 100n / amount) };
  });
}

export function fundedFor(data: WorkspaceData, goalId: string): bigint {
  const postedIds = new Set(data.transactions.filter(posted).map((transaction) => transaction.id));
  return data.contributions.reduce((sum, item) => sum + (item.goalId === goalId && postedIds.has(item.transactionId) ? BigInt(item.amount) : 0n), 0n);
}

export function recentCycles(data: WorkspaceData, today: string, count = 6) {
  const current = cycleForDate(today, data.settings.cycleStartDay);
  return Array.from({ length: count }, (_, index) => {
    const start = new Date(`${current.start}T00:00:00Z`);
    start.setUTCMonth(start.getUTCMonth() - (count - index - 1));
    const cycle = cycleForDate(start.toISOString().slice(0, 10), data.settings.cycleStartDay);
    const entries = data.transactions.filter((item) => posted(item) && item.date >= cycle.start && item.date <= cycle.end);
    const income = entries.reduce((sum, item) => sum + (item.type === "INCOME" ? BigInt(item.amount) : 0n), 0n);
    const expense = entries.reduce((sum, item) => sum + (item.type === "EXPENSE" ? BigInt(item.amount) : 0n), 0n);
    return { ...cycle, income, expense, net: income - expense };
  });
}
