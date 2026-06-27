"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { completeOnboarding, type OnboardingState } from "@/lib/actions/profile";

type CurrencyOption = { code: string; name: string; symbol: string };

export function OnboardingForm({ currencies }: { currencies: CurrencyOption[] }) {
  const [state, formAction, pending] = useActionState<OnboardingState, FormData>(
    completeOnboarding,
    {}
  );
  const [currency, setCurrency] = useState("IDR");

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="text-2xl">Atur akunmu</CardTitle>
        <CardDescription>
          Pilih mata uang dasar untuk menghitung level. Kamu mulai dari level 1
          dengan total 0 — semua progres hanya naik.
        </CardDescription>
      </CardHeader>
      <form action={formAction}>
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <Label>Mata uang dasar</Label>
            <Select value={currency} onValueChange={(v) => setCurrency(v ?? "IDR")}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Pilih mata uang" />
              </SelectTrigger>
              <SelectContent>
                {currencies.map((c) => (
                  <SelectItem key={c.code} value={c.code}>
                    {c.code} — {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <input type="hidden" name="base_currency" value={currency} />
            <p className="text-xs text-muted-foreground">
              Disarankan IDR. Level dihitung dari total semua kantong (dikonversi
              ke mata uang ini).
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="first_pocket_name">Kantong pertama (opsional)</Label>
            <Input
              id="first_pocket_name"
              name="first_pocket_name"
              placeholder="mis. Dana Darurat"
              maxLength={60}
            />
            <p className="text-xs text-muted-foreground">
              Bisa ditambah/ubah nanti. Dibuat memakai mata uang dasar.
            </p>
          </div>
          {state.error && (
            <p className="text-sm text-destructive">{state.error}</p>
          )}
        </CardContent>
        <CardFooter>
          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? "Menyimpan…" : "Mulai quest"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
