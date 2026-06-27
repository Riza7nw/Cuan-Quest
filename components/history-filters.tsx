"use client";

import { useRouter } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

type Cat = { id: string; name: string };

const TYPES = [
  { v: "", l: "Semua" },
  { v: "deposit", l: "Setor" },
  { v: "withdraw", l: "Tarik" },
  { v: "transfer", l: "Pindah" },
];

export function HistoryFilters({
  categories,
  type,
  category,
}: {
  categories: Cat[];
  type: string;
  category: string;
}) {
  const router = useRouter();

  function go(next: { type?: string; category?: string }) {
    const t = next.type ?? type;
    const c = next.category ?? category;
    const params = new URLSearchParams();
    if (t) params.set("type", t);
    if (c) params.set("category", c);
    const qs = params.toString();
    router.push(qs ? `/history?${qs}` : "/history");
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {TYPES.map((t) => (
          <button
            key={t.v}
            type="button"
            onClick={() => go({ type: t.v })}
            className={cn(
              "rounded-full border px-3 py-1 text-sm transition",
              type === t.v
                ? "border-primary bg-primary text-primary-foreground"
                : "hover:bg-accent"
            )}
          >
            {t.l}
          </button>
        ))}
      </div>
      <Select
        value={category || "all"}
        onValueChange={(v) => go({ category: v === "all" ? "" : (v ?? "") })}
      >
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Semua kantong" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Semua kantong</SelectItem>
          {categories.map((c) => (
            <SelectItem key={c.id} value={c.id}>
              {c.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
