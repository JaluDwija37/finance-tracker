import type { WorkspaceData } from "./workspace-types";

export type MonthWindow = { start: string; end: string; label: string; isCurrent: boolean };

function units(value: string): bigint {
  const [whole, fraction = ""] = value.split(".");
  return BigInt(whole) * 100_000_000n + BigInt(fraction.padEnd(8, "0"));
}

export function monthWindows(today: string, count: number): MonthWindow[] {
  const current = new Date(`${today.slice(0, 7)}-01T00:00:00Z`);
  return Array.from({ length: count }, (_, index) => {
    const startDate = new Date(Date.UTC(current.getUTCFullYear(), current.getUTCMonth() - count + index + 1, 1));
    const next = new Date(Date.UTC(startDate.getUTCFullYear(), startDate.getUTCMonth() + 1, 1));
    const fullEnd = new Date(next.getTime() - 86_400_000).toISOString().slice(0, 10);
    const start = startDate.toISOString().slice(0, 10);
    return {
      start,
      end: fullEnd > today ? today : fullEnd,
      label: new Intl.DateTimeFormat("id-ID", { month: "short", year: "numeric", timeZone: "UTC" }).format(startDate),
      isCurrent: start.slice(0, 7) === today.slice(0, 7),
    };
  });
}

export function monthlyCashFlow(data: WorkspaceData, today: string, count: number) {
  return monthWindows(today, count).map((window) => {
    let income = 0n;
    let expense = 0n;
    for (const item of data.transactions) {
      if (item.status !== "POSTED" || item.date < window.start || item.date > window.end) continue;
      if (item.type === "INCOME") income += BigInt(item.amount);
      if (item.type === "EXPENSE") expense += BigInt(item.amount);
    }
    return { ...window, income, expense, net: income - expense, expenseRate: income > 0n ? Number(expense * 10_000n / income) / 100 : null };
  });
}

export function categoryExpenses(data: WorkspaceData, start: string, end: string) {
  const amounts = new Map<string, bigint>();
  let total = 0n;
  for (const item of data.transactions) {
    if (item.status !== "POSTED" || item.type !== "EXPENSE" || item.date < start || item.date > end) continue;
    const amount = BigInt(item.amount);
    total += amount;
    const key = item.categoryId ?? "uncategorized";
    amounts.set(key, (amounts.get(key) ?? 0n) + amount);
  }
  return [...amounts.entries()].map(([id, amount]) => ({
    id,
    name: data.categories.find((item) => item.id === id)?.name ?? "Tanpa kategori",
    icon: data.categories.find((item) => item.id === id)?.icon ?? null,
    amount,
    percent: total > 0n ? Number(amount * 10_000n / total) / 100 : 0,
  })).sort((a, b) => a.amount > b.amount ? -1 : a.amount < b.amount ? 1 : 0);
}

export function netWorthAt(data: WorkspaceData, end: string): bigint {
  const balances = new Map(data.accounts.filter((account) => account.openingDate <= end).map((account) => [account.id, BigInt(account.openingBalance)]));
  for (const item of data.transactions) {
    if (item.status !== "POSTED" || item.date > end || !balances.has(item.accountId)) continue;
    const amount = BigInt(item.amount);
    if (item.type === "TRANSFER") {
      balances.set(item.accountId, (balances.get(item.accountId) ?? 0n) - amount);
      if (item.destinationAccountId && balances.has(item.destinationAccountId)) balances.set(item.destinationAccountId, (balances.get(item.destinationAccountId) ?? 0n) + amount);
    } else {
      const positive = item.type === "INCOME" || item.type === "ADJUSTMENT" && item.adjustmentDirection === "INCREASE";
      balances.set(item.accountId, (balances.get(item.accountId) ?? 0n) + (positive ? amount : -amount));
    }
  }
  const holdings = new Map(data.assets.map((asset) => [asset.id, { quantity: 0n, cost: 0n }]));
  for (const trade of data.trades) {
    if (trade.deletedAt || trade.date > end) continue;
    const amount = BigInt(trade.totalAmount);
    if (balances.has(trade.accountId)) balances.set(trade.accountId, (balances.get(trade.accountId) ?? 0n) + (trade.type === "SELL" || trade.type === "DIVIDEND" ? amount : -amount));
    const holding = holdings.get(trade.assetId);
    if (!holding) continue;
    if (trade.type === "BUY") {
      holding.quantity += units(trade.quantity);
      holding.cost += amount;
    } else if (trade.type === "SELL" && holding.quantity > 0n) {
      const sold = units(trade.quantity);
      const removedCost = holding.cost * sold / holding.quantity;
      holding.quantity -= sold;
      holding.cost -= removedCost;
    }
  }
  let total = [...balances.values()].reduce((sum, value) => sum + value, 0n);
  for (const [assetId, holding] of holdings) {
    const price = data.prices.find((item) => item.assetId === assetId && item.date <= end);
    total += price ? holding.quantity * units(price.price) / 10_000_000_000_000_000n : holding.cost;
  }
  return total;
}

export function monthlyGrowth(data: WorkspaceData, today: string, count: number) {
  const windows = monthWindows(today, count + 1);
  return windows.slice(1).map((window, index) => {
    const netWorth = netWorthAt(data, window.end);
    const previous = netWorthAt(data, windows[index].end);
    const flow = monthlyCashFlow(data, window.end, 1)[0];
    const change = netWorth - previous;
    return { ...window, netWorth, change, changePercent: previous !== 0n ? Number(change * 10_000n / (previous < 0n ? -previous : previous)) / 100 : null, income: flow.income, expense: flow.expense, otherChange: change - flow.net };
  });
}
