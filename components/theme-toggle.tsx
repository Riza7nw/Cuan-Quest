"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const OPTIONS = [
  { v: "light", l: "Terang" },
  { v: "dark", l: "Gelap" },
  { v: "system", l: "Sistem" },
];

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  // theme is unknown until mounted (it resolves on the client), so defer the
  // active highlight to avoid a hydration mismatch.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const active = mounted ? theme ?? "system" : undefined;

  return (
    <div className="space-y-1.5">
      <Label>Tema</Label>
      <div className="flex gap-2">
        {OPTIONS.map((o) => (
          <button
            key={o.v}
            type="button"
            onClick={() => setTheme(o.v)}
            aria-pressed={active === o.v}
            className={cn(
              "flex-1 rounded-lg border px-3 py-1.5 text-sm transition",
              active === o.v
                ? "border-primary bg-primary text-primary-foreground"
                : "hover:bg-accent"
            )}
          >
            {o.l}
          </button>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        Perubahan tema langsung diterapkan.
      </p>
    </div>
  );
}
