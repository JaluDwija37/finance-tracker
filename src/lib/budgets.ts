import type { BudgetPeriod, Transaction } from "@/generated/prisma/client";
import { cycleForDate } from "./cycle";

export function periodWindow(today: string, period: BudgetPeriod, cycleStartDay = 25) {
  if (period === "DAY") return { start: today, end: today };
  if (period === "CYCLE") return cycleForDate(today, cycleStartDay);
  const [year, month] = today.split("-").map(Number);
  if (period === "YEAR") return { start: `${year}-01-01`, end: `${year}-12-31` };
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return { start: `${year}-${String(month).padStart(2, "0")}-01`, end: `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}` };
}

export function spentInWindow(
  transactions: Pick<Transaction, "type" | "status" | "deletedAt" | "categoryId" | "transactionDate" | "amount">[],
  categoryId: string,
  start: string,
  end: string,
): bigint {
  return transactions.reduce((sum, transaction) => {
    const date = transaction.transactionDate.toISOString().slice(0, 10);
    return transaction.type === "EXPENSE" && transaction.status === "POSTED" && !transaction.deletedAt && transaction.categoryId === categoryId && date >= start && date <= end
      ? sum + transaction.amount : sum;
  }, 0n);
}
