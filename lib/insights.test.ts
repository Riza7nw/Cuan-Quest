import { describe, it, expect } from "vitest";
import { buildTotalSeries } from "@/lib/insights";

const rates = { EUR: 1, USD: 1.08, IDR: 17500 }; // pivot EUR

describe("buildTotalSeries", () => {
  it("accumulates deposits in the target currency", () => {
    const s = buildTotalSeries(
      [
        { type: "deposit", amount: 1000000, currency: "IDR", occurred_at: "2026-01-01T00:00:00Z" },
        { type: "deposit", amount: 500000, currency: "IDR", occurred_at: "2026-01-02T00:00:00Z" },
      ],
      rates,
      "IDR"
    );
    expect(s.at(-1)?.total).toBe(1500000);
  });

  it("withdraw lowers the running total", () => {
    const s = buildTotalSeries(
      [
        { type: "deposit", amount: 1000000, currency: "IDR", occurred_at: "2026-01-01T00:00:00Z" },
        { type: "withdraw", amount: 400000, currency: "IDR", occurred_at: "2026-01-02T00:00:00Z" },
      ],
      rates,
      "IDR"
    );
    expect(s.at(-1)?.total).toBe(600000);
  });

  it("transfer is neutral in the target currency", () => {
    const s = buildTotalSeries(
      [
        { type: "deposit", amount: 100, currency: "USD", occurred_at: "2026-01-01T00:00:00Z" },
        { type: "transfer", amount: 50, currency: "USD", occurred_at: "2026-01-02T00:00:00Z" },
      ],
      rates,
      "IDR"
    );
    const expected = Math.round((100 * 17500) / 1.08);
    expect(Math.round(s.at(-1)!.total)).toBe(expected);
  });

  it("orders chronologically before accumulating", () => {
    const s = buildTotalSeries(
      [
        { type: "withdraw", amount: 200000, currency: "IDR", occurred_at: "2026-01-02T00:00:00Z" },
        { type: "deposit", amount: 1000000, currency: "IDR", occurred_at: "2026-01-01T00:00:00Z" },
      ],
      rates,
      "IDR"
    );
    expect(s[0].total).toBe(1000000);
    expect(s[1].total).toBe(800000);
  });
});
