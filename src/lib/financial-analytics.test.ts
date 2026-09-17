import { describe, expect, it } from "vitest";
import { categoryExpenses, monthlyCashFlow, monthlyGrowth, netWorthAt } from "./financial-analytics";
import type { WorkspaceData, TransactionView } from "./workspace-types";

const base: WorkspaceData = {
  accounts: [
    { id: "bank", name: "Bank", type: "BANK", openingBalance: "100000", openingDate: "2026-08-01", isArchived: false },
    { id: "invest", name: "Investasi", type: "INVESTMENT_CASH", openingBalance: "0", openingDate: "2026-08-01", isArchived: false },
  ],
  categories: [{ id: "food", name: "Makan", kind: "EXPENSE", parentId: null, icon: "utensils", isArchived: false }],
  transactions: [], budgets: [], goals: [], contributions: [], recurring: [], assets: [{ id: "fund", name: "Dana", symbol: null, assetType: "Fund", currency: "IDR", isArchived: false }], trades: [], prices: [], snapshots: [], imports: [], settings: { cycleStartDay: 25, currency: "IDR", timezone: "Asia/Jakarta" },
};
const tx = (id: string, type: TransactionView["type"], amount: string, date: string): TransactionView => ({ id, type, amount, date, accountId: "bank", destinationAccountId: type === "TRANSFER" ? "invest" : null, categoryId: type === "EXPENSE" ? "food" : null, adjustmentDirection: type === "ADJUSTMENT" ? "INCREASE" : null, note: null, status: "POSTED", source: "MANUAL" });

describe("financial analytics", () => {
  it("compares actual income and expense, excluding transfers, corrections, and voided entries", () => {
    const data: WorkspaceData = { ...base, transactions: [tx("salary", "INCOME", "200000", "2026-09-01"), tx("meal", "EXPENSE", "50000", "2026-09-02"), tx("move", "TRANSFER", "100000", "2026-09-03"), tx("fix", "ADJUSTMENT", "10000", "2026-09-04"), { ...tx("void", "EXPENSE", "50000", "2026-09-05"), status: "VOID" }] };
    expect(monthlyCashFlow(data, "2026-09-17", 1)[0]).toMatchObject({ income: 200000n, expense: 50000n, net: 150000n, expenseRate: 25 });
    expect(categoryExpenses(data, "2026-09-01", "2026-09-17")[0]).toMatchObject({ name: "Makan", amount: 50000n, percent: 100 });
    expect(netWorthAt(data, "2026-09-17")).toBe(260000n);
  });

  it("uses prices available at each month end and includes investment cash only once", () => {
    const data: WorkspaceData = { ...base, transactions: [tx("move", "TRANSFER", "50000", "2026-08-10")], trades: [{ id: "buy", accountId: "invest", assetId: "fund", type: "BUY", quantity: "2", unitPrice: "25000", totalAmount: "50000", date: "2026-08-15", deletedAt: null }], prices: [{ id: "new", assetId: "fund", date: "2026-09-05", price: "30000" }] };
    expect(netWorthAt(data, "2026-08-31")).toBe(100000n);
    expect(netWorthAt(data, "2026-09-17")).toBe(110000n);
    expect(monthlyGrowth(data, "2026-09-17", 1)[0]).toMatchObject({ change: 10000n, income: 0n, expense: 0n, otherChange: 10000n });
  });
});
