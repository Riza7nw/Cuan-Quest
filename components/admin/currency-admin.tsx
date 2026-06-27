"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { setCurrencyActive, refreshRatesNow } from "@/lib/actions/admin";

type CurrencyRow = {
  code: string;
  name: string;
  symbol: string;
  is_active: boolean;
};

export function CurrencyAdmin({
  currencies,
  rates,
}: {
  currencies: CurrencyRow[];
  rates: Record<string, { rate: number; fetched_at: string }>;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  // Which currency row is mid-toggle, so only its switch shows as busy.
  const [busyCode, setBusyCode] = useState<string | null>(null);

  const lastFetched = Object.values(rates)
    .map((r) => r.fetched_at)
    .sort()
    .at(-1);

  function toggle(code: string, active: boolean) {
    setBusyCode(code);
    startTransition(async () => {
      const res = await setCurrencyActive(code, active);
      setBusyCode(null);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      router.refresh();
    });
  }

  function refresh() {
    startTransition(async () => {
      const res = await refreshRatesNow();
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(
        `Kurs diperbarui (${res.updated} mata uang${res.date ? `, ${res.date}` : ""}).`
      );
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base">Kurs (EUR sebagai pivot)</CardTitle>
          <Button
            size="sm"
            variant="outline"
            onClick={refresh}
            disabled={pending}
          >
            <RefreshCw className="size-4" /> Perbarui sekarang
          </Button>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground">
            Sumber: Frankfurter (data ECB). Cron harian memperbarui otomatis;
            tombol di atas memaksa sekarang.
            {lastFetched
              ? ` Terakhir: ${new Date(lastFetched).toLocaleString("id-ID", {
                  dateStyle: "medium",
                  timeStyle: "short",
                  // Pin the zone so SSR (UTC) and client (browser-local) agree —
                  // otherwise this client component hydration-mismatches.
                  timeZone: "Asia/Jakarta",
                })} WIB.`
              : ""}
          </p>
        </CardContent>
      </Card>

      <section>
        <h3 className="mb-2 text-sm font-semibold">Mata uang</h3>
        <ul className="divide-y rounded-xl border">
          {currencies.map((c) => {
            const rate = rates[c.code]?.rate;
            return (
              <li
                key={c.code}
                className="flex items-center justify-between gap-3 px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="font-medium">
                    {c.code}{" "}
                    <span className="text-muted-foreground">{c.symbol}</span>
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {c.name}
                    {rate !== undefined
                      ? ` · 1 EUR = ${rate.toLocaleString("id-ID", {
                          maximumFractionDigits: 4,
                        })} ${c.code}`
                      : c.code === "EUR"
                        ? " · pivot"
                        : " · kurs belum ada"}
                  </p>
                </div>
                <Switch
                  checked={c.is_active}
                  disabled={pending && busyCode === c.code}
                  onCheckedChange={(checked) => toggle(c.code, checked)}
                  aria-label={`Aktifkan ${c.code}`}
                />
              </li>
            );
          })}
        </ul>
        <p className="mt-2 text-xs text-muted-foreground">
          Menonaktifkan mata uang menyembunyikannya dari pemilih (onboarding,
          kantong baru, setelan). Data lama yang memakainya tetap aman.
        </p>
      </section>
    </div>
  );
}
