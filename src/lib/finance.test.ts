import { describe, expect, it } from "vitest";
import { balancesForAccounts, cycleTotals, type PostedTransaction } from "./finance";

function tx(partial: Partial<PostedTransaction>): PostedTransaction {
  return {
    type: "EXPENSE", amount: 100n, accountId: "a", destinationAccountId: null,
    adjustmentDirection: null, transactionDate: new Date("2026-09-25T00:00:00Z"), ...partial,
  };
}

describe("finance totals", () => {
  it("moves transfers without counting them as income or expense", () => {
    const transactions = [tx({ type: "TRANSFER", destinationAccountId: "b" })];
    expect(balancesForAccounts([{ id: "a", openingBalance: 500n }, { id: "b", openingBalance: 0n }], transactions))
      .toEqual(new Map([["a", 400n], ["b", 100n]]));
    expect(cycleTotals(transactions, "2026-09-25").net).toBe(0n);
  });

  it("keeps adjustments out of spending and separates the 24th from the 25th", () => {
    const transactions = [
      tx({ type: "ADJUSTMENT", adjustmentDirection: "DECREASE" }),
      tx({ type: "EXPENSE", transactionDate: new Date("2026-09-24T00:00:00Z") }),
      tx({ type: "INCOME", amount: 200n }),
    ];
    expect(cycleTotals(transactions, "2026-09-25")).toMatchObject({ income: 200n, expense: 0n, net: 200n });
    expect(balancesForAccounts([{ id: "a", openingBalance: 500n }], transactions).get("a")).toBe(500n);
  });
});
