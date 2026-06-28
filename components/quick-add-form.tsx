"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { createEntry } from "@/lib/actions/entries";
import { LevelUpDialog } from "@/components/level-up-dialog";
import { CoinBurst } from "@/components/coin-burst";
import type { EntryType } from "@/lib/types";

type Pocket = { id: string; name: string; currency: string; icon: string | null };
const LAST_KEY = "cuanquest:lastCategory";

export function QuickAddForm({ pockets }: { pockets: Pocket[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [type, setType] = useState<EntryType>("deposit");
  const [amount, setAmount] = useState("");
  const [categoryId, setCategoryId] = useState(pockets[0]?.id ?? "");
  const [toCategoryId, setToCategoryId] = useState(pockets[1]?.id ?? "");
  const [showDate, setShowDate] = useState(false);
  const [occurredAt, setOccurredAt] = useState("");
  const [showNote, setShowNote] = useState(false);
  const [note, setNote] = useState("");
  const [levelUp, setLevelUp] = useState<{ level: number; title: string | null } | null>(
    null
  );
  // Bumped on each successful deposit to replay the coin-burst animation.
  const [burstKey, setBurstKey] = useState(0);

  // Remember the last-used pocket.
  useEffect(() => {
    const last = localStorage.getItem(LAST_KEY);
    if (last && pockets.some((p) => p.id === last)) setCategoryId(last);
  }, [pockets]);

  // Keep the transfer destination distinct from the source.
  useEffect(() => {
    if (toCategoryId === categoryId) {
      const other = pockets.find((p) => p.id !== categoryId);
      setToCategoryId(other?.id ?? "");
    }
  }, [categoryId, toCategoryId, pockets]);

  const source = pockets.find((p) => p.id === categoryId);

  function submit() {
    const amt = Number(amount.replace(",", ".").replace(/[^0-9.]/g, ""));
    if (!categoryId || !(amt > 0)) {
      toast.error("Isi jumlah dan pilih kantong dulu.");
      return;
    }
    if (type === "transfer" && (!toCategoryId || toCategoryId === categoryId)) {
      toast.error("Pilih kantong tujuan yang berbeda.");
      return;
    }

    // Optimistic: clear the inputs immediately so the next entry can be typed
    // without waiting for the server. Snapshot to roll back if the save fails.
    const amountSnapshot = amount;
    const noteSnapshot = note;
    const isDeposit = type === "deposit";
    setAmount("");
    setNote("");
    localStorage.setItem(LAST_KEY, categoryId);

    startTransition(async () => {
      const res = await createEntry({
        type,
        category_id: categoryId,
        amount: amt,
        to_category_id: type === "transfer" ? toCategoryId : null,
        note: noteSnapshot.trim() ? noteSnapshot.trim() : null,
        occurred_at: showDate && occurredAt ? new Date(occurredAt) : undefined,
      });
      if (!res.ok) {
        setAmount(amountSnapshot);
        setNote(noteSnapshot);
        toast.error(res.error);
        return;
      }
      // Celebrate every deposit (the core XP-gaining action), not just level-ups.
      if (isDeposit) setBurstKey((k) => k + 1);
      if (res.leveledUp) {
        setLevelUp({ level: res.newLevel, title: res.newTitle });
      } else if (res.newRecord) {
        toast.success("🏆 Rekor baru! Tabunganmu di titik tertinggi.");
      } else {
        toast.success("Tersimpan! 💰");
      }
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      <Tabs value={type} onValueChange={(v) => setType((v ?? "deposit") as EntryType)}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="deposit">Setor</TabsTrigger>
          <TabsTrigger value="withdraw">Tarik</TabsTrigger>
          <TabsTrigger value="transfer">Pindah</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="text-center">
        <Label htmlFor="amount" className="text-xs text-muted-foreground">
          Jumlah ({source?.currency ?? "—"})
        </Label>
        <Input
          id="amount"
          inputMode="decimal"
          autoFocus
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              submit();
            }
          }}
          placeholder="0"
          className="mt-1 h-16 text-center text-3xl font-bold"
        />
      </div>

      <PocketChips
        label={type === "transfer" ? "Dari kantong" : "Kantong"}
        pockets={pockets}
        value={categoryId}
        onChange={setCategoryId}
      />
      {type === "transfer" && (
        <PocketChips
          label="Ke kantong"
          pockets={pockets.filter((p) => p.id !== categoryId)}
          value={toCategoryId}
          onChange={setToCategoryId}
        />
      )}

      <div>
        {!showDate ? (
          <button
            type="button"
            onClick={() => setShowDate(true)}
            className="text-xs text-muted-foreground underline underline-offset-2"
          >
            Ubah tanggal (default: sekarang)
          </button>
        ) : (
          <Input
            type="datetime-local"
            value={occurredAt}
            onChange={(e) => setOccurredAt(e.target.value)}
          />
        )}
      </div>

      <div>
        {!showNote ? (
          <button
            type="button"
            onClick={() => setShowNote(true)}
            className="text-xs text-muted-foreground underline underline-offset-2"
          >
            Tambah catatan
          </button>
        ) : (
          <Input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={280}
            placeholder="Catatan (opsional)"
            autoFocus
          />
        )}
      </div>

      <Button className="h-12 w-full text-base" disabled={pending} onClick={submit}>
        {pending
          ? "Menyimpan…"
          : type === "deposit"
            ? "Setor"
            : type === "withdraw"
              ? "Tarik"
              : "Pindahkan"}
      </Button>

      <LevelUpDialog
        open={!!levelUp}
        onOpenChange={(o) => !o && setLevelUp(null)}
        level={levelUp?.level ?? 0}
        title={levelUp?.title ?? null}
      />

      {burstKey > 0 && <CoinBurst key={burstKey} />}
    </div>
  );
}

function PocketChips({
  label,
  pockets,
  value,
  onChange,
}: {
  label: string;
  pockets: Pocket[];
  value: string;
  onChange: (id: string) => void;
}) {
  return (
    <div className="space-y-2">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <div className="flex flex-wrap gap-2">
        {pockets.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => onChange(p.id)}
            aria-pressed={value === p.id}
            className={cn(
              "rounded-full border px-3 py-1.5 text-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              value === p.id
                ? "border-primary bg-primary text-primary-foreground"
                : "bg-background hover:bg-accent"
            )}
          >
            {p.icon ? `${p.icon} ` : ""}
            {p.name} <span className="opacity-60">{p.currency}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
