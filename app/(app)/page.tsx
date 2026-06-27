import { createClient } from "@/lib/supabase/server";
import { getRatesMap } from "@/lib/rates";
import { crossConvert } from "@/lib/currency";
import { LevelCard } from "@/components/level-card";
import { CategoryBalances } from "@/components/category-balances";
import { RecentEntries } from "@/components/recent-entries";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const [profileRes, levelsRes, categoriesRes, entriesRes, rates] =
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
      getRatesMap(),
    ]);

  const profile = profileRes.data;
  const levels = levelsRes.data ?? [];
  const categories = categoriesRes.data ?? [];
  const entries = entriesRes.data ?? [];
  if (!profile) return null;

  const display = profile.display_currency;
  const total = categories.reduce(
    (sum, c) =>
      sum + crossConvert(Number(c.current_balance), c.currency, display, rates),
    0
  );
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
      />
      <CategoryBalances categories={categories} />
      <RecentEntries rows={recent} />
    </div>
  );
}
