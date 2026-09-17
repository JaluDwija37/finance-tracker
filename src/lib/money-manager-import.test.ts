import { describe, expect, it, vi } from "vitest";
import ExcelJS from "exceljs";
import { parseMoneyManagerWorkbook } from "./money-manager-import";

vi.mock("./prisma", () => ({ prisma: {} }));

async function workbookWithRows(rows: (string | number | Date)[][]) {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Money Manager");
  sheet.addRow(["Date", "Account", "Category", "Subcategory", "Note", "IDR", "Income/Expense", "Description", "Amount", "Currency", "Account"]);
  for (const row of rows) sheet.addRow(row);
  return Buffer.from(await workbook.xlsx.writeBuffer());
}

describe("Money Manager import", () => {
  it("accepts exported decimal text and separates transfers and balance corrections", async () => {
    const buffer = await workbookWithRows([
      [new Date("2026-09-14T00:00:00Z"), "BCA", "🍜 Food", "", "Lunch", 43000, "Expense", "", "43000.0", "IDR", "43000.0"],
      [new Date("2026-09-14T00:00:00Z"), "BCA", "Cash", "", "", 100000, "Transfer-Out", "", "1E5", "IDR", "1E5"],
      [new Date("2026-09-14T00:00:00Z"), "Cash", "Modified Bal.", "", "Difference", 2000, "Income", "", "2000.0", "IDR", "2000.0"],
    ]);
    const rows = await parseMoneyManagerWorkbook(buffer);
    expect(rows).toHaveLength(3);
    expect(rows[0]).toMatchObject({ type: "EXPENSE", amount: 43000n, sourceCategory: "🍜 Food", category: "Makan" });
    expect(rows[1]).toMatchObject({ type: "TRANSFER", amount: 100000n, destination: "Cash", category: null });
    expect(rows[2]).toMatchObject({ type: "ADJUSTMENT", direction: "INCREASE", category: null });
  });

  it("rejects a file with mismatched amounts before inserting any row", async () => {
    const buffer = await workbookWithRows([
      [new Date("2026-09-14T00:00:00Z"), "BCA", "🍜 Food", "", "", 43000, "Expense", "", "42000.0", "IDR", "42000.0"],
    ]);
    await expect(parseMoneyManagerWorkbook(buffer)).rejects.toThrow("Baris 2");
  });
});
