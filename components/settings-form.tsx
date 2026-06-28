"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { updateDisplayCurrency } from "@/lib/actions/profile";
import { ThemeToggle } from "@/components/theme-toggle";

type CurrencyOption = { code: string; name: string };

export function SettingsForm({
  baseCurrency,
  displayCurrency,
  currencies,
}: {
  baseCurrency: string;
  displayCurrency: string;
  currencies: CurrencyOption[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [display, setDisplay] = useState(displayCurrency);

  function save() {
    startTransition(async () => {
      const res = await updateDisplayCurrency({ display_currency: display });
      if (res.error) {
        toast.error(res.error);
        return;
      }
      toast.success("Tersimpan.");
      router.refresh();
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Mata uang & profil</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1.5">
          <Label>Mata uang dasar (untuk level)</Label>
          <p className="rounded-lg border bg-muted/40 px-3 py-2 text-sm">
            {baseCurrency}
          </p>
          <p className="text-xs text-muted-foreground">
            Ditetapkan saat onboarding dan tidak diubah di sini.
          </p>
        </div>

        <div className="space-y-1.5">
          <Label>Mata uang tampilan</Label>
          <Select value={display} onValueChange={(v) => setDisplay(v ?? displayCurrency)}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {currencies.map((c) => (
                <SelectItem key={c.code} value={c.code}>
                  {c.code} — {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Hanya mengubah tampilan total; perhitungan level tetap pakai mata
            uang dasar.
          </p>
        </div>

        <Button onClick={save} disabled={pending} className="w-full">
          Simpan
        </Button>

        <div className="border-t pt-4">
          <ThemeToggle />
        </div>
      </CardContent>
    </Card>
  );
}
