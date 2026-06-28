import { createClient } from "@/lib/supabase/server";

export type RatesMap = Record<string, number>;

export type RatesResult = {
  rates: RatesMap;
  // Newest snapshot timestamp, for a "kurs per ..." label. null if no rows.
  asOf: string | null;
  // false when the query errored or returned no rows. Callers should warn
  // rather than silently render cross-currency totals as 0 (crossConvert
  // returns 0 for any pair it lacks a rate for).
  ok: boolean;
};

// pivot(EUR)->code rate map used by crossConvert (mirrors the SQL get_rate pivot).
export async function getRatesMap(): Promise<RatesResult> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("exchange_rates")
    .select("quote_code, rate, fetched_at")
    .eq("base_code", "EUR");
  const rates: RatesMap = { EUR: 1 };
  let asOf: string | null = null;
  for (const r of data ?? []) {
    rates[r.quote_code] = Number(r.rate);
    if (!asOf || r.fetched_at > asOf) asOf = r.fetched_at;
  }
  return { rates, asOf, ok: !error && (data?.length ?? 0) > 0 };
}
