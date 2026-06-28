import { crossConvert } from "@/lib/currency";

export type SeriesPoint = { date: string; total: number };

type EntryLike = {
  type: string;
  amount: number;
  currency: string; // source pocket currency
  occurred_at: string;
};

// Cumulative savings total over time, in `target` currency. Deposits add,
// withdrawals subtract, transfers are neutral (cross-rates compose, so moving
// money between pockets does not change the converted total). Historical
// amounts are valued at current rates (MVP — no rate history).
export function buildTotalSeries(
  entries: EntryLike[],
  ratesFromPivot: Record<string, number>,
  target: string
): SeriesPoint[] {
  const sorted = [...entries].sort((a, b) =>
    a.occurred_at.localeCompare(b.occurred_at)
  );
  let running = 0;
  const out: SeriesPoint[] = [];
  for (const e of sorted) {
    const amt = crossConvert(e.amount, e.currency, target, ratesFromPivot);
    if (e.type === "deposit") running += amt;
    else if (e.type === "withdraw") running -= amt;
    out.push({ date: e.occurred_at, total: running });
  }
  return out;
}

// Net savings added (deposits − withdrawals; transfers neutral) within
// [fromISO, toISO), in `target` currency. Used for the savings-pace strip.
export function netInWindow(
  entries: EntryLike[],
  ratesFromPivot: Record<string, number>,
  target: string,
  fromISO: string,
  toISO: string
): number {
  let net = 0;
  for (const e of entries) {
    if (e.occurred_at < fromISO || e.occurred_at >= toISO) continue;
    const amt = crossConvert(e.amount, e.currency, target, ratesFromPivot);
    if (e.type === "deposit") net += amt;
    else if (e.type === "withdraw") net -= amt;
  }
  return net;
}

// Estimated whole days to add `remaining` more (same currency) at a given daily
// pace. null when not progressing (pace <= 0) or already there.
export function etaDays(
  remaining: number,
  pacePerDay: number
): number | null {
  if (pacePerDay <= 0 || remaining <= 0) return null;
  return Math.ceil(remaining / pacePerDay);
}
