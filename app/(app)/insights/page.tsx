import { createClient, getUser } from "@/lib/supabase/server";
import { getRatesMap } from "@/lib/rates";
import { crossConvert, formatMoney, formatAsOf } from "@/lib/currency";
import { buildTotalSeries, netInWindow, etaDays } from "@/lib/insights";
import { progressToNext } from "@/lib/leveling";
import { TotalOverTime } from "@/components/charts/total-over-time";
import { Composition } from "@/components/charts/composition";

export default async function InsightsPage() {
  const user = await getUser();
  if (!user) return null;

  const supabase = await createClient();

  const [profileRes, levelsRes, categoriesRes, entriesRes, ratesResult] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("display_currency,base_currency,current_xp")
        .eq("id", user.id)
        .single(),
      supabase.from("levels").select("*").order("level"),
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
  const baseCurrency = profileRes.data?.base_currency ?? "IDR";
  const xp = Number(profileRes.data?.current_xp ?? 0);
  const levels = levelsRes.data ?? [];
  const categories = categoriesRes.data ?? [];
  const entries = entriesRes.data ?? [];
  const { rates, asOf, ok: ratesOk } = ratesResult;
  const ratesAsOf = formatAsOf(asOf);
  const catCurrency = new Map(categories.map((c) => [c.id, c.currency]));

  const entryRows = entries.map((e) => ({
    type: e.type,
    amount: Number(e.amount),
    currency: catCurrency.get(e.category_id) ?? display,
    occurred_at: e.occurred_at,
  }));

  const series = buildTotalSeries(entryRows, rates, display);

  // Savings pace: last 30 days vs the prior 30, in the display currency.
  const dayMs = 86400000;
  const nowMs = Date.now();
  const nowISO = new Date(nowMs).toISOString();
  const ago30 = new Date(nowMs - 30 * dayMs).toISOString();
  const ago60 = new Date(nowMs - 60 * dayMs).toISOString();
  const net30 = netInWindow(entryRows, rates, display, ago30, nowISO);
  const netPrev30 = netInWindow(entryRows, rates, display, ago60, ago30);
  const pacePctChange =
    netPrev30 !== 0
      ? Math.round(((net30 - netPrev30) / Math.abs(netPrev30)) * 100)
      : null;

  // Projection: ETA to the next level at the recent (base-currency) pace.
  const { next } = progressToNext(xp, levels);
  const totalBase = categories.reduce(
    (sum, c) =>
      sum + crossConvert(Number(c.current_balance), c.currency, baseCurrency, rates),
    0
  );
  const remainingBase = next ? Math.max(0, next.xp_required - totalBase) : 0;
  const paceBasePerDay = netInWindow(entryRows, rates, baseCurrency, ago30, nowISO) / 30;
  const eta = next ? etaDays(remainingBase, paceBasePerDay) : null;
  const etaDate =
    eta != null
      ? new Date(nowMs + eta * dayMs).toLocaleDateString("id-ID", {
          dateStyle: "medium",
          timeZone: "Asia/Jakarta",
        })
      : null;

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

      <section className="grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-muted/40 p-4">
          <p className="text-xs text-muted-foreground">Ditambah 30 hari</p>
          <p className="mt-1 text-xl font-bold tabular-nums">
            {formatMoney(net30, display)}
          </p>
          {pacePctChange !== null && (
            <p
              className={`mt-0.5 text-xs ${
                pacePctChange >= 0 ? "text-green-600" : "text-muted-foreground"
              }`}
            >
              {pacePctChange >= 0 ? "▲" : "▼"} {Math.abs(pacePctChange)}% vs 30
              hari sebelumnya
            </p>
          )}
        </div>
        <div className="rounded-xl bg-muted/40 p-4">
          <p className="text-xs text-muted-foreground">Estimasi level berikutnya</p>
          {next ? (
            etaDate ? (
              <>
                <p className="mt-1 text-xl font-bold">≈ {etaDate}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Lv {next.level} {next.title} · dengan pace sekarang
                </p>
              </>
            ) : (
              <p className="mt-1 text-sm text-muted-foreground">
                Tambah setoran rutin untuk lihat estimasi capai Lv {next.level}{" "}
                {next.title}.
              </p>
            )
          ) : (
            <p className="mt-1 text-sm text-muted-foreground">
              Kamu sudah di level maksimal 🎉
            </p>
          )}
        </div>
      </section>

      <section className="space-y-2">
        <h3 className="text-sm font-semibold">Total tabungan ({display})</h3>
        <TotalOverTime data={series} currency={display} />
        <p className="text-xs text-muted-foreground">
          Nilai historis dihitung memakai kurs terkini
          {ratesOk
            ? ratesAsOf
              ? ` (kurs per ${ratesAsOf} WIB).`
              : "."
            : ". Kurs sedang tidak tersedia — angka konversi mungkin tidak akurat."}
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
