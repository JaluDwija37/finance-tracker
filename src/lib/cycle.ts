export function cycleForDate(date: string, day = 25): { start: string; end: string } {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || day < 1 || day > 28) throw new Error("Tanggal atau hari siklus tidak valid");
  const current = new Date(`${date}T00:00:00Z`);
  if (Number.isNaN(current.getTime()) || current.toISOString().slice(0, 10) !== date) throw new Error("Tanggal tidak valid");
  const year = current.getUTCFullYear();
  const month = current.getUTCMonth();
  const start = new Date(Date.UTC(year, month + (current.getUTCDate() < day ? -1 : 0), day));
  const end = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, day - 1));
  return { start: start.toISOString().slice(0, 10), end: end.toISOString().slice(0, 10) };
}
