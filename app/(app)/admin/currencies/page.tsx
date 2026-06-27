import { createClient } from "@/lib/supabase/server";
import { CurrencyAdmin } from "@/components/admin/currency-admin";

export default async function AdminCurrenciesPage() {
  const supabase = await createClient();
  const [currenciesRes, ratesRes] = await Promise.all([
    supabase
      .from("currencies")
      .select("code,name,symbol,is_active")
      .order("code"),
    supabase
      .from("exchange_rates")
      .select("quote_code,rate,fetched_at")
      .eq("base_code", "EUR"),
  ]);

  const rates: Record<string, { rate: number; fetched_at: string }> = {};
  for (const r of ratesRes.data ?? []) {
    rates[r.quote_code] = { rate: Number(r.rate), fetched_at: r.fetched_at };
  }

  return (
    <CurrencyAdmin currencies={currenciesRes.data ?? []} rates={rates} />
  );
}
