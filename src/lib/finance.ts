import type { FinancialAccount, Transaction } from "@/generated/prisma/client";
import { cycleForDate } from "./cycle";

export type PostedTransaction = Pick<Transaction,
  "type" | "amount" | "accountId" | "destinationAccountId" | "adjustmentDirection" | "transactionDate"
>;

export function balancesForAccounts(
  accounts: Pick<FinancialAccount, "id" | "openingBalance">[],
  transactions: PostedTransaction[],
): Map<string, bigint> {
  const balances = new Map(accounts.map((account) => [account.id, account.openingBalance]));
  for (const transaction of transactions) {
    const source = balances.get(transaction.accountId);
    if (source === undefined) continue;
    if (transaction.type === "INCOME") balances.set(transaction.accountId, source + transaction.amount);
    if (transaction.type === "EXPENSE") balances.set(transaction.accountId, source - transaction.amount);
    if (transaction.type === "ADJUSTMENT") {
      const change = transaction.adjustmentDirection === "INCREASE" ? transaction.amount : -transaction.amount;
      balances.set(transaction.accountId, source + change);
    }
    if (transaction.type === "TRANSFER" && transaction.destinationAccountId) {
      balances.set(transaction.accountId, source - transaction.amount);
      const destination = balances.get(transaction.destinationAccountId);
      if (destination !== undefined) balances.set(transaction.destinationAccountId, destination + transaction.amount);
    }
  }
  return balances;
}

export function cycleTotals(transactions: PostedTransaction[], today: string, day = 25) {
  const cycle = cycleForDate(today, day);
  let income = 0n;
  let expense = 0n;
  for (const transaction of transactions) {
    const date = transaction.transactionDate.toISOString().slice(0, 10);
    if (date < cycle.start || date > cycle.end) continue;
    if (transaction.type === "INCOME") income += transaction.amount;
    if (transaction.type === "EXPENSE") expense += transaction.amount;
  }
  return { ...cycle, income, expense, net: income - expense };
}

export function jakartaToday(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta", year: "numeric", month: "2-digit", day: "2-digit",
  }).format(new Date());
}

export function displayDate(date: Date): string {
  return new Intl.DateTimeFormat("id-ID", {
    timeZone: "UTC", day: "numeric", month: "short", year: "numeric",
  }).format(date);
}
