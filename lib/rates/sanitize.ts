// Pure rate-snapshot helpers — no I/O, no "server-only", so they're unit-testable
// and shared by the provider. Cross-rate pivot = EUR (Frankfurter / ECB base).
export const PIVOT = "EUR";

export type RateRow = {
  base_code: string;
  quote_code: string;
  rate: number;
  fetched_at: string;
};

// Turn a fetched EUR->code map into upsert rows. Two safety filters:
//  1. keep only currencies the app knows (active or referenced) plus the pivot;
//  2. drop any non-finite or non-positive value, so a malformed-but-200 provider
//     response (e.g. { USD: 0 }) can't clobber a known-good rate — a 0 rate would
//     make convert_amount() return 0 and silently zero out users' totals.
export function buildRateRows(
  rates: Record<string, number>,
  knownCodes: string[],
  fetchedAt: string
): RateRow[] {
  const known = new Set([...knownCodes, PIVOT]);
  // The pivot's rate against itself is always 1 — guarantee that row even if the
  // provider omitted it, so get_rate(PIVOT) always has a backing snapshot.
  const merged: Record<string, number> = { ...rates, [PIVOT]: 1 };
  return Object.entries(merged)
    .filter(([code]) => known.has(code))
    .filter(([, rate]) => Number.isFinite(rate) && rate > 0)
    .map(([quote_code, rate]) => ({
      base_code: PIVOT,
      quote_code,
      rate,
      fetched_at: fetchedAt,
    }));
}
