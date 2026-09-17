"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parseRupiah } from "@/lib/money";

export type BudgetResult = { error: string; success: string };
const schema = z.object({
  categoryId: z.string().min(1),
  period: z.enum(["DAY", "MONTH", "CYCLE", "YEAR"]),
  amount: z.string().regex(/^[1-9]\d*$/),
});

export async function saveBudgetLimit(_previous: BudgetResult, form: FormData): Promise<BudgetResult> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return { error: "Sesi berakhir. Masuk kembali.", success: "" };
  const parsed = schema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: "Pilih kategori, periode, dan nominal lebih dari nol.", success: "" };
  const { categoryId, period, amount } = parsed.data;
  const category = await prisma.category.findFirst({ where: { id: categoryId, userId: session.user.id, kind: "EXPENSE", isArchived: false } });
  if (!category) return { error: "Kategori pengeluaran tidak ditemukan.", success: "" };
  try {
    const saved = await prisma.$transaction(async (db) => {
      const limit = await db.budgetLimit.upsert({
        where: { userId_categoryId_period: { userId: session.user.id, categoryId, period } },
        create: { userId: session.user.id, categoryId, period, amount: parseRupiah(amount) },
        update: { amount: parseRupiah(amount) },
      });
      await db.auditLog.create({ data: { userId: session.user.id, action: "UPSERT", entity: "BudgetLimit", entityId: limit.id, changes: { category: category.name, period, amount } } });
      return limit;
    });
    revalidatePath("/");
    revalidatePath("/budgets");
    return { error: "", success: `${category.name}: batas ${saved.period === "DAY" ? "harian" : saved.period === "MONTH" ? "bulanan" : saved.period === "CYCLE" ? "siklus" : "tahunan"} tersimpan.` };
  } catch {
    return { error: "Budget gagal disimpan. Coba lagi.", success: "" };
  }
}
