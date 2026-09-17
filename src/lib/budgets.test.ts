import { describe, expect, it } from "vitest";
import { periodWindow, spentInWindow } from "./budgets";

describe("budget periods", () => {
  it("uses calendar boundaries including leap February", () => {
    expect(periodWindow("2028-02-12", "MONTH")).toEqual({ start: "2028-02-01", end: "2028-02-29" });
    expect(periodWindow("2028-02-12", "YEAR")).toEqual({ start: "2028-01-01", end: "2028-12-31" });
    expect(periodWindow("2028-02-12", "CYCLE", 25)).toEqual({ start: "2028-01-25", end: "2028-02-24" });
  });

  it("only spends posted expenses in the selected category and window", () => {
    const base = { status: "POSTED" as const, deletedAt: null, categoryId: "food", transactionDate: new Date("2026-09-14T00:00:00Z"), amount: 43000n };
    const transactions = [
      { ...base, type: "EXPENSE" as const },
      { ...base, type: "TRANSFER" as const, amount: 100000n },
      { ...base, type: "ADJUSTMENT" as const, amount: 2000n },
      { ...base, type: "EXPENSE" as const, categoryId: "coffee", amount: 3900n },
      { ...base, type: "EXPENSE" as const, status: "VOID" as const, amount: 9000n },
    ];
    expect(spentInWindow(transactions, "food", "2026-09-14", "2026-09-14")).toBe(43000n);
  });
});
