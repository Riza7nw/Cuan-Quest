import { createClient, getUser } from "@/lib/supabase/server";
import { HistoryFilters } from "@/components/history-filters";
import { EntryActions } from "@/components/entry-actions";
import { formatMoney } from "@/lib/currency";
import type { EntryType } from "@/lib/types";
import { formatDistanceToNow } from "date-fns";
import { id as idLocale } from "date-fns/locale";

const LABEL: Record<string, string> = {
  deposit: "Setor",
  withdraw: "Tarik",
  transfer: "Pindah",
};
const SIGN: Record<string, string> = {
  deposit: "+",
  withdraw: "−",
  transfer: "→",
};

export default async function HistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; category?: string; q?: string }>;
}) {
  const sp = await searchParams;
  const user = await getUser();
  if (!user) return null;

  const supabase = await createClient();

  const { data: categories } = await supabase
    .from("categories")
    .select("id,name,currency")
    .eq("user_id", user.id)
    .order("created_at");
  const catById = new Map((categories ?? []).map((c) => [c.id, c]));

  let query = supabase
    .from("entries")
    .select("id,type,amount,category_id,to_category_id,note,occurred_at")
    .eq("user_id", user.id)
    .order("occurred_at", { ascending: false })
    .limit(200);
  if (sp.type && ["deposit", "withdraw", "transfer"].includes(sp.type)) {
    query = query.eq("type", sp.type);
  }
  if (sp.category) query = query.eq("category_id", sp.category);
  if (sp.q) query = query.ilike("note", `%${sp.q}%`);
  const { data: entries } = await query;

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Riwayat</h1>
      <HistoryFilters
        categories={(categories ?? []).map((c) => ({ id: c.id, name: c.name }))}
        type={sp.type ?? ""}
        category={sp.category ?? ""}
        q={sp.q ?? ""}
      />

      {!entries || entries.length === 0 ? (
        <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
          Belum ada entri yang cocok.
        </p>
      ) : (
        <ul className="divide-y rounded-xl border">
          {entries.map((e) => {
            const cat = catById.get(e.category_id);
            const toCat = e.to_category_id
              ? catById.get(e.to_category_id)
              : null;
            return (
              <li
                key={e.id}
                className="flex items-center justify-between gap-3 px-4 py-3 text-sm"
              >
                <div className="min-w-0">
                  <p className="truncate">
                    <span className="font-medium">
                      {LABEL[e.type] ?? e.type}
                    </span>{" "}
                    · {cat?.name ?? "—"}
                    {toCat ? ` → ${toCat.name}` : ""}
                  </p>
                  {e.note && (
                    <p className="truncate text-xs text-muted-foreground">
                      {e.note}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(e.occurred_at), {
                      addSuffix: true,
                      locale: idLocale,
                    })}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <span className="tabular-nums">
                    {SIGN[e.type] ?? ""}
                    {formatMoney(Number(e.amount), cat?.currency ?? "IDR")}
                  </span>
                  <EntryActions
                    id={e.id}
                    type={e.type as EntryType}
                    amount={Number(e.amount)}
                    note={e.note}
                    occurredAt={e.occurred_at}
                    currency={cat?.currency ?? "IDR"}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
