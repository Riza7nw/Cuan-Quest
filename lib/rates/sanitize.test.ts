import { describe, it, expect } from "vitest";
import { buildRateRows, PIVOT } from "./sanitize";

const AT = "2026-06-28T00:00:00.000Z";

describe("buildRateRows", () => {
  it("keeps known currencies plus the pivot, with the right shape", () => {
    const rows = buildRateRows(
      { EUR: 1, USD: 1.14, IDR: 20361.16 },
      ["USD", "IDR"],
      AT
    );
    expect(rows).toContainEqual({
      base_code: PIVOT,
      quote_code: "USD",
      rate: 1.14,
      fetched_at: AT,
    });
    expect(rows).toContainEqual({
      base_code: PIVOT,
      quote_code: "IDR",
      rate: 20361.16,
      fetched_at: AT,
    });
    expect(rows.every((r) => r.base_code === PIVOT && r.fetched_at === AT)).toBe(true);
  });

  it("drops currencies the app does not know about", () => {
    const rows = buildRateRows({ USD: 1.14, XYZ: 5 }, ["USD"], AT);
    expect(rows.map((r) => r.quote_code).sort()).toEqual([PIVOT, "USD"]);
  });

  it("rejects 0, negative, NaN, and Infinity so a bad rate cannot clobber a good one", () => {
    const rows = buildRateRows(
      { USD: 0, IDR: -1, SGD: NaN, MYR: Infinity, JPY: 184.3 },
      ["USD", "IDR", "SGD", "MYR", "JPY"],
      AT
    );
    // Only the pivot (1) and the valid JPY rate survive.
    expect(rows.map((r) => r.quote_code).sort()).toEqual(["EUR", "JPY"]);
  });

  it("always includes the pivot even when not in the known list", () => {
    const rows = buildRateRows({ EUR: 1, USD: 1.14 }, ["USD"], AT);
    expect(rows.some((r) => r.quote_code === PIVOT && r.rate === 1)).toBe(true);
  });
});
