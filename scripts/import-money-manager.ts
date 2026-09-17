import { readFile } from "node:fs/promises";
import { basename } from "node:path";
import { prisma } from "../src/lib/prisma";
import { commitMoneyManagerImport, parseMoneyManagerWorkbook } from "../src/lib/money-manager-import";

async function main() {
  const filename = process.argv[2];
  if (!filename) throw new Error("Penggunaan: pnpm tsx scripts/import-money-manager.ts /path/file.xlsx");
  const email = process.env.OWNER_EMAIL;
  if (!email) throw new Error("OWNER_EMAIL belum disetel.");
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) throw new Error("Akun pemilik belum ada.");
  const buffer = await readFile(filename);
  const preview = await parseMoneyManagerWorkbook(buffer);
  const counts = preview.reduce<Record<string, number>>((result, entry) => {
    result[entry.type] = (result[entry.type] ?? 0) + 1;
    return result;
  }, {});
  const result = await commitMoneyManagerImport(user.id, basename(filename), buffer);
  console.log(JSON.stringify({ imported: result.imported, rows: result.rowCount, types: counts }));
}

main().finally(() => prisma.$disconnect()).catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
