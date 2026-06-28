import { describe, it, expect } from "vitest";
import { buildTotalSeries, netInWindow, etaDays } from "@/lib/insights";

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

describe("netInWindow", () => {
  const e = [
    { type: "deposit", amount: 1000000, currency: "IDR", occurred_at: "2026-01-05T00:00:00Z" },
    { type: "withdraw", amount: 200000, currency: "IDR", occurred_at: "2026-01-10T00:00:00Z" },
    { type: "deposit", amount: 500000, currency: "IDR", occurred_at: "2026-02-01T00:00:00Z" },
    { type: "transfer", amount: 999999, currency: "IDR", occurred_at: "2026-01-07T00:00:00Z" },
  ];

  it("nets deposits minus withdrawals inside the window, ignoring transfers", () => {
    const n = netInWindow(e, rates, "IDR", "2026-01-01T00:00:00Z", "2026-02-01T00:00:00Z");
    expect(n).toBe(800000);
  });

  it("excludes entries outside the half-open window", () => {
    const n = netInWindow(e, rates, "IDR", "2026-02-01T00:00:00Z", "2026-03-01T00:00:00Z");
    expect(n).toBe(500000);
  });
});

describe("etaDays", () => {
  it("rounds up days to cover the remaining gap", () => {
    expect(etaDays(1000000, 100000)).toBe(10);
    expect(etaDays(1000001, 100000)).toBe(11);
  });
  it("returns null when not progressing or already there", () => {
    expect(etaDays(1000000, 0)).toBeNull();
    expect(etaDays(1000000, -50)).toBeNull();
    expect(etaDays(0, 100000)).toBeNull();
  });
});
