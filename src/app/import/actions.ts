"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { commitMoneyManagerImport } from "@/lib/money-manager-import";

export type ImportResult = { error: string; success: string };

export async function importMoneyManager(_previous: ImportResult, data: FormData): Promise<ImportResult> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return { error: "Sesi berakhir. Masuk kembali.", success: "" };
  const file = data.get("workbook");
  if (!(file instanceof File) || !file.name.toLowerCase().endsWith(".xlsx")) return { error: "Pilih file .xlsx dari Money Manager.", success: "" };
  if (file.size === 0 || file.size > 10 * 1024 * 1024) return { error: "Ukuran file harus antara 1 byte dan 10 MB.", success: "" };
  try {
    const result = await commitMoneyManagerImport(session.user.id, file.name.slice(0, 200), Buffer.from(await file.arrayBuffer()));
    revalidatePath("/");
    revalidatePath("/accounts");
    revalidatePath("/transactions");
    revalidatePath("/budgets");
    revalidatePath("/import");
    return result.imported
      ? { error: "", success: `${result.rowCount} transaksi berhasil diimpor. Akun dan kategori sudah dipetakan.` }
      : { error: "", success: `File ini sudah diimpor (${result.rowCount} transaksi). Tidak ada data ganda.` };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Impor gagal. Periksa file lalu coba lagi.", success: "" };
  }
}
