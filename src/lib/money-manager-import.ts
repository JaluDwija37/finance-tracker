import { createHash } from "node:crypto";
import { Readable } from "node:stream";
import ExcelJS from "exceljs";
import { prisma } from "./prisma";

export type ImportedEntry = {
  rowNumber: number;
  date: string;
  account: string;
  destination: string | null;
  sourceCategory: string;
  category: string | null;
  type: "INCOME" | "EXPENSE" | "TRANSFER" | "ADJUSTMENT";
  direction: "INCREASE" | "DECREASE" | null;
  amount: bigint;
  note: string | null;
};

function cellText(cell: ExcelJS.Cell): string {
  const value = cell.value;
  if (value === null || value === undefined) return "";
  if (typeof value === "object" && !(value instanceof Date)) return cell.text.trim();
  return String(value).trim();
}

function excelDate(value: ExcelJS.CellValue): string | null {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value.toISOString().slice(0, 10);
  if (typeof value === "number" && Number.isFinite(value) && value >= 1) {
    return new Date(Date.UTC(1899, 11, 30) + Math.floor(value) * 86_400_000).toISOString().slice(0, 10);
  }
  return null;
}

function wholeRupiah(value: ExcelJS.CellValue): bigint | null {
  if (typeof value === "number" && Number.isSafeInteger(value) && value > 0) return BigInt(value);
  if (typeof value === "string" && /^(?:\d+(?:\.\d+)?)(?:[eE]\+?\d+)?$/.test(value)) {
    const numeric = Number(value);
    if (Number.isSafeInteger(numeric) && numeric > 0) return BigInt(numeric);
  }
  return null;
}

const categoryNames: Record<string, string> = {
  "EXPENSE:🍜 Food": "Makan",
  "EXPENSE:☕️ Coffee": "Ngopi",
  "EXPENSE:⛽️ Fuel": "Bensin",
  "INCOME:💰 Salary": "Gaji",
  "EXPENSE:Other": "Lainnya",
  "INCOME:Other": "Lainnya",
};

export async function parseMoneyManagerWorkbook(buffer: Buffer): Promise<ImportedEntry[]> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.read(Readable.from([buffer]));
  const sheet = workbook.getWorksheet("Money Manager") ?? workbook.worksheets[0];
  if (!sheet) throw new Error("Workbook tidak memiliki sheet transaksi.");
  const expected = ["Date", "Account", "Category", "Subcategory", "Note", "IDR", "Income/Expense", "Description", "Amount", "Currency", "Account"];
  if (expected.some((heading, index) => cellText(sheet.getRow(1).getCell(index + 1)) !== heading)) {
    throw new Error("Kolom workbook tidak sesuai dengan ekspor Money Manager.");
  }
  const entries: ImportedEntry[] = [];
  const errors: string[] = [];
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    if (!row.hasValues) return;
    const date = excelDate(row.getCell(1).value);
    const account = cellText(row.getCell(2));
    const category = cellText(row.getCell(3));
    const subcategory = cellText(row.getCell(4));
    const note = [cellText(row.getCell(5)), cellText(row.getCell(8))].filter(Boolean).join(" · ") || null;
    const amount = wholeRupiah(row.getCell(6).value);
    const secondaryAmount = wholeRupiah(row.getCell(9).value);
    const sourceType = cellText(row.getCell(7));
    const currency = cellText(row.getCell(10));
    if (!date || !account || !category || !amount || amount !== secondaryAmount || currency !== "IDR") {
      errors.push(`Baris ${rowNumber}: tanggal, akun, kategori, nominal, atau mata uang tidak valid.`);
      return;
    }
    if (sourceType !== "Income" && sourceType !== "Expense" && sourceType !== "Transfer-Out") {
      errors.push(`Baris ${rowNumber}: jenis ${sourceType} belum didukung.`);
      return;
    }
    const type = sourceType === "Transfer-Out" ? "TRANSFER" : category === "Modified Bal." ? "ADJUSTMENT" : sourceType === "Income" ? "INCOME" : "EXPENSE";
    const destination = type === "TRANSFER" ? category : null;
    if (destination === account) {
      errors.push(`Baris ${rowNumber}: akun asal dan tujuan transfer sama.`);
      return;
    }
    const sourceCategory = [category, subcategory].filter(Boolean).join(" / ");
    entries.push({
      rowNumber, date, account, destination, sourceCategory,
      category: type === "INCOME" || type === "EXPENSE" ? categoryNames[`${type}:${sourceCategory}`] ?? sourceCategory : null,
      type, direction: type === "ADJUSTMENT" ? sourceType === "Income" ? "INCREASE" : "DECREASE" : null,
      amount, note: type === "ADJUSTMENT" ? ["Koreksi saldo", note].filter(Boolean).join(" · ") : note,
    });
  });
  if (errors.length) throw new Error(`${errors.length} baris bermasalah. ${errors.slice(0, 3).join(" ")}`);
  if (!entries.length) throw new Error("Workbook tidak berisi transaksi.");
  return entries;
}

