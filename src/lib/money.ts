export function parseRupiah(input: string): bigint {
  if (!/^(0|[1-9]\d*)$/.test(input)) throw new Error("Nominal harus berupa digit rupiah tanpa pemisah");
  return BigInt(input);
}

export function formatRupiah(value: bigint): string {
  const sign = value < 0n ? "-" : "";
  const digits = (value < 0n ? -value : value).toString();
  return `${sign}Rp${digits.replace(/\B(?=(\d{3})+(?!\d))/g, ".")}`;
}

export function serializeBigInt(value: bigint): string {
  return value.toString();
}
