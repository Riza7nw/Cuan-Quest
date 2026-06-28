import { createClient, getUser } from "@/lib/supabase/server";
import { getRatesMap } from "@/lib/rates";
import { crossConvert, formatAsOf } from "@/lib/currency";
import { LevelCard } from "@/components/level-card";
import { CategoryBalances } from "@/components/category-balances";
import { RecentEntries } from "@/components/recent-entries";
import { Achievements } from "@/components/achievements";

export default async function DashboardPage() {
  const user = await getUser();
  if (!user) return null;

  const supabase = await createClient();

  const [profileRes, levelsRes, categoriesRes, entriesRes, eventsRes, ratesResult] =
    await Promise.all([
      supabase.from("profiles").select("*").eq("id", user.id).single(),
      supabase.from("levels").select("*").order("level"),
      supabase
        .from("categories")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at"),
      supabase
        .from("entries")
        .select("id,type,amount,category_id,occurred_at,note")
        .eq("user_id", user.id)
        .order("occurred_at", { ascending: false })
        .limit(8),
      supabase
        .from("level_up_events")
        .select("new_level,created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(12),
      getRatesMap(),
    ]);

  const profile = profileRes.data;
  const levels = levelsRes.data ?? [];
  const categories = categoriesRes.data ?? [];
  const entries = entriesRes.data ?? [];
  const events = eventsRes.data ?? [];
  const { rates, asOf, ok: ratesOk } = ratesResult;
  if (!profile) return null;

  const display = profile.display_currency;
  const total = categories.reduce(
    (sum, c) =>
      sum + crossConvert(Number(c.current_balance), c.currency, display, rates),
    0
  );
  // The total only depends on rates when a pocket's currency differs from the
  // display currency. Only then is a stale/unavailable rate worth flagging.
  const needsConversion = categories.some((c) => c.currency !== display);
  const ratesAsOf = formatAsOf(asOf);
  const title =
    levels.find((l) => l.level === profile.current_level)?.title ?? "Pemula";

  const catById = new Map(categories.map((c) => [c.id, c]));
  const recent = entries.map((e) => {
    const cat = catById.get(e.category_id);
    return {
      id: e.id,
      type: e.type,
      amount: Number(e.amount),
      currency: cat?.currency ?? display,
      categoryName: cat?.name ?? "—",
      occurred_at: e.occurred_at,
      note: e.note,
    };
  });

  return (
    <div className="space-y-6">
      <LevelCard
        level={profile.current_level}
        title={title}
        totalDisplay={total}
        displayCurrency={display}
        xp={Number(profile.current_xp)}
        baseCurrency={profile.base_currency}
        levels={levels}
        rates={rates}
      />
      {needsConversion &&
        (ratesOk ? (
          ratesAsOf && (
            <p className="text-center text-xs text-muted-foreground">
              Kurs per {ratesAsOf} WIB
            </p>
          )
        ) : (
          <p className="rounded-lg border border-dashed px-3 py-2 text-center text-xs text-muted-foreground">
            Kurs tidak tersedia — total lintas mata uang mungkin tidak akurat.
          </p>
        ))}
      <CategoryBalances categories={categories} />
      <RecentEntries rows={recent} />
      <Achievements events={events} levels={levels} />
    </div>
  );
}
