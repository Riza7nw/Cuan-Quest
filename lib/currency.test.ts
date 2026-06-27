import { describe, it, expect } from "vitest";
import { crossConvert, formatMoney } from "@/lib/currency";

const rates = { EUR: 1, USD: 1.08, IDR: 17500 }; // pivot = EUR

describe("crossConvert", () => {
  it("returns amount unchanged for same currency", () =>
    expect(crossConvert(100, "USD", "USD", rates)).toBe(100));
  it("converts USD -> IDR via the EUR pivot", () => {
    // 100 USD -> EUR (100/1.08) -> IDR (*17500)
    expect(Math.round(crossConvert(100, "USD", "IDR", rates))).toBe(1620370);
  });
  it("converts IDR -> USD via the EUR pivot", () => {
    expect(Number(crossConvert(1620370, "IDR", "USD", rates).toFixed(0))).toBe(100);
  });
  it("returns 0 when a needed rate is missing", () =>
    expect(crossConvert(100, "USD", "XYZ", rates)).toBe(0));
});

describe("formatMoney", () => {
  it("formats IDR without decimals", () => {
    expect(formatMoney(1500000, "IDR")).toMatch(/1[.,]500[.,]000/);
  });
  it("includes a currency marker", () => {
    expect(formatMoney(10, "USD")).toMatch(/\$|USD/);
  });
});
