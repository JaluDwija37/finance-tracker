import { prisma } from "./prisma";

export async function getFinanceData(userId: string) {
  const [accounts, categories, transactions, settings] = await Promise.all([
    prisma.financialAccount.findMany({ where: { userId, isArchived: false }, orderBy: { createdAt: "asc" } }),
    prisma.category.findMany({ where: { userId, isArchived: false }, orderBy: [{ kind: "asc" }, { sortOrder: "asc" }, { name: "asc" }] }),
    prisma.transaction.findMany({
      where: { userId, status: "POSTED", deletedAt: null },
      include: { account: true, destinationAccount: true, category: true },
      orderBy: [{ transactionDate: "desc" }, { createdAt: "desc" }],
    }),
    prisma.userSettings.findUnique({ where: { userId } }),
  ]);
  return { accounts, categories, transactions, settings };
}
