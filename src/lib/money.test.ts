import { describe, expect, it } from "vitest";
import { formatRupiah, parseRupiah, serializeBigInt } from "./money";
import { cycleForDate } from "./cycle";

describe("rupiah", () => {
  it("keeps amounts beyond Number.MAX_SAFE_INTEGER", () => {
    const amount = parseRupiah("9007199254740993123");
    expect(serializeBigInt(amount)).toBe("9007199254740993123");
    expect(formatRupiah(amount)).toBe("Rp9.007.199.254.740.993.123");
  });
  it("rejects ambiguous input", () => {
    expect(() => parseRupiah("1.000")).toThrow();
    expect(() => parseRupiah("-1")).toThrow();
  });
});

describe("salary cycle", () => {
  it("puts the 24th and 25th in different cycles", () => {
    expect(cycleForDate("2026-09-24")).toEqual({ start: "2026-08-25", end: "2026-09-24" });
    expect(cycleForDate("2026-09-25")).toEqual({ start: "2026-09-25", end: "2026-10-24" });
  });
});
