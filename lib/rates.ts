import { createClient } from "@/lib/supabase/server";

export type RatesMap = Record<string, number>;

// pivot(EUR)->code rate map used by crossConvert (mirrors the SQL get_rate pivot).
export async function getRatesMap(): Promise<RatesMap> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("exchange_rates")
    .select("quote_code, rate")
    .eq("base_code", "EUR");
  const map: RatesMap = { EUR: 1 };
  for (const r of data ?? []) map[r.quote_code] = Number(r.rate);
  return map;
}
