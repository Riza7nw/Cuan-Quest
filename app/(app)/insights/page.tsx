import { createClient, getUser } from "@/lib/supabase/server";
import { getRatesMap } from "@/lib/rates";
import { crossConvert, formatMoney } from "@/lib/currency";
import { buildTotalSeries } from "@/lib/insights";
import { TotalOverTime } from "@/components/charts/total-over-time";
import { Composition } from "@/components/charts/composition";

export default async function InsightsPage() {
  const user = await getUser();
  if (!user) return null;

  const supabase = await createClient();

  const [profileRes, categoriesRes, entriesRes, rates] = await Promise.all([
    supabase.from("profiles").select("display_currency").eq("id", user.id).single(),
    supabase
      .from("categories")
      .select("id,name,currency,current_balance")
      .eq("user_id", user.id),
    supabase
      .from("entries")
      .select("type,amount,category_id,occurred_at")
      .eq("user_id", user.id)
      .order("occurred_at"),
    getRatesMap(),
  ]);

  const display = profileRes.data?.display_currency ?? "IDR";
  const categories = categoriesRes.data ?? [];
  const entries = entriesRes.data ?? [];
  const catCurrency = new Map(categories.map((c) => [c.id, c.currency]));

  const series = buildTotalSeries(
    entries.map((e) => ({
      type: e.type,
      amount: Number(e.amount),
      currency: catCurrency.get(e.category_id) ?? display,
      occurred_at: e.occurred_at,
    })),
    rates,
    display
  );

  const composition = categories
    .map((c) => ({
      name: c.name,
      value: crossConvert(Number(c.current_balance), c.currency, display, rates),
    }))
    .filter((s) => s.value > 0)
    .sort((a, b) => b.value - a.value);

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">Insight</h1>

      <section className="space-y-2">
        <h3 className="text-sm font-semibold">Total tabungan ({display})</h3>
        <TotalOverTime data={series} currency={display} />
        <p className="text-xs text-muted-foreground">
          Nilai historis dihitung memakai kurs terkini.
        </p>
      </section>

      <section className="space-y-2">
        <h3 className="text-sm font-semibold">Komposisi per kantong</h3>
        {composition.length === 0 ? (
          <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
            Belum ada saldo.
          </p>
        ) : (
          <>
            <Composition data={composition} currency={display} />
            <ul className="divide-y rounded-xl border text-sm">
              {composition.map((s, i) => (
                <li key={i} className="flex justify-between px-4 py-2">
                  <span>{s.name}</span>
                  <span className="tabular-nums">
                    {formatMoney(s.value, display)}
                  </span>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>
    </div>
  );
}
