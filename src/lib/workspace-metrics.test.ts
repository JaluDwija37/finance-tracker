import { describe, expect, it } from "vitest";
import { accountBalances, budgetProgress, cycleSummary, fundedFor, portfolioFor } from "./workspace-metrics";
import type { WorkspaceData, TransactionView } from "./workspace-types";

const base: WorkspaceData = {
  accounts: [
    { id: "bank", name: "Bank", type: "BANK", openingBalance: "1000000", openingDate: "2026-08-01", isArchived: false },
    { id: "invest", name: "Investasi", type: "INVESTMENT_CASH", openingBalance: "0", openingDate: "2026-08-01", isArchived: false },
  ],
  categories: [{ id: "food", name: "Makan", kind: "EXPENSE", parentId: null, isArchived: false }],
  transactions: [], budgets: [{ id: "limit", categoryId: "food", period: "CYCLE", amount: "100000" }], goals: [], contributions: [], recurring: [],
  assets: [{ id: "fund", name: "Reksa dana", symbol: null, assetType: "Fund", currency: "IDR", isArchived: false }],
  trades: [], prices: [], snapshots: [], imports: [], settings: { cycleStartDay: 25, currency: "IDR", timezone: "Asia/Jakarta" },
};
function transaction(id: string, type: TransactionView["type"], amount: string, date = "2026-09-14"): TransactionView {
  return { id, type, amount, date, accountId: "bank", destinationAccountId: type === "TRANSFER" ? "invest" : null, categoryId: type === "EXPENSE" ? "food" : null, adjustmentDirection: null, note: null, status: "POSTED", source: "MANUAL" };
}

describe("workspace financial totals", () => {
  it("moves transfers between accounts without treating them as income or expense", () => {
    const data = { ...base, transactions: [transaction("transfer", "TRANSFER", "300000"), transaction("food", "EXPENSE", "43000"), { ...transaction("void", "EXPENSE", "90000"), status: "VOID" as const }] };
    const balances = accountBalances(data);
    expect(balances.get("bank")).toBe(657000n);
    expect(balances.get("invest")).toBe(300000n);
    expect(cycleSummary(data, "2026-09-17")).toMatchObject({ income: 0n, expense: 43000n, net: -43000n });
    expect(budgetProgress(data, "2026-09-17")[0]).toMatchObject({ spent: 43000n, remaining: 57000n, percent: 43 });
  });

  it("counts investment cash and holdings once, using manual price when available", () => {
    const data: WorkspaceData = { ...base, transactions: [transaction("transfer", "TRANSFER", "300000")], trades: [{ id: "buy", accountId: "invest", assetId: "fund", type: "BUY", quantity: "2", unitPrice: "100000", totalAmount: "200000", date: "2026-09-14", deletedAt: null }], prices: [{ id: "price", assetId: "fund", date: "2026-09-14", price: "110000" }] };
    expect(accountBalances(data).get("invest")).toBe(100000n);
    expect(portfolioFor(data).get("fund")?.marketValue).toBe(220000n);
    expect(fundedFor({ ...data, goals: [{ id: "goal", name: "Dana", targetAmount: "300000", targetDate: null, linkedAccountId: "invest", priority: 0, status: "ACTIVE", isArchived: false }], contributions: [{ id: "link", goalId: "goal", transactionId: "transfer", amount: "100000" }] }, "goal")).toBe(100000n);
  });
});
