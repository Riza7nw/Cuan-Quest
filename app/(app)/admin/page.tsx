import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Stats = {
  users: number;
  admins: number;
  pockets: number;
  entries: number;
  level_ups: number;
  currencies_active: number;
  currencies_total: number;
  rates_last_fetched: string | null;
  level_distribution: Record<string, number>;
};

export default async function AdminStatsPage() {
  const supabase = await createClient();
  // admin_stats() self-gates with is_admin(); it errors for non-admins, but the
  // admin layout already redirected them, so a present session here is an admin.
  const { data, error } = await supabase.rpc("admin_stats");
  const stats = (data as Stats | null) ?? null;

  if (error || !stats) {
    return (
      <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
        Gagal memuat statistik{error ? `: ${error.message}` : ""}.
      </p>
    );
  }

  const cards = [
    { label: "Pengguna", value: stats.users },
    { label: "Admin", value: stats.admins },
    { label: "Kantong", value: stats.pockets },
    { label: "Entri", value: stats.entries },
    { label: "Naik level", value: stats.level_ups },
    {
      label: "Mata uang aktif",
      value: `${stats.currencies_active}/${stats.currencies_total}`,
    },
  ];

  const lastFetched = stats.rates_last_fetched
    ? `${new Date(stats.rates_last_fetched).toLocaleString("id-ID", {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: "Asia/Jakarta", // label the wall-clock explicitly (server runs UTC)
      })} WIB`
    : "—";

  const distribution = Object.entries(stats.level_distribution)
    .map(([level, count]) => ({ level: Number(level), count: Number(count) }))
    .sort((a, b) => a.level - b.level);
  const maxCount = Math.max(1, ...distribution.map((d) => d.count));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {cards.map((c) => (
          <Card key={c.label}>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">{c.label}</p>
              <p className="text-2xl font-bold tabular-nums">{c.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Sebaran level</CardTitle>
        </CardHeader>
        <CardContent>
          {distribution.length === 0 ? (
            <p className="text-sm text-muted-foreground">Belum ada data.</p>
          ) : (
            <ul className="space-y-2">
              {distribution.map((d) => (
                <li key={d.level} className="flex items-center gap-3 text-sm">
                  <span className="w-14 shrink-0 text-muted-foreground">
                    Lv {d.level}
                  </span>
                  <div className="h-3 flex-1 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{ width: `${(d.count / maxCount) * 100}%` }}
                    />
                  </div>
                  <span className="w-8 shrink-0 text-right tabular-nums">
                    {d.count}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        Kurs terakhir diperbarui: {lastFetched}
      </p>
    </div>
  );
}
