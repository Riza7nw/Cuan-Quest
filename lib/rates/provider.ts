import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { PIVOT, buildRateRows } from "@/lib/rates/sanitize";

export { PIVOT };

// Frankfurter has two hosts with slightly different path prefixes. We try the
// primary, then fall back. Both return { amount, base, date, rates: { CODE: n } }.
const HOSTS = [
  "https://api.frankfurter.dev/v1",
  "https://api.frankfurter.app",
];

export type RateSnapshot = { rates: Record<string, number>; date: string };

// Fetch EUR->code rates for the requested quote codes. EUR itself is always 1
// and never queried. Throws if every host fails — callers decide how to react
// (cron returns 502; the existing snapshot stays untouched).
export async function fetchRates(quoteCodes: string[]): Promise<RateSnapshot> {
  const symbols = [...new Set(quoteCodes)].filter((c) => c !== PIVOT);
  if (symbols.length === 0) return { rates: { [PIVOT]: 1 }, date: "" };

  const query = `?base=${PIVOT}&symbols=${symbols.join(",")}`;
  let lastErr: unknown;
  for (const host of HOSTS) {
    try {
      const res = await fetch(`${host}/latest${query}`, {
        cache: "no-store",
        signal: AbortSignal.timeout(10_000),
      });
      if (!res.ok) throw new Error(`${host} responded ${res.status}`);
      const json = (await res.json()) as {
        date?: string;
        rates?: Record<string, number>;
      };
      if (!json.rates || Object.keys(json.rates).length === 0) {
        throw new Error(`${host} returned no rates`);
      }
      return { rates: { [PIVOT]: 1, ...json.rates }, date: json.date ?? "" };
    } catch (err) {
      lastErr = err;
    }
  }
  throw new Error(
    `Rate fetch failed: ${lastErr instanceof Error ? lastErr.message : String(lastErr)}`
  );
}

// Fetch fresh rates for every active currency and upsert the EUR->code snapshot.
// Works with either the service-role client (cron) or an admin session client
// (manual refresh) — both satisfy the exchange_rates write policy.
export async function refreshExchangeRates(
  client: SupabaseClient<Database>
): Promise<{ updated: number; date: string }> {
  // Refresh EVERY known currency, not just active ones: is_active controls which
  // currencies appear in pickers, not which rates we maintain. A currency that's
  // deactivated but still referenced (a user's base/pocket currency) must keep a
  // fresh rate, or its conversions silently drift on a frozen value.
  const { data: currencies, error } = await client
    .from("currencies")
    .select("code");
  if (error) throw new Error(error.message);

  const codes = (currencies ?? []).map((c) => c.code);
  const { rates, date } = await fetchRates(codes);

  // buildRateRows filters to known currencies and drops any 0/NaN/negative value.
  const rows = buildRateRows(rates, codes, new Date().toISOString());

  const { error: upErr } = await client
    .from("exchange_rates")
    .upsert(rows, { onConflict: "base_code,quote_code" });
  if (upErr) throw new Error(upErr.message);

  return { updated: rows.length, date };
}
