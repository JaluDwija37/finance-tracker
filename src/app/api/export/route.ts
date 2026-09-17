import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { getWorkspaceData } from "@/lib/workspace-data";

function csvCell(value: string | number | null) {
  const raw = String(value ?? "");
  const text = /^[\s\uFEFF]*[=+\-@]/.test(raw) ? `'${raw}` : raw;
  return `"${text.replaceAll('"', '""')}"`;
}

export async function GET(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return new Response("Unauthorized", { status: 401 });
  const data = await getWorkspaceData(session.user.id);
  const format = new URL(request.url).searchParams.get("format");
  if (format === "csv") {
    const names = new Map(data.accounts.map((item) => [item.id, item.name]));
    const categories = new Map(data.categories.map((item) => [item.id, item.name]));
    const columns = ["tanggal", "jenis", "status", "nominal_idr", "akun", "akun_tujuan", "kategori", "catatan", "sumber"];
    const rows = data.transactions.map((item) => [item.date, item.type, item.status, item.amount, names.get(item.accountId) ?? "", names.get(item.destinationAccountId ?? "") ?? "", categories.get(item.categoryId ?? "") ?? "", item.note ?? "", item.source]);
    const csv = `\uFEFF${[columns, ...rows].map((row) => row.map(csvCell).join(",")).join("\r\n")}`;
    return new Response(csv, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": 'attachment; filename="finance-tracker-transaksi.csv"', "Cache-Control": "no-store" } });
  }
  if (format !== "json") return new Response("Invalid format", { status: 400 });
  return new Response(JSON.stringify({ exportedAt: new Date().toISOString(), ...data }, null, 2), { headers: { "Content-Type": "application/json; charset=utf-8", "Content-Disposition": 'attachment; filename="finance-tracker-backup.json"', "Cache-Control": "no-store" } });
}