export async function commitMoneyManagerImport(userId: string, filename: string, buffer: Buffer) {
  const fingerprint = createHash("sha256").update(buffer).digest("hex");
  const existing = await prisma.importBatch.findUnique({ where: { userId_fingerprint: { userId, fingerprint } } });
  if (existing) return { imported: false, rowCount: existing.rowCount, batchId: existing.id };
  const entries = await parseMoneyManagerWorkbook(buffer);
  const accountNames = [...new Set(entries.flatMap((entry) => [entry.account, entry.destination].filter((name): name is string => Boolean(name))))];
  const categoryKeys = [...new Set(entries.filter((entry) => entry.category).map((entry) => `${entry.type}:${entry.category}`))];
  const firstDate = entries.reduce((earliest, entry) => entry.date < earliest ? entry.date : earliest, entries[0].date);

  return prisma.$transaction(async (db) => {
    const duplicate = await db.importBatch.findUnique({ where: { userId_fingerprint: { userId, fingerprint } } });
    if (duplicate) return { imported: false, rowCount: duplicate.rowCount, batchId: duplicate.id };
    const accounts = await db.financialAccount.findMany({ where: { userId, name: { in: accountNames } } });
    const accountIds = new Map(accounts.map((account) => [account.name, account.id]));
    for (const name of accountNames) {
      if (accountIds.has(name)) continue;
      const account = await db.financialAccount.create({ data: {
        userId, name, type: name === "Cash" ? "CASH" : name === "Bibit" ? "INVESTMENT_CASH" : "BANK",
        openingBalance: 0n, openingDate: new Date(`${firstDate}T00:00:00Z`),
      } });
      accountIds.set(name, account.id);
    }
    const categories = await db.category.findMany({ where: { userId, parentId: null, isArchived: false } });
    const categoryIds = new Map(categories.map((category) => [`${category.kind}:${category.name}`, category.id]));
    for (const key of categoryKeys) {
      if (categoryIds.has(key)) continue;
      const separator = key.indexOf(":");
      const kind = key.slice(0, separator) as "INCOME" | "EXPENSE";
      const name = key.slice(separator + 1);
      const category = await db.category.create({ data: { userId, kind, name } });
      categoryIds.set(key, category.id);
    }
    const batch = await db.importBatch.create({ data: {
      userId, filename, fingerprint, status: "COMMITTED", rowCount: entries.length, validCount: entries.length,
    } });
    await db.importRow.createMany({ data: entries.map((entry) => ({
      userId, batchId: batch.id, rowNumber: entry.rowNumber,
      fingerprint: createHash("sha256").update(`${fingerprint}:${entry.rowNumber}`).digest("hex"),
      raw: { date: entry.date, account: entry.account, category: entry.sourceCategory, destination: entry.destination, amount: entry.amount.toString(), type: entry.type },
      mapped: { type: entry.type, account: entry.account, category: entry.category, destination: entry.destination },
    })) });
    await db.transaction.createMany({ data: entries.map((entry) => ({
      userId, type: entry.type, amount: entry.amount,
      transactionDate: new Date(`${entry.date}T00:00:00Z`),
      accountId: accountIds.get(entry.account)!, destinationAccountId: entry.destination ? accountIds.get(entry.destination)! : null,
      categoryId: entry.category ? categoryIds.get(`${entry.type}:${entry.category}`)! : null,
      adjustmentDirection: entry.direction, note: entry.note,
      source: "IMPORT" as const, status: "POSTED" as const, externalId: `${fingerprint}:${entry.rowNumber}`, importBatchId: batch.id,
    })) });
    await db.auditLog.create({ data: { userId, action: "IMPORT", entity: "ImportBatch", entityId: batch.id, changes: { filename, rows: entries.length } } });
    return { imported: true, rowCount: entries.length, batchId: batch.id };
  }, { timeout: 30000 });
}
