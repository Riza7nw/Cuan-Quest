"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, History, Plus, LineChart, Wallet } from "lucide-react";
import { cn } from "@/lib/utils";

type Item = { href: string; label: string; icon: typeof Home };

const ITEMS: Item[] = [
  { href: "/", label: "Beranda", icon: Home },
  { href: "/history", label: "Riwayat", icon: History },
  { href: "/insights", label: "Insight", icon: LineChart },
  { href: "/categories", label: "Kantong", icon: Wallet },
];

// Thumb-reachable primary navigation for mobile. The center "+" is a raised FAB
// to /add (the most-repeated action). Shown on all sizes — the app is narrow.
export function BottomNav() {
  const pathname = usePathname();
  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/90 backdrop-blur"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      aria-label="Navigasi utama"
    >
      <div className="mx-auto grid h-16 max-w-2xl grid-cols-5 items-center px-2">
        <NavItem item={ITEMS[0]} active={isActive(ITEMS[0].href)} />
        <NavItem item={ITEMS[1]} active={isActive(ITEMS[1].href)} />
        <div className="flex justify-center">
          <Link
            href="/add"
            aria-label="Catat tabungan"
            className="flex size-12 -translate-y-3 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg ring-4 ring-background transition active:scale-95"
          >
            <Plus className="size-6" />
          </Link>
        </div>
        <NavItem item={ITEMS[2]} active={isActive(ITEMS[2].href)} />
        <NavItem item={ITEMS[3]} active={isActive(ITEMS[3].href)} />
      </div>
    </nav>
  );
}

function NavItem({ item, active }: { item: Item; active: boolean }) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex flex-col items-center gap-0.5 py-2 text-[11px] transition",
        active
          ? "text-primary"
          : "text-muted-foreground hover:text-foreground"
      )}
    >
      <Icon className="size-5" />
      {item.label}
    </Link>
  );
}
